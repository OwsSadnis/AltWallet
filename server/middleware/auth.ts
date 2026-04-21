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

    const user = await clerkClient.users.getUser(userId);
    const plan = (user.publicMetadata?.plan as Plan) ?? "free";

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

    const user = await clerkClient.users.getUser(userId);
    const plan = (user.publicMetadata?.plan as Plan) ?? "free";

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
 * Proteksi route admin — validasi email dari Clerk, bukan dari client.
 * ADMIN_EMAIL harus di-set di environment variable, bukan hardcode di kode.
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

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.error("[auth] ADMIN_EMAIL env var not set!");
      return res.status(500).json({ error: "Server misconfiguration." });
    }

    const user = await clerkClient.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail || primaryEmail.toLowerCase() !== adminEmail.toLowerCase()) {
      // Log attempt tapi jangan kasih info ke attacker
      console.warn(
        `[auth] Admin access denied for userId=${userId} email=${primaryEmail}`
      );
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
 * Helper untuk dapat plan user langsung dari Clerk.
 * Bisa dipanggil dari handler manapun yang butuh plan info.
 */
export async function getPlanFromClerk(userId: string): Promise<Plan> {
  try {
    const user = await clerkClient.users.getUser(userId);
    return (user.publicMetadata?.plan as Plan) ?? "free";
  } catch {
    return "free"; // default ke free jika gagal
  }
}

export function isPaidPlan(plan: Plan): boolean {
  return plan === "pro" || plan === "business";
}