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
import { clerkMiddleware } from "./middleware/auth.js";
import { clerkWebhookRouter } from "./routes/clerkWebhook.js";
import { whopWebhookRouter } from "./routes/whopWebhook.js";
import { redeemRouter } from "./routes/redeem.js";
import { scanRouter } from "./routes/scan.js";
import { exportRouter } from "./routes/export.js";
import { teamRouter } from "./routes/team.js";
import { adminRouter } from "./routes/admin.js";
import { announcementsRouter } from "./routes/announcements.js";
import dashboardRouter from "./routes/dashboardRoutes.js";
import historyRouter from "./routes/history.js";

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
        scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
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
          "https://challenges.cloudflare.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        frameSrc: ["https://challenges.cloudflare.com"],
        objectSrc: ["'none'"],
      },
    },
    hsts: IS_PROD
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    crossOriginEmbedderPolicy: false, // relax if embedding third-party content
  })
);

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

// IP-based daily limiter for scan endpoint (anti-abuse across accounts)
const ipDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { error: 'Daily limit reached from this network.', code: 'IP_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !IS_PROD,
});

// Webhook limiter (Whop sends max 1 event per user action)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);
app.use("/api/webhooks", webhookLimiter);

// ─── WEBHOOK ROUTES (before express.json — raw body needed for HMAC verification)
app.use("/api/webhooks", clerkWebhookRouter);
app.use("/api/webhooks", whopWebhookRouter);

// ─── BODY PARSER (after webhook routes so they receive raw body) ──────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// ─── CLERK MIDDLEWARE (after body parsers, before protected routes) ───────────
app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY,
}));

// ─── DEBUG / HEALTH (before all other routes) ────────────────────────────────
app.get("/api/debug", (_req, res) => {
  res.json({
    ok: true,
    supabase: !!process.env.SUPABASE_URL,
    clerk: !!process.env.CLERK_SECRET_KEY,
    serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use("/api/redeem", redeemRouter);
app.use("/api/scan", ipDailyLimiter, scanLimiter, scanRouter);
app.use("/api/export", exportRouter);
app.use("/api/team", teamRouter);
app.use("/api/admin", adminRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/history", historyRouter);

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