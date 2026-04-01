# Wayn — AI-Powered Logistics Intelligence Platform

A full-stack logistics SaaS application built for the Middle East market. Wayn provides AI-driven address normalization and route optimization for courier and delivery companies, with a bilingual Arabic/English interface.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
  - [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Features](#features)
  - [Landing Page](#landing-page)
  - [Authentication](#authentication)
  - [Dashboard](#dashboard)
  - [Address Normalizer](#address-normalizer)
  - [Route Optimizer](#route-optimizer)
- [Wayn Optimization Impact — How It's Calculated](#wayn-optimization-impact--how-its-calculated)
- [API Reference](#api-reference)
  - [Auth Endpoints](#auth-endpoints)
  - [Usage Endpoints](#usage-endpoints)
- [Frontend Architecture](#frontend-architecture)
  - [Routing](#routing)
  - [Auth Context](#auth-context)
  - [Design System](#design-system)
  - [Internationalization](#internationalization)
- [Database Schema](#database-schema)
- [Scripts](#scripts)

---

## Overview

Wayn is a logistics intelligence platform designed for Middle East delivery operations. It offers:

- **Address Normalization** — Convert any Arabic or informal address into structured, geocoded data with AI enhancement
- **Route Optimization** — Plan the most efficient delivery sequences across a fleet using constraint-based OR-Tools optimization
- **Usage Tracking** — Per-user API quota management with real-time counters
- **Bilingual UI** — Full Arabic (RTL) and English (LTR) support with live language switching

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 8 | Build tool & dev server |
| React Router | 7 | Client-side routing |
| Framer Motion | 12 | Animations & transitions |
| Tailwind CSS | 3.4 | Utility styling |
| React Leaflet | 5 | Interactive maps |
| Recharts | 3 | Dashboard charts |
| React Hook Form | 7 | Form state management |
| @iconify/react | 6 | Solar icon set |
| Axios | 1.14 | HTTP client |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | 5 | REST API server |
| TypeScript | 6 | Type safety |
| Prisma ORM | 7 | Database access layer |
| PostgreSQL | — | Primary database |
| jsonwebtoken | 9 | JWT auth tokens (7-day expiry) |
| bcryptjs | 3 | Password hashing (12 rounds) |
| Nodemailer | 8 | Transactional OTP emails |
| Zod | 4 | Request validation |
| Helmet | 8 | HTTP security headers |
| express-rate-limit | 8 | Rate limiting |

### External APIs
| Service | Purpose |
|---|---|
| Wayn AI API (`<engine-host>`) | Address normalization + route optimization |
| OSRM (`router.project-osrm.org`) | Real road routing geometry for maps |
| CartoDB Dark Matter tiles | Dark map tiles for Leaflet |

---

## Project Structure

```
frontend/
├── src/                          # Frontend (React + TypeScript)
│   ├── App.tsx                   # Root router
│   ├── index.css                 # Global styles, keyframes, Leaflet overrides
│   ├── main.tsx                  # Entry point
│   │
│   ├── assets/                   # Static assets
│   │
│   ├── components/
│   │   ├── landing/              # Landing page sections
│   │   │   ├── CtaFooter.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── HeroSection.tsx   # Leaflet map + 7-scene animation loop
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── LandingNavbar.tsx # Animated mobile hamburger menu
│   │   │   └── StatsBar.tsx
│   │   │
│   │   ├── layout/               # App shell components
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── Sidebar.tsx       # Collapsible sidebar with usage bars
│   │   │
│   │   └── ui/                   # Reusable design system components
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── EmptyState.tsx
│   │       ├── GlassCard.tsx     # Glassmorphism container
│   │       ├── GoldButton.tsx    # Primary CTA button
│   │       ├── Input.tsx
│   │       ├── LoadingOverlay.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── OutlineButton.tsx # Secondary button
│   │       ├── SectionHeader.tsx # Gold-accented section titles
│   │       ├── StatCard.tsx      # Count-up animated stat card
│   │       ├── Toast.tsx         # Toast notifications + ToastProvider
│   │       └── UsageBadge.tsx    # API usage indicator
│   │
│   ├── config/
│   │   └── api.ts                # API base URLs (external + backend)
│   │
│   ├── context/
│   │   └── AuthContext.tsx       # JWT auth state (token + user)
│   │
│   ├── contexts/
│   │   └── LanguageContext.tsx   # i18n context (en/ar, RTL flag, t())
│   │
│   ├── hooks/
│   │   ├── useAuth.ts            # Consume AuthContext
│   │   ├── useBreakpoint.ts      # Responsive breakpoint detector
│   │   └── useUsage.ts           # API usage fetching + increment
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx       # Public marketing page
│   │   ├── LoginPage.tsx         # JWT login form
│   │   ├── OTPVerifyPage.tsx     # 6-box OTP verification
│   │   ├── SignupPage.tsx        # Registration form
│   │   └── dashboard/
│   │       ├── AddressNormalizerPage.tsx  # Address normalization tool
│   │       ├── DashboardHomePage.tsx      # Stats, charts, activity
│   │       ├── DashboardLayout.tsx        # Layout shell + top bar
│   │       ├── Page2.tsx                  # (placeholder)
│   │       ├── Page3.tsx                  # (placeholder)
│   │       └── RouteOptimizerPage.tsx     # Two-panel route optimizer
│   │
│   ├── services/
│   │   └── api.ts                # Axios clients (external API + backend)
│   │
│   ├── styles/
│   │   └── theme.ts              # Color constants, glassmorphism, variants
│   │
│   ├── translations/
│   │   └── index.ts              # EN + AR string dictionary
│   │
│   └── types/
│       └── index.ts              # Shared TypeScript types
│
├── backend/                      # Backend (Node.js + Express + Prisma)
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   │
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts    # signup, verifyOTP, login, resendOTP, me
│   │   │   └── usage.controller.ts   # getUsage, incrementUsage
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts    # JWT requireAuth middleware
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   └── usage.routes.ts
│   │   │
│   │   ├── services/
│   │   │   ├── email.service.ts      # Nodemailer HTML OTP emails
│   │   │   └── otp.service.ts        # OTP generation, save, validate
│   │   │
│   │   ├── utils/
│   │   │   ├── jwt.utils.ts          # signToken / verifyToken
│   │   │   └── response.utils.ts     # sendSuccess / sendError helpers
│   │   │
│   │   ├── app.ts                    # Express app + middleware setup
│   │   └── server.ts                 # HTTP server entry point
│   │
│   ├── .env                      # Environment variables (not committed)
│   ├── package.json
│   └── tsconfig.json
│
├── public/
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- **PostgreSQL** v14 or later (local install or cloud — e.g. Neon, Supabase, Railway)
- A Gmail account (or any SMTP provider) for OTP emails

---

### Frontend Setup

```bash
# From the project root
npm install

# Start development server
npm run dev
# → http://localhost:5173
```

---

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
# Edit backend/.env with your values (see Environment Variables section)

# Generate Prisma client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Start development server
npm run dev
# → http://localhost:3001
```

---

### Database Setup

The backend uses **Prisma** with PostgreSQL. Three steps:

```bash
# 1. Set DATABASE_URL in backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/wayn_db

# 2. Push the schema (creates all tables)
cd backend && npm run db:push

# 3. Optional: open Prisma Studio to browse data
npm run db:studio
```

For production, use migrations instead of `db push`:

```bash
npm run db:migrate
```

---

## Environment Variables

Create `backend/.env` with the following:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/wayn_db

# Auth
JWT_SECRET=your_super_secret_jwt_key_here_change_this

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password   # Use an App Password, not your login password
FROM_EMAIL=noreply@example.com

# CORS + Server
CLIENT_URL=http://localhost:5173
PORT=3001
```

> **Gmail setup:** Go to Google Account → Security → 2-Step Verification → App passwords. Generate a password for "Mail" and use it as `SMTP_PASS`.

The frontend API URLs are configured in `src/config/api.ts`:

```typescript
export const EXTERNAL_API = {
  BASE: 'https://<engine-host>/api/v1',
  KEY:  '<your-api-key>',
};
export const BACKEND_API = 'http://localhost:3001/api';
```

---

## Features

### Landing Page

A fully animated marketing page at `/`:

- **Hero Section** — Full-screen live Leaflet map (Dubai, CartoDB Dark Matter tiles) with a 7-scene animation loop showing real road routes via OSRM, floating glassmorphism panels, and count-up stats
- **How It Works** — 3-step horizontal flow with animated cards
- **Platform Features** — 3×2 grid of feature cards
- **Stats Bar** — Full-width count-up statistics
- **CTA + Footer** — Call to action with minimal footer
- **Bilingual** — Live EN/AR toggle with full RTL layout (Cairo font, mirrored positioning)
- **Responsive** — Mobile hamburger navbar, responsive grids

### Authentication

**Signup** (`/signup`):
- 2-column form: full name, username, company, email, phone, country, password (×2)
- Real-time password strength indicator (4-level bar)
- Calls `POST /api/auth/signup` → redirects to OTP verification

**OTP Verification** (`/verify-otp?userId=...&email=...`):
- 6 individual digit boxes with auto-advance, paste support, auto-submit
- 2-minute countdown timer with resend button
- Loading overlay while verifying, shake animation on wrong code

**Login** (`/login`):
- Email + password with show/hide toggle
- Handles unverified accounts (redirects to OTP page)

JWT tokens are stored in `localStorage` and validated on every app load via `GET /api/auth/me`.

### Dashboard

**Home** (`/dashboard`):
- Welcome banner with greeting + quick action buttons
- 4 animated stat cards with circular progress rings (count-up on mount)
- Area line chart — 7-day API usage per service (Recharts)
- Donut pie chart — usage breakdown
- Recent activity table with hover highlighting
- Quick-start cards navigating to each tool
- Conditional amber warning banner at ≥80% usage

**Sidebar** (collapsible, 260px → 72px):
- Gold Wayn logo
- Nav links: Dashboard, Address Normalizer, Route Optimizer
- Usage progress bars (green → amber → red thresholds)
- User info + company name
- Sign out button

**Top bar**:
- Page title + subtitle
- Notification bell
- User avatar dropdown (Profile, Settings, Sign Out)

### Address Normalizer

(`/dashboard/address-normalizer`)

- Textarea input with `dir="auto"` for Arabic/English detection
- Country selector with flag icons (11 countries)
- Toggle switches: AI Enhancement, Include Geocoding, Use Cache
- Submits to external Wayn AI API
- Results panel:
  - Animated confidence ring (0→score, color-coded)
  - AI Enhanced / From Cache / Provider badges
  - Original + Normalized Arabic + Normalized English fields (copy-to-clipboard)
  - Address components grid (building no., street, area, city in EN+AR, postal code)
  - Landmark gold pill tags
  - Leaflet map with 4 tile styles: Street / Satellite / Hybrid / Dark
- Usage increment via `POST /api/usage/increment` on each successful call

### Route Optimizer

(`/dashboard/route-optimizer`)

**Left Panel — Input Form:**
- Depot section (address + lat/lng)
- Dynamic stops with `useFieldArray` — add/remove, address + coordinates + demand weight/volume + service time
- Dynamic vehicles — add/remove, capacity weight/volume
- Settings: country, city, optimization objective (Balanced / Minimize Distance / Minimize Time)
- Fake progress bar (0–90% over 30s) during optimization
- Cycling loading messages ("Geocoding addresses…", "Building distance matrix…", etc.)

**Right Panel — Results (4 tabs):**

| Tab | Content |
|---|---|
| **Summary** | 4 KPI cards (distance, time, stops, vehicles), vehicle capacity bars, cost savings card |
| **Map View** | Dark CartoDB map, OSRM road routing with glow polyline, numbered stop markers, depot icon, fit-to-bounds, bidirectional hover sync |
| **Stop Sequence** | Timeline view (vertical spine + numbered nodes) or Table view — both with hover highlighting synced to map |
| **Analytics** | Arrival time bar chart, demand grouped bar chart, capacity utilization bars, summary stat grid |

---

## Wayn Optimization Impact — How It's Calculated

The **Wayn Optimization Impact** card in the Summary tab shows how much distance and time the optimizer saved compared to visiting the same stops in the order the user entered them (the "naive" approach). Here is exactly how each number is produced.

---

### Step 1 — Sequential Baseline (before the API call)

When the user submits the form, the frontend immediately computes a **sequential road-distance estimate** using the stops in their original input order.

```
Route: Depot → Stop 1 → Stop 2 → … → Stop N → Depot
```

Each leg uses the **Haversine formula** (great-circle distance between two GPS coordinates):

```
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlng/2)
haversineKm = 6371 × 2 · atan2(√a, √(1−a))
```

All legs are summed, then multiplied by a **road factor of 1.35** — a conservative urban average for the Middle East that converts straight-line distance into estimated road distance:

```
sequentialBaseline = (Σ haversineKm for each leg) × 1.35
```

> Source: `sequentialRoadDistKm()` in `RouteOptimizerPage.tsx`.  
> The 1.35 factor is a well-known heuristic used in last-mile logistics research for urban road networks.

This baseline is saved in a `useRef` before the optimize API is called, so it is never influenced by the optimized result.

---

### Step 2 — Optimized Distance (from the API response)

The backend optimizer returns `total_distance_km` — the actual road distance the optimizer found for all vehicles combined. This is computed server-side using real road data (distance matrix), not a Haversine estimate.

---

### Step 3 — Savings Calculation

```
savedKm  = sequentialBaseline − total_distance_km
savedPct = (savedKm / sequentialBaseline) × 100
```

A baseline is only shown when `sequentialBaseline > total_distance_km` (i.e. the optimizer genuinely improved on the naive order). If the optimizer result is equal to or worse than naive (e.g. only 1 stop), the card shows `—` instead of a misleading number.

---

### Step 4 — Time Saved

There is no separate time baseline computed. Instead, time saved is estimated **proportionally**:

```
savedMin = total_time_minutes × (savedPct / 100)
```

This assumes that the same average speed applies to both routes, so a 20% shorter route takes roughly 20% less time. This is a simplification — real-world variation in traffic and service times are not modelled.

---

### Step 5 — Average per Stop

```
avgKmPerStop  = total_distance_km / num_stops_assigned
avgMinPerStop = total_time_minutes / num_stops_assigned
```

These are not compared to a baseline; they just describe the optimizer's efficiency per delivery.

---

### Summary Table

| Metric | Formula | Source |
|---|---|---|
| Sequential baseline (km) | `Σ haversineKm(each leg) × 1.35` | Frontend, computed from input stops in input order |
| Optimized distance (km) | `total_distance_km` from API | Backend optimizer (road distance matrix) |
| Distance saved (km) | `baseline − optimized` | Frontend |
| Distance saved (%) | `(saved / baseline) × 100` | Frontend |
| Time saved | `total_time_minutes × savedPct / 100` | Frontend (proportional estimate) |
| Avg km per stop | `total_distance_km / num_stops_assigned` | Frontend |
| Avg min per stop | `total_time_minutes / num_stops_assigned` | Frontend |

---

### Limitations

- The **1.35 road factor** is a fixed average. Actual urban detour ratios vary (highways → lower, dense city centres → higher). For very rural or highway-heavy routes the saved percentage may be slightly over- or under-stated.
- **Time saved** is a proportional estimate. It does not account for traffic, service time at individual stops, or vehicle breaks.
- The baseline always uses the **user's input order**. A truly random worst-case baseline would show even larger savings; using input order is the honest conservative comparison.

---

## API Reference

Base URL: `http://localhost:3001/api`

All protected routes require: `Authorization: Bearer <token>`

### Auth Endpoints

#### `POST /auth/signup`

Create a new user account and send an OTP verification email.

**Request body:**
```json
{
  "email": "user@company.com",
  "username": "johnsmith",
  "companyName": "Acme Logistics LLC",
  "fullName": "John Smith",
  "password": "SecurePass123!",
  "phone": "+971501234567",
  "country": "AE"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "userId": "clxxxxxxx",
    "message": "Account created. Check your email for the OTP."
  }
}
```

---

#### `POST /auth/verify-otp`

Verify the 6-digit OTP and activate the account.

**Request body:**
```json
{ "userId": "clxxxxxxx", "otp": "482931" }
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { "id": "...", "email": "...", "fullName": "...", "usage": { ... } }
  }
}
```

---

#### `POST /auth/login`

Authenticate an existing verified user.

**Request body:**
```json
{ "email": "user@company.com", "password": "SecurePass123!" }
```

**Response `200`:** Same structure as `verify-otp`.

**Response `403` (unverified):**
```json
{
  "success": false,
  "message": "Please verify your email first",
  "needsVerification": true,
  "userId": "clxxxxxxx"
}
```

---

#### `POST /auth/resend-otp`

Invalidate old OTPs and send a fresh code.

**Request body:**
```json
{ "userId": "clxxxxxxx" }
```

---

#### `GET /auth/me` *(protected)*

Return the current authenticated user including their usage record.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "...", "email": "...", "fullName": "...",
    "usage": {
      "addressNormalizerCount": 3, "addressNormalizerLimit": 10,
      "routeOptimizerCount": 1,   "routeOptimizerLimit": 5
    }
  }
}
```

---

### Usage Endpoints

All require `Authorization: Bearer <token>`.

#### `GET /usage`

Return the user's current API usage counters and limits.

---

#### `POST /usage/increment`

Increment a service counter. Returns `403` if the limit is already reached.

**Request body:**
```json
{ "service": "address_normalizer" }
// or
{ "service": "route_optimizer" }
```

**Response `200`:** Updated usage object.

**Response `403` (limit reached):**
```json
{
  "success": false,
  "message": "Address normalizer limit reached",
  "limitReached": true,
  "service": "address_normalizer"
}
```

---

## Frontend Architecture

### Routing

```
/                           Public — LandingPage
/signup                     Public — SignupPage
/login                      Public — LoginPage
/verify-otp?userId=&email=  Public — OTPVerifyPage
/dashboard                  Protected → DashboardLayout
  /dashboard                  → DashboardHomePage (index)
  /dashboard/address-normalizer → AddressNormalizerPage
  /dashboard/route-optimizer    → RouteOptimizerPage
```

`ProtectedRoute` checks `isAuthenticated`. While `isLoading` (token validation in progress) it shows a spinner instead of redirecting.

### Auth Context

`src/context/AuthContext.tsx` provides:

| Value | Type | Description |
|---|---|---|
| `user` | `User \| null` | Authenticated user object |
| `token` | `string \| null` | JWT token |
| `isAuthenticated` | `boolean` | Whether a valid session exists |
| `isLoading` | `boolean` | True during initial token validation |
| `login(token, user)` | function | Store credentials in state + localStorage |
| `logout()` | function | Clear state + localStorage |
| `refreshUser()` | function | Re-fetch user from `GET /auth/me` |

On mount, `AuthContext` restores from `localStorage` immediately (no flicker), then silently calls `/auth/me` in the background to validate the token. If the token is expired, the user is logged out automatically.

### Design System

Theme constants are exported from `src/styles/theme.ts`:

```typescript
colors.navy        // #0A0E27
colors.gold        // #F5C842
colors.goldDim     // rgba(245,200,66,0.12)
colors.goldBorder  // rgba(245,200,66,0.2)
colors.blue        // #3B82F6
colors.green       // #10B981
colors.textMuted   // rgba(255,255,255,0.6)

glassmorphism      // Standard glass card style object
pageVariants       // Framer Motion page transition variants
containerVariants  // Stagger children container
cardHover          // whileHover lift + glow
```

**Reusable components:**

| Component | Description |
|---|---|
| `<GlassCard>` | Navy glassmorphism panel, optional hover lift |
| `<GoldButton>` | Gold gradient primary button, loading spinner |
| `<OutlineButton>` | Gold-bordered transparent secondary button |
| `<StatCard>` | Dashboard KPI card with count-up, progress ring, trend |
| `<UsageBadge>` | API usage pill with colored progress bar |
| `<SectionHeader>` | Title + subtitle with gold left-border accent |
| `<LoadingOverlay>` | Blurred overlay with spinner for async states |
| `<EmptyState>` | Centered icon + title + description placeholder |
| `<Toast>` / `useToast()` | Top-right dismissible notifications (success/error/warning/info) |

### Internationalization

`src/contexts/LanguageContext.tsx` provides:

```typescript
const { lang, setLang, t, isRTL } = useLanguage();

t('nav.features')   // → "Features" or "الميزات"
isRTL               // → true when lang === 'ar'
```

- Language persisted to `localStorage`
- `<html lang="ar" dir="rtl">` set automatically on change
- Cairo Arabic font loaded from Google Fonts
- All landing page sections conditionally swap `left`/`right` positioning, `textAlign`, gradient direction, and arrow icon direction

---

## Database Schema

```
User
  id            cuid (PK)
  email         unique
  username      unique
  companyName
  fullName
  phone?
  country?
  role          default "user"
  passwordHash  bcrypt (12 rounds)
  isVerified    default false
  createdAt
  updatedAt
  ─── relations ───
  otps[]        OTP
  usage?        Usage

OTP
  id            cuid (PK)
  userId        → User (cascade delete)
  code          6-digit string
  expiresAt     now + 10 minutes
  used          default false
  createdAt

Usage
  id            cuid (PK)
  userId        → User (unique, cascade delete)
  addressNormalizerCount    default 0
  addressNormalizerLimit    default 10
  routeOptimizerCount       default 0
  routeOptimizerLimit       default 5
  lastResetAt
  updatedAt
```

---

## Scripts

### Frontend

```bash
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # TypeScript compile + Vite production build
npm run preview    # Preview production build locally
npm run lint       # ESLint check
```

### Backend

```bash
npm run dev           # nodemon + ts-node hot-reload
npm run build         # tsc compile to dist/
npm run start         # Run compiled dist/server.js
npm run db:generate   # prisma generate (regenerate client after schema changes)
npm run db:push       # Push schema to database without migration files
npm run db:migrate    # Create and apply a named migration
npm run db:studio     # Open Prisma Studio GUI at http://localhost:5555
```

---

## License

Private — Wayn © 2026. All rights reserved.
