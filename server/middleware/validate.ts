/**
 * AltWallet — server/middleware/validate.ts
 * Input validation: wallet addresses + Whop webhook signature
 * Fix: H-4 (wallet validation), C-* (webhook verification)
 *
 * REQUIRES: crypto (built-in Node.js)
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ─── WALLET ADDRESS VALIDATION ────────────────────────────────────────────────
export type ChainCode = "ETH" | "BTC" | "SOL" | "TRX" | "XRP" | "SUI" | "BNB";

const ADDRESS_REGEX: Record<ChainCode, RegExp> = {
  ETH: /^0x[a-fA-F0-9]{40}$/,
  BNB: /^0x[a-fA-F0-9]{40}$/, // BNB Smart Chain sama format dengan ETH
  BTC: /^(bc1[a-zA-HJ-NP-Z0-9]{6,87}|[13][a-zA-HJ-NP-Z0-9]{25,34})$/,
  SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  TRX: /^T[a-zA-Z0-9]{33}$/,
  XRP: /^r[a-zA-Z0-9]{24,34}$/,
  SUI: /^0x[a-fA-F0-9]{64}$/,
};

const SUPPORTED_CHAINS = Object.keys(ADDRESS_REGEX) as ChainCode[];

/**
 * Validasi wallet address dari request body atau query params.
 * Gunakan sebelum handler yang memanggil blockchain API.
 *
 * Expects: req.body.address, req.body.chain  (atau req.query)
 */
export function validateWalletAddress(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const address = (req.body?.address || req.query?.address) as string;
  const chain = (req.body?.chain || req.query?.chain) as string;

  // Chain harus valid
  if (!chain || !SUPPORTED_CHAINS.includes(chain as ChainCode)) {
    return res.status(400).json({
      error: "Invalid chain. Supported: " + SUPPORTED_CHAINS.join(", "),
    });
  }

  // Address harus ada
  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Wallet address is required." });
  }

  // Trim whitespace
  const trimmed = address.trim();

  // Max length guard (prevent DoS via huge string)
  if (trimmed.length > 128) {
    return res.status(400).json({ error: "Address too long." });
  }

  // Format validation
  const regex = ADDRESS_REGEX[chain as ChainCode];
  if (!regex.test(trimmed)) {
    return res.status(400).json({
      error: `Invalid ${chain} address format.`,
    });
  }

  // Attach validated values ke req untuk handler
  req.body.address = trimmed;
  req.body.chain = chain as ChainCode;

  next();
}

// ─── WHOP WEBHOOK SIGNATURE VERIFICATION ─────────────────────────────────────
/**
 * Verifikasi bahwa webhook POST datang beneran dari Whop,
 * bukan dari attacker yang coba fake event membership_activated.
 *
 * Fix: mencegah attacker kirim fake webhook untuk dapat akses Pro/Business gratis.
 *
 * REQUIRES: WHOP_WEBHOOK_SECRET di .env
 * (ambil dari Whop dashboard → Developer → Webhook → Secret)
 *
 * PENTING: Middleware ini harus dipasang SEBELUM express.json()
 * untuk endpoint webhook, karena butuh raw body untuk verifikasi.
 * Gunakan express.raw() di route webhook.
 */
export function verifyWhopWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[webhook] WHOP_WEBHOOK_SECRET not set in environment!");
    return res.status(500).json({ error: "Server misconfiguration." });
  }

  const signature = req.headers["x-whop-signature"] as string;

  if (!signature) {
    console.warn("[webhook] Request missing x-whop-signature header");
    return res.status(401).json({ error: "Missing webhook signature." });
  }

  // Raw body diperlukan untuk HMAC — pastikan route pakai express.raw()
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody) && typeof rawBody !== "string") {
    console.error("[webhook] Raw body not available. Use express.raw() on webhook route.");
    return res.status(400).json({ error: "Invalid request body." });
  }

  try {
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const expectedFull = `sha256=${expectedSig}`;

    // Gunakan timingSafeEqual untuk prevent timing attack
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedFull);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      console.warn("[webhook] Invalid signature — possible spoofing attempt");
      return res.status(401).json({ error: "Invalid webhook signature." });
    }

    // Parse body setelah verifikasi
    try {
      req.body = JSON.parse(rawBody.toString());
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }

    next();
  } catch (err) {
    console.error("[webhook] Signature verification error:", err);
    res.status(500).json({ error: "Webhook verification failed." });
  }
}

// ─── CONTOH PENGGUNAAN DI ROUTE FILE ─────────────────────────────────────────
//
// import express from "express";
// import { verifyWhopWebhook } from "../middleware/validate.js";
// import { requireAuth, requirePaidPlan } from "../middleware/auth.js";
// import { validateWalletAddress } from "../middleware/validate.js";
//
// const router = express.Router();
//
// // Webhook dari Whop — raw body, no JSON parse dulu
// router.post(
//   "/webhook/whop",
//   express.raw({ type: "application/json" }),
//   verifyWhopWebhook,
//   whopWebhookHandler
// );
//
// // Scan endpoint — auth + validasi address
// router.post(
//   "/scan",
//   requireAuth,
//   validateWalletAddress,
//   scanHandler
// );
//
// // Portfolio — auth + plan check
// router.get(
//   "/portfolio/:address",
//   requireAuth,
//   requirePaidPlan,
//   validateWalletAddress,
//   portfolioHandler
// );