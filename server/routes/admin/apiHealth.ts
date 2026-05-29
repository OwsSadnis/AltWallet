import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/requireAdmin.js";

const router = Router();
router.use(requireAdmin);

interface ApiHealthResult {
  name: string;
  status: "ok" | "degraded" | "down";
  response_time_ms: number | null;
  http_status: number | null;
  error?: string;
}

async function pingApi(
  name: string,
  url: string,
  timeoutMs = 8000
): Promise<ApiHealthResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "AltWallet-HealthCheck/1.0" },
    });
    clearTimeout(timer);
    const elapsed = Date.now() - start;

    return {
      name,
      status: response.ok ? "ok" : "degraded",
      response_time_ms: elapsed,
      http_status: response.status,
    };
  } catch (err: any) {
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    const isTimeout = err?.name === "AbortError";

    return {
      name,
      status: "down",
      response_time_ms: isTimeout ? timeoutMs : elapsed,
      http_status: null,
      error: isTimeout ? "Request timed out" : (err?.message ?? "Unknown error"),
    };
  }
}

/**
 * GET /api/admin/api-health
 * Live ping all external APIs used by AltWallet
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const checks = await Promise.all([
    pingApi("GoPlus", "https://api.gopluslabs.io/api/v1/supported_chains"),
    pingApi(
      "Etherscan",
      "https://api.etherscan.io/api?module=stats&action=ethsupply&apikey=" +
        (process.env.ETHERSCAN_API_KEY ?? "YourApiKeyToken")
    ),
    pingApi(
      "Helius",
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY ?? "placeholder"}`
    ),
    pingApi("Tronscan", "https://apilist.tronscanapi.com/api/system/status"),
    pingApi("CoinMarketCap", "https://pro-api.coinmarketcap.com/v1/key/info"),
  ]);

  // CMC 401 = reachable (auth required, not down)
  const cmcCheck = checks.find((c) => c.name === "CoinMarketCap");
  if (cmcCheck && cmcCheck.http_status === 401) {
    cmcCheck.status = "ok";
    delete cmcCheck.error;
  }

  const allOk = checks.every((c) => c.status === "ok");
  const anyDown = checks.some((c) => c.status === "down");

  res.json({
    overall: allOk ? "ok" : anyDown ? "degraded" : "degraded",
    checked_at: new Date().toISOString(),
    services: checks,
  });
});

export default router;
