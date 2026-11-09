import express from "express";
import compression from "compression";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { api } from "./api.js";
import { llmEnabled } from "./llm.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = process.env.WEB_DIST ?? path.resolve(here, "../../web/dist");
const PORT = Number(process.env.PORT ?? 8787);

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(compression());

// The iOS/Android apps load the UI from the device and call this API cross-origin.
const NATIVE_ORIGINS = new Set(["capacitor://localhost", "https://localhost", "http://localhost", "ionic://localhost"]);
const EXTRA_ORIGINS = new Set((process.env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
app.use("/api", (req, res, next) => {
  const origin = req.get("origin");
  if (origin && (NATIVE_ORIGINS.has(origin) || EXTRA_ORIGINS.has(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "32kb" }));

app.use("/api", api);
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));

if (fs.existsSync(WEB_DIST)) {
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

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({ error: "server_error" });
});

app.listen(PORT, () => {
  console.log(`haru server on :${PORT} (AI: ${llmEnabled() ? "Claude" : "offline replies"})`);
});
