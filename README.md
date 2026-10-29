# Wayn · وين

Delivery addresses in the Gulf often arrive as messages like "behind the big mosque, villa with the green gate". Wayn turns those messages into a point on the map, then splits the day's orders between vans and puts each van's stops in a short driving order.

**Live:** https://wayn-app.vercel.app (English and Arabic)

## What it does

- **Cleans addresses.** It takes Arabic or English text, finds the street, landmark or district, and gives back a clean address and a map pin. It also says how precise the pin is (street, landmark, district or city only), so a vague address is flagged instead of guessed.
- **Plans routes.** It splits orders between vans by area and by weight and volume limits, then orders each van's stops to cut driving distance. It uses a sweep split, then nearest-neighbour, then 2-opt. It finds a short order, not a guaranteed shortest one.
- **Runs the day.** The dispatch dashboard shows orders, runs and vans on a live map. Each driver gets a link to a phone page that lists their stops with the customer's own words beside the clean address.

The hero on the landing page replays one real Riyadh day: 12 messages, each run through the engine. Wayn placed 11 of them; a plain map search placed none at street level. The two-van plan is 54 km shorter than driving the orders in the order they came in. Every distance comes from OSRM road routes, depot and back.

## How it's built

```
frontend/   React 19 + TypeScript + Vite, React Router, Leaflet maps, Tailwind
backend/    Node + Express 5 + TypeScript, Prisma + PostgreSQL, JWT auth, Resend email
```

The address engine and route planner live in the API (`backend/src/services/`) and use only free, open services:

- **Nominatim** (OpenStreetMap search) to find streets and landmarks. Requests are rate-limited to 1 per second and cached.
- **A saved list of OSM districts** for 12 Gulf cities (`backend/src/data/districts.json`, built by `backend/scripts/build-districts.ts`), so district names match even with different spellings, such as Malqa / Malga / الملقا.
- **OSRM** for real road distances and drive times between stops.

OpenStreetMap's Arabic coverage is patchy, so results are good but not perfect. Every pin comes with its precision level.

## Run it locally

You need Node 20+ and a PostgreSQL database.

**API**

```bash
cd backend
cp .env.example .env    # then fill in DATABASE_URL and the two secrets
npm install
npx prisma db push
npm run dev             # http://localhost:3001
```

**Web app**

```bash
cd frontend
npm install
echo "VITE_BACKEND_API=http://localhost:3001/api" > .env
npm run dev
```

## Deploy

- `frontend/` deploys to Vercel. Set the project's Root Directory to `frontend`.
- `backend/` deploys to Render. Set Root Directory to `backend`, build with `npm install && npm run build`, start with `npm start`.

## Credits

Map data © OpenStreetMap contributors. Map tiles © Esri. Routing by OSRM.
