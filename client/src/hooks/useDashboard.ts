// React hooks for consuming /api/dashboard/* endpoints
// Uses useAuth from @clerk/clerk-react to attach Bearer token automatically

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import type {
  DashboardStats,
  RecentScan,
  TeamSeat,
} from "../types/dashboard";

const API_BASE = "/api/dashboard";

// ─── Helper: fetch with Clerk auth token ─────────────────────────────────────
function useAuthFetch() {
  const { getToken } = useAuth();

  return useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = await getToken();
      return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers ?? {}),
        },
      });
    },
    [getToken]
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// useDashboardStats — GET /api/dashboard/stats
// ═══════════════════════════════════════════════════════════════════════════════
export function useDashboardStats() {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/stats");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to load stats");
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useRecentScans — GET /api/dashboard/recent-scans
// ═══════════════════════════════════════════════════════════════════════════════
export function useRecentScans() {
  const authFetch = useAuthFetch();
  const [scans, setScans] = useState<RecentScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/recent-scans");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to load recent scans");
      }
      const json = await res.json();
      setScans(json.scans ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { scans, loading, error, refetch };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useExportCSV — GET /api/dashboard/export/csv (triggers file download)
// ═══════════════════════════════════════════════════════════════════════════════
export function useExportCSV() {
  const authFetch = useAuthFetch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportCSV = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/export/csv");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to export");
      }
      // Trigger browser download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      a.download = filenameMatch?.[1] ?? "altwallet-scans.csv";
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  return { exportCSV, loading, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useTeam — GET /api/dashboard/team + invite + remove
// ═══════════════════════════════════════════════════════════════════════════════
export function useTeam() {
  const authFetch = useAuthFetch();
  const [team, setTeam] = useState<TeamSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/team");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to load team");
      }
      const json = await res.json();
      setTeam(json.team ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const inviteMember = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await authFetch("/team/invite", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        if (!res.ok) return { success: false, error: json.error };
        await refetch();
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    [authFetch, refetch]
  );

  const removeMember = useCallback(
    async (memberId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await authFetch(`/team/${memberId}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) return { success: false, error: json.error };
        await refetch();
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
    [authFetch, refetch]
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { team, loading, error, refetch, inviteMember, removeMember };
}
