import { app, errorHandler } from "./app.js";

// Vercel function entry: only /api/* reaches this; static files are served by Vercel's CDN.
app.use(errorHandler);

export default app;
