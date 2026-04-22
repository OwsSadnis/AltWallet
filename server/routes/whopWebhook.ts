/**
 * POST /api/webhooks/whop
 * Verifies Whop webhook signature, generates a license token, stores it in
 * Supabase, and emails it to the buyer via Resend.
 *
 * IMPORTANT: mounted in index.ts BEFORE express.json() — raw body is needed
 * for HMAC signature verification.
 *
 * Required env vars:
 *   WHOP_WEBHOOK_SECRET       — signing secret from Whop Dashboard → Webhooks
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *
 * Optional env vars for precise plan mapping:
 *   WHOP_PRO_PLAN_ID          — Whop plan_id for Pro ($5/mo)
 *   WHOP_BUSINESS_PLAN_ID     — Whop plan_id for Business ($15/mo)
 */

import { Router } from "express";
import express from "express";
import crypto from "crypto";
import { customAlphabet } from "nanoid";

export const whopWebhookRouter = Router();

const genSuffix = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

// ─── Signature verification ───────────────────────────────────────────────────
// Whop uses HMAC-SHA256 over the raw body; signature is hex-encoded and sent
// as the full value of the Whop-Signature header.
function verifyWhopSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const mac = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(mac));
  } catch {
    return false;
  }
}

// ─── Plan detection ───────────────────────────────────────────────────────────
function detectPlan(data: Record<string, unknown>): "pro" | "business" {
  const proPlanId = process.env.WHOP_PRO_PLAN_ID;
  const bizPlanId = process.env.WHOP_BUSINESS_PLAN_ID;
  const planId = data.plan_id as string | undefined;

  if (bizPlanId && planId === bizPlanId) return "business";
  if (proPlanId && planId === proPlanId) return "pro";

  // Fallback: match by name
  const planObj = data.plan as Record<string, unknown> | undefined;
  const name = ((planObj?.name as string) || "").toLowerCase();
  if (name.includes("business")) return "business";

  return "pro";
}

// ─── Supabase: insert token ───────────────────────────────────────────────────
async function insertToken(
  token: string,
  plan: string,
  email: string
): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[whop-webhook] Supabase env vars missing — token not stored");
    return;
  }

  const res = await fetch(`${url}/rest/v1/tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ token, plan, email, used: false }),
  });

  if (!res.ok) {
    console.error("[whop-webhook] Supabase insert failed:", await res.text());
  }
}

// ─── Resend: send token email ─────────────────────────────────────────────────
function buildEmailHtml(token: string, plan: "pro" | "business"): string {
  const planLabel = plan === "business" ? "Business" : "Pro";
  const features =
    plan === "business"
      ? "Unlimited scans · AI summaries · CSV export · 3 seats"
      : "Unlimited scans · AI summaries · PDF reports";

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif;margin:0;padding:40px 20px">
  <div style="max-width:480px;margin:0 auto">
    <div style="text-align:center;margin-bottom:32px">
      <span style="font-size:22px;font-weight:700;color:#1D9E75;letter-spacing:-0.5px">AltWallet</span>
    </div>
    <h1 style="font-size:24px;font-weight:700;margin:0 0 8px">Your ${planLabel} license key</h1>
    <p style="color:#888;font-size:15px;margin:0 0 32px">
      Thanks for upgrading to AltWallet ${planLabel}. Use the key below to activate your plan.
    </p>
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:24px;text-align:center;margin-bottom:32px">
      <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px">License Key</p>
      <code style="font-family:monospace;font-size:20px;font-weight:700;color:#1D9E75;letter-spacing:2px">${token}</code>
    </div>
    <div style="margin-bottom:32px">
      <a href="https://altwallet.id/redeem"
         style="display:block;background:#1D9E75;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:600;font-size:15px">
        Activate at altwallet.id/redeem
      </a>
    </div>
    <p style="color:#555;font-size:13px;margin:0 0 8px">Included in your ${planLabel} plan:</p>
    <p style="color:#777;font-size:13px;margin:0 0 32px">${features}</p>
    <p style="color:#444;font-size:12px;text-align:center;margin:0">
      This key is single-use and bound to your AltWallet account after activation.<br>
      Need help? Email us at <a href="mailto:hello@altwallet.id" style="color:#1D9E75">hello@altwallet.id</a>
    </p>
  </div>
</body>
</html>`;
}

async function sendTokenEmail(
  email: string,
  token: string,
  plan: "pro" | "business"
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[whop-webhook] RESEND_API_KEY not set — email not sent");
    return;
  }

  const planLabel = plan === "business" ? "Business" : "Pro";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "AltWallet <noreply@altwallet.id>",
      to: [email],
      subject: `Your AltWallet ${planLabel} license key`,
      html: buildEmailHtml(token, plan),
    }),
  });

  if (!res.ok) {
    console.error("[whop-webhook] Resend send failed:", await res.text());
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────
whopWebhookRouter.post(
  "/whop",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["whop-signature"] as string | undefined;
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[whop-webhook] WHOP_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook not configured" });
    }

    if (!signature) {
      return res.status(400).json({ error: "Missing Whop-Signature header" });
    }

    const rawBody = (req.body as Buffer).toString("utf8");

    if (!verifyWhopSignature(rawBody, signature, webhookSecret)) {
      console.warn("[whop-webhook] Signature verification failed");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    let event: { event: string; data: Record<string, unknown> };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    console.log(`[whop-webhook] Event: ${event.event}`);

    if (event.event === "membership.went_valid") {
      const { data } = event;
      const user = data.user as Record<string, unknown> | undefined;
      const email = (user?.email as string) || "";

      if (!email) {
        console.error("[whop-webhook] No email in membership data — skipping");
        // Return 200 so Whop doesn't retry indefinitely
        return res.json({ received: true });
      }

      const plan = detectPlan(data);
      const token = `BETA-AW-${genSuffix()}`;

      await insertToken(token, plan, email);
      await sendTokenEmail(email, token, plan);

      console.log(
        `[whop-webhook] Token ${token} (${plan}) generated for ${email}`
      );
    }

    return res.json({ received: true });
  }
);
