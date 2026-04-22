/**
 * POST /api/webhooks/clerk
 * Verifies Clerk webhook signature (Svix HMAC-SHA256) then syncs user data to Supabase.
 *
 * IMPORTANT: This router must be mounted in index.ts BEFORE express.json() so that
 * express.raw() here receives the unparsed body needed for signature verification.
 *
 * Required env vars:
 *   CLERK_WEBHOOK_SECRET  — starts with "whsec_", from Clerk Dashboard → Webhooks
 *   SUPABASE_URL          — e.g. https://xyz.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { Router } from "express";
import express from "express";
import crypto from "crypto";

export const clerkWebhookRouter = Router();

// ─── Signature verification ───────────────────────────────────────────────────
function verifyClerkSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): boolean {
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  // Clerk webhook secrets are "whsec_<base64>" — strip the prefix before decoding
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const mac = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");
  // svix-signature header can contain multiple space-separated "v1,<sig>" values
  return svixSignature.split(" ").some((s) => s.replace(/^v1,/, "") === mac);
}

// ─── Supabase upsert via REST (no SDK dependency) ────────────────────────────
async function upsertUserInSupabase(payload: {
  clerk_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn("[clerk-webhook] Supabase env vars missing — skipping sync");
    return;
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      // upsert: insert or update on conflict (clerk_id is unique key)
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[clerk-webhook] Supabase upsert failed:", res.status, text);
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────
clerkWebhookRouter.post(
  "/clerk",
  // Raw body required for HMAC verification — do NOT let express.json() pre-parse
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const svixId = req.headers["svix-id"] as string | undefined;
    const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
    const svixSignature = req.headers["svix-signature"] as string | undefined;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({ error: "Missing Svix headers" });
    }

    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook not configured" });
    }

    const rawBody = (req.body as Buffer).toString("utf8");

    if (
      !verifyClerkSignature(
        rawBody,
        svixId,
        svixTimestamp,
        svixSignature,
        webhookSecret
      )
    ) {
      console.warn("[clerk-webhook] Signature verification failed");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    let event: { type: string; data: Record<string, unknown> };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const { type, data } = event;
    console.log(`[clerk-webhook] Received event: ${type}`);

    if (type === "user.created" || type === "user.updated") {
      const userId = data.id as string;
      const emails = data.email_addresses as Array<{
        email_address: string;
        id: string;
      }>;
      const primaryEmailId = data.primary_email_address_id as string | null;
      const primaryEmail =
        emails?.find((e) => e.id === primaryEmailId)?.email_address ??
        emails?.[0]?.email_address ??
        "";

      await upsertUserInSupabase({
        clerk_id: userId,
        email: primaryEmail,
        first_name: (data.first_name as string) ?? null,
        last_name: (data.last_name as string) ?? null,
      });
    }

    if (type === "user.deleted") {
      // Soft-delete or mark inactive — left as TODO until schema is confirmed
      console.log(`[clerk-webhook] user.deleted: ${data.id}`);
    }

    return res.json({ received: true });
  }
);
