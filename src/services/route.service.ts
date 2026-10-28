import { search, bestMatch, candidates } from './geocode.service';

// Route planning: geocode every address, ask OSRM for real driving distances
// between all of them, share the stops out between vehicles within their
// weight and volume limits, then order each vehicle's stops (nearest neighbour,
// improved with 2-opt).

// two public OSRM servers; the second is tried when the first is down
const OSRM_SERVERS = (process.env.OSRM_URL || 'https://router.project-osrm.org,https://routing.openstreetmap.de/routed-car')
  .split(',').map(s => s.trim());

export interface RouteInput {
  country: string;
  city?: string;
  optimization_objective?: 'distance' | 'time';
  depot: { address: string };
  stops: { address: string; demand_weight?: number; demand_volume?: number; service_time?: number }[];
  vehicles: { id: string; capacity_weight?: number; capacity_volume?: number }[];
}

interface Point { address: string; lat: number; lng: number; rough: boolean }

// matches this vague put the pin somewhere in the district or city, not at the door
const ROUGH = new Set(['city', 'town', 'village', 'municipality', 'county', 'state', 'city_district', 'suburb', 'neighbourhood', 'quarter']);

export class RouteInputError extends Error {}

async function locate(address: string, country: string, city?: string, near?: { lat: number; lng: number }): Promise<Point> {
  // "Al Rawdah" exists in many towns: name the city, and stay within reach of it.
  const text = address.replace(/[،؛]/g, ',');
  const q = city && !text.toLowerCase().includes(city.toLowerCase()) ? `${text}, ${city}` : text;
  let place = null;
  for (const strict of [true, false])
    for (const c of candidates(q)) {
      if (place) break;
      place = await bestMatch(c, country, near, strict);
    }
  if (!place) throw new RouteInputError(`Could not find "${address}" on the map.`);
  return { address, lat: place.lat, lng: place.lng, rough: ROUGH.has(place.type) };
}

/** Driving distance (m) and duration (s) between every pair of points */
async function matrix(points: Point[]) {
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
  type Table = { code: string; distances: (number | null)[][]; durations: (number | null)[][] };
  let body: Table | null = null, lastErr: unknown;
  for (const server of OSRM_SERVERS) {
    try {
      const res = await fetch(`${server}/table/v1/driving/${coords}?annotations=distance,duration`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`Routing service responded ${res.status}`);
      body = await res.json() as Table;
      if (body.code !== 'Ok') throw new Error(`Routing service: ${body.code}`);
      break;
    } catch (err) { lastErr = err; body = null; }
  }
  if (!body) throw lastErr;
  // unreachable pairs come back as null; make them very expensive instead
  const fix = (m: (number | null)[][]) => m.map(row => row.map(v => (v == null ? 1e9 : v)));
  return { dist: fix(body.distances), dur: fix(body.durations) };
}

/** Order stop indexes (into the matrix) for one vehicle, starting and ending at index 0 */
function orderStops(ids: number[], cost: number[][]): number[] {
  const left = ids.slice(), out: number[] = [];
  let cur = 0;
  while (left.length) {
    let best = 0;
    left.forEach((id, i) => { if (cost[cur][id] < cost[cur][left[best]]) best = i; });
    cur = left.splice(best, 1)[0];
    out.push(cur);
  }
  const tour = (o: number[]) => [0, ...o, 0].reduce((s, id, i, a) => (i ? s + cost[a[i - 1]][id] : 0), 0);
  for (let improved = true; improved;) {
    improved = false;
    for (let i = 0; i < out.length - 1; i++)
      for (let j = i + 1; j < out.length; j++) {
        const cand = [...out.slice(0, i), ...out.slice(i, j + 1).reverse(), ...out.slice(j + 1)];
        if (tour(cand) + 1e-6 < tour(out)) { out.splice(0, out.length, ...cand); improved = true; }
      }
  }
  return out;
}

