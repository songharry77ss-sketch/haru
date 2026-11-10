// Builds a Vercel deployment (Build Output API v3) into .vercel/output:
//   static/              the web app (served by Vercel's CDN)
//   functions/api.func/  the API as one bundled Node function
// Deploy with:  npx vercel deploy --prebuilt --prod
import { build } from "esbuild";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".vercel/output");
// Run the API next to the database: every request makes several queries. Singapore is the nearest
// region Vercel's built-in Postgres (Neon) offers to Korea.
const REGION = process.env.VERCEL_FUNCTION_REGION ?? "sin1";

fs.rmSync(out, { recursive: true, force: true });

// 1. Web app
if (!process.argv.includes("--skip-web")) execSync("npm run build -w web", { cwd: root, stdio: "inherit" });
fs.cpSync(path.join(root, "web/dist"), path.join(out, "static"), { recursive: true });

// 2. API function
const fn = path.join(out, "functions/api.func");
fs.mkdirSync(fn, { recursive: true });
await build({
  entryPoints: [path.join(root, "server/src/vercel.ts")],
  outfile: path.join(fn, "index.js"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  // The embedded database is for local development only; production always has DATABASE_URL.
  external: ["@electric-sql/pglite"],
  footer: { js: "module.exports = module.exports.default;" },
  logLevel: "warning",
});
fs.writeFileSync(
  path.join(fn, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.js",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
      maxDuration: 30,
      regions: [REGION],
    },
    null,
    2,
  ),
);

// 3. Routing and headers
const csp =
  "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
fs.writeFileSync(
  path.join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/api/(.*)", dest: "/api" },
        {
          src: "/(.*)",
          headers: {
            "content-security-policy": csp,
            "x-content-type-options": "nosniff",
            "referrer-policy": "strict-origin-when-cross-origin",
            "strict-transport-security": "max-age=31536000; includeSubDomains",
          },
          continue: true,
        },
        { src: "/assets/(.*)", headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
        { src: "/img/(.*)", headers: { "cache-control": "public, max-age=86400" }, continue: true },
        { handle: "filesystem" },
        { src: "/(privacy|terms|support)/?", dest: "/$1.html" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

const size = (fs.statSync(path.join(fn, "index.js")).size / 1024 / 1024).toFixed(2);
console.log(`vercel output ready: static + api function (${size} MB, region ${REGION})`);
