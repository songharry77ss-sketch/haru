import compression from "compression";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, errorHandler } from "./app.js";
import { getDb } from "./db.js";
import { llmEnabled } from "./llm.js";

// Long-running server for local development and Docker: the API plus the built web app.
const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = process.env.WEB_DIST ?? path.resolve(here, "../../web/dist");
const PORT = Number(process.env.PORT ?? 8787);

if (fs.existsSync(WEB_DIST)) {
  app.use(compression());
  app.use(
    express.static(WEB_DIST, {
      index: false,
      extensions: ["html"],
      setHeaders(res, file) {
        // Vite's hashed bundles never change; artwork under /img may be swapped, so it revalidates daily.
        if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        else if (file.includes(`${path.sep}img${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=86400");
      },
    }),
  );
  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(WEB_DIST, "index.html"));
  });
}
app.use(errorHandler);

const db = await getDb();
app.listen(PORT, () => {
  console.log(`haru server on :${PORT} (DB: ${db.driver === "postgres" ? "Postgres" : "embedded PGlite"}, AI: ${llmEnabled() ? "Claude" : "offline replies"})`);
});
