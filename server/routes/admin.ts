/**
 * Admin router — mounted at /api/admin in server/index.ts
 * Delegates to sub-routers; all routes are protected by requireAdmin internally.
 *
 * /api/admin/users          → users router
 * /api/admin/tokens         → tokens router (GET list + POST /generate)
 * /api/admin/stats          → stats router
 * /api/admin/api-health     → apiHealth router
 * /api/admin/announcements  → announcements router
 */

import { Router } from "express";
import usersRouter from "./admin/users.js";
import tokensRouter from "./admin/tokens.js";
import statsRouter from "./admin/stats.js";
import apiHealthRouter from "./admin/apiHealth.js";
import announcementsRouter from "./admin/announcements.js";

const _adminRouter = Router();

_adminRouter.use("/users", usersRouter);
_adminRouter.use("/tokens", tokensRouter);
_adminRouter.use("/stats", statsRouter);
_adminRouter.use("/api-health", apiHealthRouter);
_adminRouter.use("/announcements", announcementsRouter);

export { _adminRouter as adminRouter };
