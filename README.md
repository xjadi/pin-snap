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
- 🤝 `/join-me` — **Join Me** board where members post a city & schedule so others can reply in a topic thread to join; posts also appear on the map with a distinct emerald badge icon and a map filter (`All` / `Pins` / `Join Me`).
- 👥 `/users` — grid of everyone. `/users/[id]` — that user's pins on their own map.
- ⚙️ `/profile` — edit your avatar/name/bio and see your pins.

## Setup

### 1. Create a Supabase project
Go to <https://supabase.com>, create a project, and grab:
- Project URL
- Anon public key

### 2. Run the schema
Open the Supabase **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
This creates `profiles`, `pins`, `join_me_posts`, and `join_me_replies` tables,
RLS policies, and a trigger that auto-creates a profile row on signup.

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
- The map uses **CARTO vector basemaps** (Voyager light / Dark Matter dark) and
  defaults to a Thailand view at zoom 5. CARTO began watermarking their
  keyless **raster** tiles in August 2026 and is retiring that service, so the
  app renders their **vector** styles via MapLibre GL instead — same
  cartography, sharper on retina. CARTO plans to require an API key for vector
  too, so set a free key to be safe: request one at
  <https://carto.com/basemaps/apikey> (no approval queue, fair use 5M tile
  requests/month) and put it in `.env.local` as
  `NEXT_PUBLIC_CARTO_API_KEY=…`. Any basemaps key covers **both** the raster
  and vector services — you only ever need one key. The app works without it
  today, but the key future-proofs the basemap. If CARTO's terms ever stop
  fitting, OpenFreeMap
  (<https://openfreemap.org>) serves equivalent keyless vector styles
  (Positron/Dark Matter) that drop into the same `basestyle()` helper.
- **MapLibre worker note:** Next.js (Turbopack) does not emit maplibre-gl v6's
  separate worker chunk, so vector basemaps silently never load (blank map,
  no console error — raster worked because raster tiles fetch on the main
  thread). The fix in place: `scripts/copy-maplibre-worker.mjs` (runs on
  `postinstall`) copies `maplibre-gl-worker.mjs` + `maplibre-gl-shared.mjs`
  into `public/`, and `MapView.tsx` calls
  `setWorkerUrl("/maplibre-gl-worker.mjs")` before the first map is created.
  If you upgrade `maplibre-gl`, re-run `npm install` (the postinstall hook
  refreshes the copies).
- Pin photos support **two input modes**: upload a file, or paste an image
  link — **both are stored in Supabase Storage** under `pins/<userId>/…`
  (per-user folders, easy bulk cleanup), and `photo_url` always ends up as a
  permanent Supabase CDN URL that never rots. Pasted links are auto-imported:
  the server fetches the image, stores it, and blocks the save with a clear
  error if the link is expired or blocked. Avatar storage remains
  link/preset based.

## Photo storage (Supabase Storage)

Photos live in the public **`pins`** bucket at `pins/<userId>/<uuid>.<ext>`.
The upload/delete API routes authenticate the user and always derive the path
from the authenticated user's id, so users can only touch their own folder.
Deleting a pin (or replacing its photo) best-effort removes the stored file so
nothing orphans.

Setup (one-time):

1. The bucket is created by the SQL at the bottom of
   [`supabase/schema.sql`](supabase/schema.sql) (or via the dashboard: create a
   **public** bucket named `pins`). The optional hardening policies for direct
   client-SDK access are in the same file — paste them in the SQL editor if
   you want them.
2. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (server-only — found in
   Supabase → Settings → API). It powers the server-side storage client.

**History note:** we first tried Google Drive with a service account, but
Google hard-blocks that combination on personal accounts — service accounts
own the files they upload and have **zero storage quota** (`403
storageQuotaExceeded`), even when uploading into a folder shared with them.
The only Google escapes are Shared Drives (requires Google Workspace) or
per-user OAuth. The Drive proxy code (`/api/photo/<id>`,
`src/lib/google/drive.ts`) remains in the repo and works if you ever move to a
Shared Drive; the active backend is Supabase Storage.

## Deploy (Vercel)

1. Push to a Git repo and import it in Vercel.
2. Add the same env vars in the Vercel project settings — including
   `SUPABASE_SERVICE_ROLE_KEY` (server-only storage client).
3. In Supabase, add your Vercel URL + `/auth/callback` to the redirect URLs.