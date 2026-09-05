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
- Pin photos support **two input modes**: upload a file (stored in Google Drive
  via a service account, served through `/api/photo/<id>` — stable, permanent
  URLs) or paste an image link (legacy). Avatar storage remains link/preset
  based.

## Photo storage setup (Google Drive)

Pin photo uploads are stored in Google Drive via a **service account** and
served through a Next.js proxy route, so `photo_url` never rots. One-time setup:

1. Go to the [Google Cloud Console](https://console.cloud.google.com) → create
   (or pick) a project → **APIs & Services → Library** → enable the
   **Google Drive API**.
2. **IAM & Admin → Service Accounts → Create service account** (any name, e.g.
   `pinsnap-uploader`). Then open it → **Keys → Add key → Create new key →
   JSON** and download the key file.
3. In Google Drive, create a folder (e.g. `pinsnap-photos`). **Share** it with
   the service account's email address (`…@….iam.gserviceaccount.com`) as
   **Editor**. Copy the **folder ID** from the folder URL
   (`https://drive.google.com/drive/folders/<FOLDER_ID>`).
4. Add to `.env.local` (server-only — never prefix with `NEXT_PUBLIC`):

   ```
   GOOGLE_CLIENT_EMAIL=<service-account email from the JSON key>
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n"
   GOOGLE_DRIVE_FOLDER_ID=<folder id>
   ```

   Keep the `\n` escapes and the surrounding quotes in `GOOGLE_PRIVATE_KEY`.

How it works:

- **Upload**: `POST /api/upload` (auth required) → validates type/size
  (JPG/PNG/WebP/GIF, ≤ 5MB) → uploads into the shared Drive folder → makes the
  file link-readable → returns `/api/photo/<fileId>`, which is stored in
  `pins.photo_url`.
- **Serve**: `GET /api/photo/<fileId>` fetches the bytes with the service
  account and re-serves them with `Cache-Control: public, max-age=31536000,
  immutable` (files are write-once, so caching is safe).
- **Cleanup**: deleting a pin (or replacing its photo) best-effort deletes the
  Drive file via `DELETE /api/photo/<fileId>` so files don't orphan.

Existing pins with pasted external URLs keep working (and rotting) — only new
uploads go to Drive. A future migration could backfill them.

## Deploy (Vercel)

1. Push to a Git repo and import it in Vercel.
2. Add the same env vars in the Vercel project settings (including the three
   `GOOGLE_*` vars — set `GOOGLE_PRIVATE_KEY` with the same `\n` escapes).
3. In Supabase, add your Vercel URL + `/auth/callback` to the redirect URLs.