export async function optimize(input: RouteInput) {
  const started = Date.now();
  if (!input.stops.length) throw new RouteInputError('Add at least one stop.');
  if (input.stops.length > 40) throw new RouteInputError('Up to 40 stops per request.');
  if (!input.vehicles.length) throw new RouteInputError('Add at least one vehicle.');

  // geocoding is one request per second (OpenStreetMap's rule), so this is the slow part
  const cityPlace = input.city ? await search(input.city, input.country) : null;
  const near = cityPlace ? { lat: cityPlace.lat, lng: cityPlace.lng } : undefined;
  const depot = await locate(input.depot.address, input.country, input.city, near);
  const stops: Point[] = [];
  for (const s of input.stops) stops.push(await locate(s.address, input.country, input.city, near));

  const points = [depot, ...stops];
  const { dist, dur } = await matrix(points);
  const cost = input.optimization_objective === 'time' ? dur : dist;

  // share stops between vehicles: sweep around the depot by angle, so each van
  // gets one part of the city, and move on when its weight or volume is full
  const angle = (p: Point) => Math.atan2(p.lat - depot.lat, p.lng - depot.lng);
  const sweep = stops.map((p, i) => i + 1).sort((a, b) => angle(points[a]) - angle(points[b]));
  const demand = (id: number) => input.stops[id - 1];

  const vehicles = input.vehicles.map(v => ({
    id: v.id,
    capW: v.capacity_weight ?? 1000,
    capV: v.capacity_volume ?? 50,
    ids: [] as number[],
    w: 0, v: 0,
  }));
  const unassigned: number[] = [];
  let vi = 0;
  for (const id of sweep) {
    const w = demand(id).demand_weight ?? 0, v = demand(id).demand_volume ?? 0;
    // try the current van first, then any other van with room left
    const order = [...vehicles.slice(vi), ...vehicles.slice(0, vi)];
    const van = order.find(x => x.w + w <= x.capW && x.v + v <= x.capV);
    if (!van) { unassigned.push(id); continue; }
    van.ids.push(id); van.w += w; van.v += v;
    vi = vehicles.indexOf(van);
    // spread the work: move to the next van once this one has its fair share
    if (van.ids.length >= Math.ceil(stops.length / vehicles.length)) vi = (vi + 1) % vehicles.length;
  }

  let totalM = 0, totalMin = 0;
  const routes = vehicles.filter(v => v.ids.length).map(v => {
    const seq = orderStops(v.ids, cost);
    let clock = 0, meters = 0, prev = 0;
    const routeStops = seq.map((id, i) => {
      const s = demand(id);
      const legM = dist[prev][id], legMin = dur[prev][id] / 60;
      meters += legM; clock += legMin;
      const arrival = clock;
      clock += s.service_time ?? 0;
      prev = id;
      return {
        sequence: i + 1,
        address: points[id].address,
        lat: points[id].lat,
        lng: points[id].lng,
        arrival_time_minutes: Math.round(arrival),
        demand_weight: s.demand_weight ?? 0,
        demand_volume: s.demand_volume ?? 0,
        service_time_minutes: s.service_time ?? 0,
        leg_distance: Math.round(legM),
        leg_time: Math.round(legMin),
      };
    });
    meters += dist[prev][0]; clock += dur[prev][0] / 60;
    totalM += meters; totalMin += clock;
    const loc = { address: depot.address, lat: depot.lat, lng: depot.lng };
    return {
      vehicle_id: v.id,
      vehicle_info: { id: v.id, capacity_weight: v.capW, capacity_volume: v.capV, start_location: loc, end_location: loc },
      stops: routeStops,
      distance_meters: Math.round(meters),
      time_minutes: Math.round(clock),
      method: 'nearest-neighbour + 2-opt',
      load_weight: v.w,
      load_volume: v.v,
      capacity_weight: v.capW,
      capacity_volume: v.capV,
      utilization_weight: Math.round((v.w / v.capW) * 1000) / 10,
      utilization_volume: Math.round((v.v / v.capV) * 1000) / 10,
    };
  });

  return {
    success: true,
    routes,
    total_distance_km: Math.round(totalM / 100) / 10,
    total_time_minutes: Math.round(totalMin),
    num_vehicles_used: routes.length,
    num_stops_assigned: stops.length - unassigned.length,
    optimization_objective: input.optimization_objective ?? 'distance',
    processing_time_ms: Date.now() - started,
    optimization_method: 'sweep + nearest-neighbour + 2-opt (OSRM road distances)',
    error: [
      unassigned.length && `${unassigned.length} stop(s) did not fit any vehicle's capacity: ${unassigned.map(id => points[id].address).join('; ')}`,
      points.some(p => p.rough) && `Only found the area, not the exact spot, for: ${points.filter(p => p.rough).map(p => p.address).join('; ')}. Add a street or landmark for a better route.`,
    ].filter(Boolean).join(' ') || null,
  };
}
