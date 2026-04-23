/**
 * Team Seats — Business tier only, max 3 seats
 *
 * POST   /api/team/invite            — invite member by email
 * GET    /api/team/members           — list all team members
 * DELETE /api/team/members/:memberId — remove member (use team_members.id UUID)
 *
 * table: team_members
 *   id           UUID PK
 *   owner_id     TEXT  (Clerk userId of Business account owner)
 *   member_id    TEXT  (Clerk userId — null until member links their account)
 *   member_email TEXT
 *   invited_at   TIMESTAMPTZ
 *   joined_at    TIMESTAMPTZ
 */

import { Router } from "express";
import { requireAuth, requireBusinessPlan } from "../middleware/auth.js";

export const teamRouter = Router();

const MAX_SEATS = 3;

// ─── Supabase helpers ─────────────────────────────────────────────────────────

interface TeamMemberRow {
  id: string;
  owner_id: string;
  member_id: string | null;
  member_email: string;
  invited_at: string;
  joined_at: string | null;
}

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function sbUrl() {
  return process.env.SUPABASE_URL!;
}

async function countSeats(ownerId: string): Promise<number> {
  const res = await fetch(
    `${sbUrl()}/rest/v1/team_members?owner_id=eq.${encodeURIComponent(ownerId)}&select=id`,
    { headers: sbHeaders() }
  );
  if (!res.ok) return 0;
  const rows = (await res.json()) as unknown[];
  return rows.length;
}

async function findMemberByEmail(
  ownerId: string,
  email: string
): Promise<TeamMemberRow | null> {
  const res = await fetch(
    `${sbUrl()}/rest/v1/team_members?owner_id=eq.${encodeURIComponent(ownerId)}&member_email=eq.${encodeURIComponent(email)}&limit=1`,
    { headers: sbHeaders() }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as TeamMemberRow[];
  return rows[0] ?? null;
}

// ─── POST /api/team/invite ────────────────────────────────────────────────────
teamRouter.post("/invite", requireAuth, requireBusinessPlan, async (req, res) => {
  const { email } = req.body as { email?: unknown };

  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ success: false, error: "Email is required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ success: false, error: "Invalid email address." });
  }

  const ownerId = req.userId!;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  // Check if already invited
  const existing = await findMemberByEmail(ownerId, normalizedEmail);
  if (existing) {
    return res.status(409).json({ success: false, error: "This email has already been invited." });
  }

  // Enforce max 3 seats
  const currentSeats = await countSeats(ownerId);
  if (currentSeats >= MAX_SEATS) {
    return res.status(402).json({
      success: false,
      error: `Business plan allows a maximum of ${MAX_SEATS} team seats.`,
    });
  }

  const insertRes = await fetch(`${sbUrl()}/rest/v1/team_members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...sbHeaders(),
    },
    body: JSON.stringify({
      owner_id: ownerId,
      member_email: normalizedEmail,
      invited_at: new Date().toISOString(),
    }),
  });

  if (!insertRes.ok) {
    console.error("[team] Supabase insert failed:", await insertRes.text());
    return res.status(500).json({ success: false, error: "Failed to invite member." });
  }

  const rows = (await insertRes.json()) as TeamMemberRow[];
  return res.status(201).json({ success: true, member: rows[0] });
});

// ─── GET /api/team/members ────────────────────────────────────────────────────
teamRouter.get("/members", requireAuth, requireBusinessPlan, async (req, res) => {
  const ownerId = req.userId!;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  const membersRes = await fetch(
    `${sbUrl()}/rest/v1/team_members?owner_id=eq.${encodeURIComponent(ownerId)}&order=invited_at.asc`,
    { headers: sbHeaders() }
  );

  if (!membersRes.ok) {
    console.error("[team] Supabase fetch failed:", await membersRes.text());
    return res.status(500).json({ success: false, error: "Failed to fetch team members." });
  }

  const members = (await membersRes.json()) as TeamMemberRow[];
  return res.json({ success: true, members, seats_used: members.length, seats_max: MAX_SEATS });
});

// ─── DELETE /api/team/members/:memberId ───────────────────────────────────────
// :memberId is the team_members.id UUID returned by GET /api/team/members
teamRouter.delete("/members/:memberId", requireAuth, requireBusinessPlan, async (req, res) => {
  const { memberId } = req.params;
  const ownerId = req.userId!;

  if (!memberId || !/^[0-9a-f-]{36}$/i.test(memberId)) {
    return res.status(400).json({ success: false, error: "Invalid member ID." });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  // Verify the record belongs to this owner before deleting
  const checkRes = await fetch(
    `${sbUrl()}/rest/v1/team_members?id=eq.${encodeURIComponent(memberId)}&owner_id=eq.${encodeURIComponent(ownerId)}&select=id&limit=1`,
    { headers: sbHeaders() }
  );

  if (!checkRes.ok) {
    return res.status(500).json({ success: false, error: "Failed to verify member." });
  }

  const rows = (await checkRes.json()) as { id: string }[];
  if (rows.length === 0) {
    return res.status(404).json({ success: false, error: "Member not found." });
  }

  const deleteRes = await fetch(
    `${sbUrl()}/rest/v1/team_members?id=eq.${encodeURIComponent(memberId)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
    { method: "DELETE", headers: sbHeaders() }
  );

  if (!deleteRes.ok) {
    console.error("[team] Supabase delete failed:", await deleteRes.text());
    return res.status(500).json({ success: false, error: "Failed to remove member." });
  }

  return res.json({ success: true });
});
