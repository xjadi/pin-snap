# 📌 PinSnap — Pin your photo memories on the map

A casual map app where users pin photos by **link** to a map centred on Thailand.
Hover a pin to peek the photo, click it to open a detail panel with a memo.
Magic-link (passwordless) auth, avatar + display name, public landing map, and
per-user profile maps.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Supabase** — Postgres + magic-link auth (via `@supabase/ssr`)
- **MapLibre GL JS** — map rendering
- **CARTO Voyager** raster tiles — a casual, colourful basemap (no API key needed)
- **Nominatim (OpenStreetMap)** — reverse-geocoding pin clicks to city/country

## Features

- 🔐 Magic-link login (no passwords). Visit `/login`, enter email, click the link.
- 🧑‍🎤 Onboarding to set **display name** + **avatar** (preset or image-link).
- 🗺️ Landing page `/` shows **every user's** public pins on one map.
- 🖱️ Hover a pin → photo popup. Click a pin → detail modal with memo; owner can edit the memo / delete the pin.
- ➕ `/add` — click the map, paste a photo URL, auto city/country, add a memo, save.
- 👥 `/users` — grid of everyone. `/users/[id]` — that user's pins on their own map.
- ⚙️ `/profile` — edit your avatar/name/bio and see your pins.

## Setup

### 1. Create a Supabase project
Go to <https://supabase.com>, create a project, and grab:
- Project URL
- Anon public key

### 2. Run the schema
Open the Supabase **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
This creates `profiles` and `pins` tables, RLS policies, and a trigger that
auto-creates a profile row on signup.

### 3. Configure auth
In Supabase → **Authentication → URL configuration**:
- **Site URL**: `http://localhost:3000` (dev) or your prod URL
- Add `http://localhost:3000/auth/callback` to **Redirect URLs**

Make sure **Email** is an enabled auth provider (it is by default) and
"Confirm email" / magic-link is on.

### 4. Environment variables
Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Install & run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Project structure

```
src/
  app/
    page.tsx            # Landing: global map of all pins
    login/             # Magic-link login
    auth/callback/     # Magic-link redirect → session
    onboarding/        # First-time: avatar + display name
    add/               # Add a pin (click map, paste photo link)
    profile/           # Your profile editor + your pins
    users/             # All people grid  +  users/[id] map
  components/
    MapView.tsx        # MapLibre casual map with hover popups + click markers
    PinDetailModal.tsx # Detail panel with memo (owner-editable)
    Navbar, AuthProvider, SignOutButton
  lib/
    supabase/          # client, server, middleware
    geocode.ts         # Nominatim reverse-geocode
    pin.ts             # MapPin type
supabase/schema.sql     # Tables, RLS, trigger
```

## Notes

- All pins are **public** to anyone (per your spec). Memos are visible publicly
  too in this configuration; only the owner can edit/delete their own pins
  (enforced by RLS).
- The map uses CARTO Voyager tiles (free, casual style) and defaults to a
  Thailand view at zoom 5.
- Photo and avatar storage is **link-based only** — no file uploads.

## Deploy (Vercel)

1. Push to a Git repo and import it in Vercel.
2. Add the same env vars in the Vercel project settings.
3. In Supabase, add your Vercel URL + `/auth/callback` to the redirect URLs.