export interface NormalizeRequest {
  address:           string;
  country:           string;
  use_ai:            boolean;
  include_geocoding: boolean;
  use_cache:         boolean;
}

export interface NormalizeResponse {
  success:           boolean;
  original_address:  string;
  normalized_address: string;
  normalized_english: string;
  components: {
    building_number: string | null;
    street_name:     string | null;
    street_name_ar:  string | null;
    area:            string | null;
    area_ar:         string | null;
    city:            string | null;
    city_ar:         string | null;
    landmarks:       string[];
    postal_code:     string | null;
  };
  confidence_score:    number;
  processing_time_ms:  number;
  from_cache:          boolean;
  from_learning:       boolean;
  ai_enhanced:         boolean;
  provider:            string;
  geocoding: {
    latitude:  number;
    longitude: number;
    accuracy:  string;
    provider:  string;
  } | null;
  error: string | null;
}

export interface Usage {
  id:                     string;
  userId:                 string;
  addressNormalizerCount: number;
  addressNormalizerLimit: number;
  routeOptimizerCount:    number;
  routeOptimizerLimit:    number;
  lastResetAt:            string;
  updatedAt:              string;
}

export interface User {
  id:          string;
  email:       string;
  fullName:    string;
  username:    string;
  companyName: string;
  country:     string | null;
  role:        string;
  name:        string; // compat alias for fullName
  usage:       Usage | null;
  createdAt?:  string; // ISO date string returned by /auth/me
}

// ── Route Optimizer types ─────────────────────────────────────────────────────

/** Request body accepted by POST /optimize-route */
export interface RouteOptimizerRequest {
  country:                string;
  city:                   string;
  optimization_objective: 'distance' | 'time';
  depot: {
    address: string;
  };
  stops: {
    address:        string;
    demand_weight?: number;
    demand_volume?: number;
    service_time?:  number;
  }[];
  vehicles: {
    id:               string;
    capacity_weight?: number;
    capacity_volume?: number;
  }[];
}

/** Legacy aliases kept for internal use */
export interface Stop {
  address:        string;
  latitude:       number;
  longitude:      number;
  demand_weight?: number;
  demand_volume?: number;
  service_time?:  number;
}

export interface Vehicle {
  vehicle_id:       string;
  capacity_weight?: number;
  capacity_volume?: number;
}

export interface RouteStop {
  sequence:              number;
  address:               string;
  lat:                   number;
  lng:                   number;
  arrival_time_minutes:  number;
  demand_weight:         number;
  demand_volume:         number;
  service_time_minutes:  number;
  leg_distance?:         number;
  leg_time?:             number;
}

export interface VehicleRoute {
  vehicle_id:         string;
  vehicle_info?: {
    id:               string;
    capacity_weight:  number;
    capacity_volume:  number;
    start_location:   { address: string; lat: number; lng: number };
    end_location:     { address: string; lat: number; lng: number };
  };
  stops:              RouteStop[];
  distance_meters:    number;
  time_minutes:       number;
  method:             string;
  load_weight:        number;
  load_volume:        number;
  capacity_weight:    number;
  capacity_volume:    number;
  utilization_weight: number;
  utilization_volume: number;
}

export interface RouteOptimizerResponse {
  success:               boolean;
  routes:                VehicleRoute[];
  total_distance_km:     number;
  total_time_minutes:    number;
  num_vehicles_used:     number;
  num_stops_assigned:    number;
  optimization_objective?: string;
  processing_time_ms?:   number;
  optimization_method?:  string;
  clusters_created?:     number;
  api_cost_estimate?: {
    clustering_cost_usd: number;
    full_matrix_cost_usd: number;
    actual_cost_usd:      number;
    savings_usd:          number;
    savings_percent:      number;
    google_api_calls:     number;
    method:               string;
  };
  cluster_details?: unknown;
  error?:           string | null;
}
