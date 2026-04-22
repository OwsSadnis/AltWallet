/**
 * POST /api/redeem
 * Body: { token: string, turnstileToken: string }
 *
 * Flow:
 *   1. requireAuth  — Clerk JWT must be valid (userId extracted server-side)
 *   2. Verify Cloudflare Turnstile CAPTCHA
 *   3. Validate token exists in Supabase + not already used
 *   4. Mark token as used (used_by, used_at)
 *   5. Update Clerk publicMetadata with { plan }
 *   6. Return { success: true, plan }
 *
 * Required env vars:
 *   TURNSTILE_SECRET_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CLERK_SECRET_KEY  (used implicitly by @clerk/express clerkClient)
 */

import { Router } from "express";
import { clerkClient } from "@clerk/express";
import { requireAuth } from "../middleware/auth.js";

export const redeemRouter = Router();

// ─── Cloudflare Turnstile verification ───────────────────────────────────────
async function verifyTurnstile(
  responseToken: string,
  remoteIp: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Dev mode: skip CAPTCHA if secret not configured
    console.warn("[redeem] TURNSTILE_SECRET_KEY not set — skipping CAPTCHA");
    return true;
  }

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: responseToken,
        remoteip: remoteIp || undefined,
      }),
    }
  );

  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
interface TokenRow {
  id: string;
  plan: string;
  used: boolean;
}

async function fetchToken(tokenStr: string): Promise<TokenRow | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const res = await fetch(
    `${url}/rest/v1/tokens?token=eq.${encodeURIComponent(tokenStr)}&select=id,plan,used&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    }
  );

  if (!res.ok) return null;
  const rows = (await res.json()) as TokenRow[];
  return rows[0] ?? null;
}

async function markTokenUsed(tokenId: string, userId: string): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  await fetch(`${url}/rest/v1/tokens?id=eq.${encodeURIComponent(tokenId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      used: true,
      used_by: userId,
      used_at: new Date().toISOString(),
    }),
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────
redeemRouter.post("/", requireAuth, async (req, res) => {
  const { token, turnstileToken } = req.body as {
    token?: unknown;
    turnstileToken?: unknown;
  };

  if (typeof token !== "string" || !token.trim()) {
    return res
      .status(400)
      .json({ success: false, error: "Token is required." });
  }

  // 1. Verify Turnstile CAPTCHA
  const ip =
    (req.headers["cf-connecting-ip"] as string) ||
    (req.headers["x-forwarded-for"] as string) ||
    req.ip ||
    "";

  const captchaOk = await verifyTurnstile(
    typeof turnstileToken === "string" ? turnstileToken : "",
    ip
  );
  if (!captchaOk) {
    return res.status(400).json({
      success: false,
      error: "CAPTCHA verification failed. Please try again.",
    });
  }

  // 2. Validate token in Supabase
  const row = await fetchToken(token.trim().toUpperCase());
  if (!row) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid token." });
  }
  if (row.used) {
    return res
      .status(400)
      .json({ success: false, error: "Token has already been used." });
  }

  const userId = req.userId!;

  // 3. Mark token as used
  await markTokenUsed(row.id, userId);

  // 4. Update Clerk publicMetadata
  await clerkClient.users.updateUser(userId, {
    publicMetadata: { plan: row.plan },
  });

  return res.json({ success: true, plan: row.plan });
});
