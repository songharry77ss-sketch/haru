import fs from "node:fs";
import path from "node:path";

// Local development: read KEY=value pairs from .env (repo root or server/). Real environment variables win,
// and in production (Render, Docker) there is no .env file, so this does nothing.
for (const file of [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "../.env")]) {
  if (fs.existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}
