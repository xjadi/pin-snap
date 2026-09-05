// Copies maplibre-gl's worker files into /public so the app can serve them
// itself. Next.js (Turbopack) does not emit maplibre-gl's separate worker
// chunk, so maplibre's default `new URL('./maplibre-gl-worker.mjs', …)`
// resolution 404s and vector basemaps silently never load. We serve the files
// from /public and point maplibre at them via setWorkerUrl() in MapView.
// Run automatically by the `postinstall` npm hook.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "node_modules", "maplibre-gl", "dist");
const pub = join(root, "public");

mkdirSync(pub, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(dist, file), join(pub, file));
  console.log(`copied maplibre-gl/dist/${file} → public/${file}`);
}
