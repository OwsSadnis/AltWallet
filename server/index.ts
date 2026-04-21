/**
 * AltWallet — server/index.ts
 * Security-hardened Express entry point
 * Fix: C-4, H-1, H-2, H-5
 */

import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const IS_PROD = process.env.NODE_ENV === "production";

// ─── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = IS_PROD
  ? ["https://altwallet.id", "https://www.altwallet.id"]
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow server-to-server (no origin) or whitelisted origins
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── SECURITY HEADERS (helmet) ────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // needed for Tailwind
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "https://api.gopluslabs.io",
          "https://api.etherscan.io",
          "https://api.helius.xyz",
          "https://api.tronscan.org",
          "https://pro-api.coinmarketcap.com",
          "https://api.anthropic.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: IS_PROD
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    crossOriginEmbedderPolicy: false, // relax if embedding third-party content
  })
);

// ─── BODY PARSER ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // limit body size
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
// Global API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: (req) => !IS_PROD, // skip in development
});

// Strict limiter for scan endpoint (expensive blockchain API calls)
const scanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Scan limit reached. Please wait before scanning again." },
});

// Webhook limiter (Whop sends max 1 event per user action)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);
app.use("/api/scan", scanLimiter);
app.use("/api/webhook", webhookLimiter);

// ─── ROUTES ───────────────────────────────────────────────────────────────────
// Import your route files here as you build them:
// import { scanRouter } from "./routes/scan.js";
// import { webhookRouter } from "./routes/webhook.js";
// import { adminRouter } from "./routes/admin.js";
//
// app.use("/api/scan", scanRouter);
// app.use("/api/webhook", webhookRouter);
// app.use("/api/admin", adminRouter);

// Health check — no auth needed
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── STATIC FILES + SPA FALLBACK (local production only) ────────────────────
// On Vercel, static files are served by CDN and SPA routing is handled by
// vercel.json rewrites — skip this block when running as a serverless function.
if (!process.env.VERCEL) {
  // __dirname here = dist/ (esbuild outdir), Vite outputs to dist/public/
  const clientDist = path.join(__dirname, "public");
  app.use(express.static(clientDist));

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API route not found" });
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    // Log full error server-side only
    console.error("[server] unhandled error:", err);

    // Never expose stack trace or internal message to client in production
    const clientMessage = IS_PROD
      ? "Internal server error"
      : err.message;

    res.status(500).json({ error: clientMessage });
  }
);

// ─── START (local only) ───────────────────────────────────────────────────────
// Vercel manages the process lifecycle for serverless functions — don't call
// listen() when running as a Vercel function (VERCEL env var is set to "1").
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(
      `[server] running on port ${PORT} (${IS_PROD ? "production" : "development"})`
    );
  });
}

export default app;