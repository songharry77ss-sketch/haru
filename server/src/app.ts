import "./env.js";
import express from "express";
import helmet from "helmet";
import { api } from "./api.js";

/** The API application, shared by the long-running server (index.ts) and the Vercel function (vercel.ts). */
export const app = express();
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

app.use("/api", express.json({ limit: "32kb" }));
// Personal data: never cache API answers in shared caches (the catalog opts back in itself).
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", api);
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));

export function errorHandler(err: Error & { status?: number; type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) {
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(err.status ?? 400).json({ error: "invalid_request" });
  }
  console.error("[error]", err);
  res.status(500).json({ error: "server_error" });
}
