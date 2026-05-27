/**
 * GET /api/announcements — public endpoint, no auth required.
 * Returns the latest active announcement (not expired).
 */

import { Router } from "express";

export const announcementsRouter = Router();

announcementsRouter.get("/", async (_req, res) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.json({ success: true, announcement: null });
  }

  try {
    const now = encodeURIComponent(new Date().toISOString());
    const r = await fetch(
      `${url}/rest/v1/announcements?active=eq.true&or=(expires_at.is.null,expires_at.gt.${now})&order=created_at.desc&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );

    if (!r.ok) {
      const errText = await r.text();
      console.error("announcements error:", r.status, errText);
      return res.json({ success: true, announcement: null });
    }

    const rows = await r.json() as Array<Record<string, unknown>>;
    return res.json({ success: true, announcement: rows[0] ?? null });
  } catch (error) {
    console.error("announcements error:", error);
    return res.json({ success: true, announcement: null });
  }
});
