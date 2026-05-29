import { Router, Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import { supabaseAdmin } from "../../lib/supabaseAdmin.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";

const router = Router();
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * List all users with pagination, search, filter by plan/status
 *
 * Query: page, limit, search, plan, status
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string)?.trim() || "";
    const plan = req.query.plan as string;
    const status = req.query.status as string;

    let query = supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (plan) query = query.eq("plan", plan);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,display_name.ilike.%${search}%`
      );
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error("[GET /admin/users] Supabase error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
      return;
    }

    res.json({
      data: users,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (err) {
    console.error("[GET /admin/users] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get user detail: profile + 10 recent wallet scans
 */
router.get("/:userId", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (profileError || !profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { data: scans, error: scansError } = await supabaseAdmin
      .from("wallet_scans")
      .select("id, wallet_address, chain, risk_score, risk_label, created_at, label")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (scansError) {
      console.error("[GET /admin/users/:userId] Scans error:", scansError);
    }

    let clerkUser = null;
    try {
      clerkUser = await clerkClient.users.getUser(userId);
    } catch (clerkErr) {
      console.error("[GET /admin/users/:userId] Clerk error:", clerkErr);
    }

    res.json({
      profile,
      recent_scans: scans ?? [],
      clerk_metadata: clerkUser
        ? {
            email: clerkUser.emailAddresses[0]?.emailAddress,
            banned: clerkUser.banned,
            created_at: clerkUser.createdAt,
            last_sign_in_at: clerkUser.lastSignInAt,
          }
        : null,
    });
  } catch (err) {
    console.error("[GET /admin/users/:userId] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/admin/users/:userId/plan
 * Change user plan — updates both Clerk and Supabase
 */
router.patch(
  "/:userId/plan",
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { plan } = req.body;

    const VALID_PLANS = ["free", "pro", "business"];
    if (!plan || !VALID_PLANS.includes(plan)) {
      res.status(400).json({
        error: `Invalid plan. Must be one of: ${VALID_PLANS.join(", ")}`,
      });
      return;
    }

    try {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: { plan },
      });

      const { error: supabaseError } = await supabaseAdmin
        .from("profiles")
        .update({ plan, updated_at: new Date().toISOString() })
        .eq("clerk_user_id", userId);

      if (supabaseError) {
        console.error("[PATCH /admin/users/:userId/plan] Supabase error:", supabaseError);
        res.status(500).json({ error: "Failed to update plan in database" });
        return;
      }

      res.json({ success: true, message: `Plan updated to '${plan}'`, user_id: userId, plan });
    } catch (err: any) {
      if (err?.status === 404 || err?.clerkError) {
        res.status(404).json({ error: "User not found in Clerk" });
        return;
      }
      console.error("[PATCH /admin/users/:userId/plan] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * DELETE /api/admin/users/:userId/access
 * Revoke access — bans user in Clerk + resets plan to free in Supabase
 */
router.delete(
  "/:userId/access",
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const adminUserId = (req as any).adminUserId;

    if (userId === adminUserId) {
      res.status(400).json({ error: "Cannot revoke your own admin access" });
      return;
    }

    try {
      await clerkClient.users.banUser(userId);

      const { error: supabaseError } = await supabaseAdmin
        .from("profiles")
        .update({
          plan: "free",
          status: "banned",
          updated_at: new Date().toISOString(),
        })
        .eq("clerk_user_id", userId);

      if (supabaseError) {
        console.error("[DELETE /admin/users/:userId/access] Supabase error:", supabaseError);
        res.status(500).json({ error: "Banned in Clerk but failed to update Supabase" });
        return;
      }

      res.json({
        success: true,
        message: "User access revoked. Account banned and plan reset to free.",
        user_id: userId,
      });
    } catch (err: any) {
      if (err?.status === 404 || err?.clerkError) {
        res.status(404).json({ error: "User not found in Clerk" });
        return;
      }
      console.error("[DELETE /admin/users/:userId/access] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
