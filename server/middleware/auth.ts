/**
 * AltWallet — server/middleware/auth.ts
 * Server-side auth enforcement via Clerk
 * Fix: C-1, C-2, C-3, H-3
 *
 * REQUIRES: @clerk/express
 * Install: pnpm add @clerk/express
 */

import { Request, Response, NextFunction } from "express";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/express";

// ─── CLERK MIDDLEWARE (pasang di server/index.ts) ─────────────────────────────
// app.use(clerkMiddleware());   ← tambahkan ini di index.ts sebelum routes
export { clerkMiddleware };

// ─── TYPES ───────────────────────────────────────────────────────────────────
export type Plan = "free" | "pro" | "business";

declare global {
  namespace Express {
    interface Request {
      userPlan?: Plan;
      userId?: string;
    }
  }
}

// ─── requireAuth ─────────────────────────────────────────────────────────────
/**
 * Pastikan request datang dari user yang sudah login via Clerk.
 * Attach userId ke req untuk dipakai middleware/handler berikutnya.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    req.userId = userId;
    next();
  } catch (err) {
    console.error("[auth] requireAuth error:", err);
    res.status(401).json({ error: "Authentication failed." });
  }
}

// ─── requirePaidPlan ──────────────────────────────────────────────────────────
/**
 * Pastikan user punya plan Pro atau Business.
 * Plan dibaca dari Clerk publicMetadata — TIDAK dari localStorage/client.
 * Gunakan SETELAH requireAuth.
 *
 * Usage: app.get("/api/portfolio", requireAuth, requirePaidPlan, handler)
 */
export async function requirePaidPlan(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const plan = await getEffectivePlan(userId);

    if (plan !== "pro" && plan !== "business") {
      return res.status(402).json({
        error: "This feature requires a Pro or Business plan.",
        upgrade_url: "https://altwallet.id/pricing",
      });
    }

    req.userPlan = plan;
    next();
  } catch (err) {
    console.error("[auth] requirePaidPlan error:", err);
    res.status(500).json({ error: "Could not verify subscription." });
  }
}

// ─── requireBusinessPlan ─────────────────────────────────────────────────────
/**
 * Hanya Business plan yang boleh akses.
 * Gunakan SETELAH requireAuth.
 */
export async function requireBusinessPlan(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const plan = await getEffectivePlan(userId);

    if (plan !== "business") {
      return res.status(402).json({
        error: "This feature requires a Business plan.",
        upgrade_url: "https://altwallet.id/pricing",
      });
    }

    req.userPlan = plan;
    next();
  } catch (err) {
    console.error("[auth] requireBusinessPlan error:", err);
    res.status(500).json({ error: "Could not verify subscription." });
  }
}

// ─── requireAdmin ─────────────────────────────────────────────────────────────
/**
 * Proteksi route admin — cek Clerk publicMetadata.role === 'admin'.
 * Set via Clerk dashboard: publicMetadata → { role: "admin" }
 * Gunakan SETELAH requireAuth.
 *
 * Usage: app.use("/api/admin", requireAuth, requireAdmin, adminRouter)
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const user = await clerkClient.users.getUser(userId);
    const role = user.publicMetadata?.role as string | undefined;

    if (role !== "admin") {
      console.warn(`[auth] Admin access denied for userId=${userId}`);
      return res.status(403).json({ error: "Forbidden." });
    }

    next();
  } catch (err) {
    console.error("[auth] requireAdmin error:", err);
    res.status(500).json({ error: "Authentication error." });
  }
}

// ─── getPlanFromClerk ─────────────────────────────────────────────────────────
/**
 * Helper untuk dapat plan user langsung dari Clerk (tanpa cek team membership).
 */
export async function getPlanFromClerk(userId: string): Promise<Plan> {
  try {
    const user = await clerkClient.users.getUser(userId);
    return (user.publicMetadata?.plan as Plan) ?? "free";
  } catch {
    return "free";
  }
}

// ─── getEffectivePlan ─────────────────────────────────────────────────────────
/**
 * Seperti getPlanFromClerk, tapi juga cek apakah user adalah team member
 * dari akun Business. Jika ya, return "business" meski plan sendiri "free".
 */
export async function getEffectivePlan(userId: string): Promise<Plan> {
  try {
    const user = await clerkClient.users.getUser(userId);
    const ownPlan = (user.publicMetadata?.plan as Plan) ?? "free";

    if (ownPlan === "business" || ownPlan === "pro") return ownPlan;

    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;
    if (!primaryEmail) return ownPlan;

    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sbUrl || !sbKey) return ownPlan;

    // Is this email invited to any Business account?
    const memberRes = await fetch(
      `${sbUrl}/rest/v1/team_members?member_email=eq.${encodeURIComponent(primaryEmail)}&select=owner_id&limit=1`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
    );
    if (!memberRes.ok) return ownPlan;
    const rows = (await memberRes.json()) as { owner_id: string }[];
    if (rows.length === 0) return ownPlan;

    const ownerPlan = await getPlanFromClerk(rows[0].owner_id);
    return ownerPlan === "business" ? "business" : ownPlan;
  } catch {
    return "free";
  }
}

export function isPaidPlan(plan: Plan): boolean {
  return plan === "pro" || plan === "business";
}