/**
 * Standalone Vercel serverless function for GET /api/announcements.
 * No Clerk, no Express middleware — public endpoint, Supabase only.
 */
import type { IncomingMessage, ServerResponse } from "http";

function jsonResponse(res: ServerResponse, data: unknown): void {
  const body = JSON.stringify(data);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return jsonResponse(res, { success: true, announcement: null });
    }

    const now = encodeURIComponent(new Date().toISOString());
    const r = await fetch(
      `${url}/rest/v1/announcements?select=*&active=eq.true&or=(expires_at.is.null,expires_at.gt.${now})&order=created_at.desc&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );

    if (!r.ok) {
      console.error("[announcements] supabase error:", r.status, await r.text());
      return jsonResponse(res, { success: true, announcement: null });
    }

    const rows = (await r.json()) as Array<Record<string, unknown>>;
    return jsonResponse(res, { success: true, announcement: rows[0] ?? null });
  } catch (error) {
    console.error("[announcements] unhandled error:", error);
    return jsonResponse(res, { success: true, announcement: null });
  }
}
