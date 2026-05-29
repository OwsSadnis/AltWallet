import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

/**
 * requireAdmin middleware
 * 1. Verifies Clerk session
 * 2. Checks profiles.role === 'admin' in Supabase (defense-in-depth)
 * 3. Attaches req.adminUserId for downstream handlers
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized: No valid session" });
      return;
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("role, plan, status")
      .eq("clerk_user_id", userId)
      .single();

    if (error || !profile) {
      res.status(401).json({ error: "Unauthorized: Profile not found" });
      return;
    }

    if (profile.role !== "admin") {
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }

    (req as any).adminUserId = userId;
    next();
  } catch (err) {
    console.error("[requireAdmin] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
