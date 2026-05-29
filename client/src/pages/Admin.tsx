import React, { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Redirect } from "wouter";
import {
  Search,
  Copy,
  Check,
  X,
  AlertTriangle,
  Send,
  Shield,
  Plus,
} from "lucide-react";
import { Card, Chip, Eyebrow, Button } from "@/components/aw/Primitives";
import { Reveal, CountUp } from "@/components/aw/motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "users" | "generator" | "history" | "usage" | "api" | "announcements";

interface UserProfile {
  clerk_user_id: string;
  display_name: string | null;
  email: string | null;
  plan: string;
  status: string;
  role: string;
  scan_count?: number;
  created_at: string;
}

interface TokenRecord {
  id: string;
  token: string;
  plan: string;
  mode: string | null;
  email: string | null;
  note: string | null;
  used: boolean;
  expires_at: string | null;
  created_at: string;
  computed_status: "used" | "unused" | "expired";
}

interface StatsData {
  total_users: number;
  total_scans: number;
  scans_today: number;
  active_paid_users: number;
  scan_volume_7days: { date: string; count: number }[];
}

interface ApiService {
  name: string;
  status: "ok" | "degraded" | "down";
  response_time_ms: number | null;
  http_status: number | null;
  error?: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  target: string;
  type: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface UserDetail {
  profile: UserProfile;
  recent_scans: {
    id: string;
    wallet_address: string;
    chain: string;
    risk_score: number;
    risk_label: string;
    created_at: string;
  }[];
  clerk_metadata: {
    email: string;
    banned: boolean;
    created_at: number;
    last_sign_in_at: number | null;
  } | null;
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

export default function Admin() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Shield className="w-5 h-5 animate-pulse" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (!isSignedIn) return <Redirect to="/sign-in" />;

  const role = user?.publicMetadata?.role as string | undefined;
  if (role !== "admin") return <Redirect to="/" />;

  return <AdminDashboard />;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function AdminDashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("users");

  const apiFetch = useCallback(
    async (path: string, opts?: RequestInit) => {
      const token = await getToken();
      return fetch(path, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...opts?.headers,
        },
      });
    },
    [getToken]
  );

  const adminEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const initials = adminEmail.slice(0, 2).toUpperCase() || "AD";

  const TABS: { id: Tab; label: string }[] = [
    { id: "users", label: "User Management" },
    { id: "generator", label: "Token Generator" },
    { id: "history", label: "Token History" },
    { id: "usage", label: "Usage Stats" },
    { id: "api", label: "API Monitor" },
    { id: "announcements", label: "Announcements" },
  ];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 28px 80px" }}>
      <Reveal>
        {/* Header */}
        <div style={{ marginBottom: 4 }}>
          <Eyebrow>AltWallet · Internal</Eyebrow>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              margin: "8px 0 0",
              color: "var(--fg)",
            }}
          >
            Admin Panel
          </h1>
          <p style={{ color: "var(--fg-tertiary)", fontSize: 14, margin: "6px 0 0" }}>
            Manage users, issue access tokens, and monitor platform health.
          </p>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 2,
            margin: "26px 0 28px",
            borderBottom: "1px solid #1e1e1e",
            overflowX: "auto",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                position: "relative",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "12px 14px",
                marginBottom: -1,
                color: activeTab === t.id ? "var(--fg)" : "#888",
                fontSize: 13.5,
                fontWeight: 500,
                borderBottom:
                  activeTab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                whiteSpace: "nowrap",
                transition: "color 150ms",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Reveal>

      {activeTab === "users" && <UsersTab apiFetch={apiFetch} />}
      {activeTab === "generator" && <TokenGeneratorTab apiFetch={apiFetch} />}
      {activeTab === "history" && <TokenHistoryTab apiFetch={apiFetch} />}
      {activeTab === "usage" && <UsageStatsTab apiFetch={apiFetch} />}
      {activeTab === "api" && <ApiMonitorTab apiFetch={apiFetch} />}
      {activeTab === "announcements" && <AnnouncementsTab apiFetch={apiFetch} />}
    </div>
  );
}

// ─── Tab 1: User Management ────────────────────────────────────────────────────

function UsersTab({ apiFetch }: { apiFetch: ApiFetch }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (planFilter) params.set("plan", planFilter);
      if (statusFilter) params.set("status", statusFilter);

      const r = await apiFetch(`/api/admin/users?${params}`);
      const d = await r.json();
      if (d.data) {
        setUsers(d.data);
        setTotal(d.pagination?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, search, planFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openUser = async (userId: string) => {
    setModalLoading(true);
    setSelectedUser(null);
    try {
      const r = await apiFetch(`/api/admin/users/${userId}`);
      const d = await r.json();
      setSelectedUser(d);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => setSelectedUser(null);

  return (
    <Reveal>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: "#0B0B0B",
            border: "1px solid #1e1e1e",
            borderRadius: 8,
            height: 38,
            padding: "0 12px",
            width: 280,
          }}
        >
          <Search style={{ width: 15, height: 15, color: "#5a5a5a", flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, or address"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
            }}
          />
        </div>
        <AdminSelect
          value={planFilter}
          onChange={(v) => { setPlanFilter(v); setPage(1); }}
          options={[
            { value: "", label: "All plans" },
            { value: "free", label: "Free" },
            { value: "pro", label: "Pro" },
            { value: "business", label: "Business" },
          ]}
        />
        <AdminSelect
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={[
            { value: "", label: "All status" },
            { value: "active", label: "Active" },
            { value: "banned", label: "Banned" },
          ]}
        />
        <div style={{ marginLeft: "auto", color: "#888", fontSize: 13 }}>
          <b style={{ color: "var(--fg)" }}>{users.length}</b> of {total.toLocaleString()} users
        </div>
      </div>

      {/* Table */}
      <Card style={{ overflow: "hidden" }}>
        <div style={{ width: "100%" }}>
          <TblHead cols="2.1fr 0.7fr 0.7fr 0.9fr 0.9fr 0.7fr">
            <div>User</div>
            <div>Plan</div>
            <div style={{ textAlign: "right" }}>Scans</div>
            <div>Joined</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Action</div>
          </TblHead>
          {loading ? (
            <div style={{ padding: "40px 22px", textAlign: "center", color: "#888", fontSize: 13 }}>Loading…</div>
          ) : users.length === 0 ? (
            <div style={{ padding: "40px 22px", textAlign: "center", color: "#888", fontSize: 13 }}>No users found.</div>
          ) : (
            users.map((u) => (
              <TblRow key={u.clerk_user_id} cols="2.1fr 0.7fr 0.7fr 0.9fr 0.9fr 0.7fr">
                <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <UserAvatar name={u.display_name || u.email || "?"} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.display_name || "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.email || "—"}
                    </div>
                  </div>
                </div>
                <div><PlanChip plan={u.plan} /></div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)" }}>
                  {u.scan_count ?? "—"}
                </div>
                <div style={{ color: "#888", fontSize: 12.5 }}>
                  {formatDate(u.created_at)}
                </div>
                <div>
                  <StatusDot active={u.status !== "banned"} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <button
                    onClick={() => openUser(u.clerk_user_id)}
                    style={{
                      height: 30,
                      padding: "0 13px",
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 500,
                      background: "#161616",
                      color: "var(--fg)",
                      border: "1px solid #1e1e1e",
                      cursor: "pointer",
                    }}
                  >
                    View
                  </button>
                </div>
              </TblRow>
            ))
          )}
        </div>
      </Card>

      {/* User Detail Modal */}
      {(selectedUser || modalLoading) && (
        <UserDetailModal
          detail={selectedUser}
          loading={modalLoading}
          onClose={closeModal}
          apiFetch={apiFetch}
          onUpdate={fetchUsers}
        />
      )}
    </Reveal>
  );
}

// ─── Tab 2: Token Generator ────────────────────────────────────────────────────

function TokenGeneratorTab({ apiFetch }: { apiFetch: ApiFetch }) {
  const [mode, setMode] = useState<"beta_tester" | "special_package">("beta_tester");
  const [plan, setPlan] = useState("pro");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [expiresDays, setExpiresDays] = useState(365);
  const [generating, setGenerating] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setError("");
    setGenerating(true);
    try {
      const r = await apiFetch("/api/admin/tokens/generate", {
        method: "POST",
        body: JSON.stringify({
          mode,
          plan,
          email: email.trim() || undefined,
          note: note.trim() || undefined,
          expires_days: expiresDays,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setLastToken(d.token.token);
        setEmail("");
        setNote("");
      } else {
        setError(d.error ?? "Failed to generate token");
      }
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  };

  const copyToken = () => {
    if (!lastToken) return;
    navigator.clipboard?.writeText(lastToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const EXPIRE_OPTIONS = [
    { value: 30, label: "30 days" },
    { value: 60, label: "60 days" },
    { value: 90, label: "90 days" },
    { value: 365, label: "1 year" },
    { value: 36500, label: "Lifetime" },
  ];

  return (
    <Reveal>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Generator form */}
        <Card style={{ flex: 1, minWidth: 440, padding: 24 }}>
          {/* Mode segmented control */}
          <div
            style={{
              display: "inline-flex",
              background: "#0B0B0B",
              border: "1px solid #1e1e1e",
              borderRadius: 9,
              padding: 3,
              gap: 3,
              marginBottom: 24,
            }}
          >
            {(["beta_tester", "special_package"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  background: mode === m ? "#161616" : "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "7px 16px",
                  borderRadius: 6,
                  color: mode === m ? "var(--fg)" : "#888",
                  fontSize: 13,
                  fontWeight: 500,
                  transition: "background 150ms, color 150ms",
                }}
              >
                {m === "beta_tester" ? "Beta Tester" : "Special Package"}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" }}>
            <div>
              <FormLabel>Recipient email</FormLabel>
              <InputText
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                mono
              />
            </div>
            <div>
              <FormLabel>Plan</FormLabel>
              <AdminSelect
                value={plan}
                onChange={setPlan}
                options={[
                  { value: "pro", label: "Pro" },
                  { value: "business", label: "Business" },
                ]}
                full
              />
            </div>
            <div>
              <FormLabel>Token duration</FormLabel>
              <AdminSelect
                value={String(expiresDays)}
                onChange={(v) => setExpiresDays(Number(v))}
                options={EXPIRE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                full
              />
            </div>
            <div>
              <FormLabel>Notes (internal)</FormLabel>
              <InputText
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Q2 beta cohort"
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24 }}>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={generate}
              disabled={generating}
            >
              {generating ? "Generating…" : "Generate token"}
            </Button>
            <span style={{ fontSize: 12.5, color: "#888" }}>
              Token will be emailed via Resend automatically.
            </span>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "#E5484D", marginTop: 10 }}>{error}</p>
          )}

          {lastToken && (
            <div
              style={{
                marginTop: 22,
                background: "#0B0B0B",
                border: "1px solid #1e1e1e",
                borderRadius: 8,
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#5a5a5a",
                    marginBottom: 6,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Last generated
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    color: "var(--accent)",
                    letterSpacing: "0.02em",
                    wordBreak: "break-all",
                  }}
                >
                  {lastToken}
                </div>
              </div>
              <button
                onClick={copyToken}
                style={{
                  height: 30,
                  padding: "0 13px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 500,
                  background: "#161616",
                  color: "var(--fg)",
                  border: "1px solid #1e1e1e",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </Card>

        {/* Info sidebar */}
        <Card style={{ width: 280, padding: 24 }}>
          <div style={{ marginBottom: 14 }}><Eyebrow>How it works</Eyebrow></div>
          <p style={{ fontSize: 13, color: "#a1a1a1", lineHeight: 1.6, margin: "0 0 16px" }}>
            Tokens grant a recipient elevated plan access without payment. Beta tester tokens
            are time-boxed; special packages can be lifetime.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: "#888" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Format</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg)", fontSize: 11 }}>
                ALTW-XXXXXXXX-XXXX-XXXX
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Single-use</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg)" }}>Yes</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Email optional</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg)" }}>Yes</span>
            </div>
          </div>
        </Card>
      </div>
    </Reveal>
  );
}

// ─── Tab 3: Token History ──────────────────────────────────────────────────────

function TokenHistoryTab({ apiFetch }: { apiFetch: ApiFetch }) {
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter) params.set("status", statusFilter);
      if (planFilter) params.set("plan", planFilter);
      const r = await apiFetch(`/api/admin/tokens?${params}`);
      const d = await r.json();
      if (d.data) {
        setTokens(d.data);
        setTotal(d.pagination?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [apiFetch, statusFilter, planFilter]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  return (
    <Reveal>
      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <AdminSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "", label: "All status" },
            { value: "used", label: "Used" },
            { value: "unused", label: "Unused" },
            { value: "expired", label: "Expired" },
          ]}
        />
        <AdminSelect
          value={planFilter}
          onChange={setPlanFilter}
          options={[
            { value: "", label: "All plans" },
            { value: "pro", label: "Pro" },
            { value: "business", label: "Business" },
          ]}
        />
        <div style={{ marginLeft: "auto", color: "#888", fontSize: 13 }}>
          <b style={{ color: "var(--fg)" }}>{total.toLocaleString()}</b> tokens
        </div>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div>
          <TblHead cols="1.6fr 1.5fr 0.7fr 0.9fr 0.9fr 0.8fr">
            <div>Token</div>
            <div>Recipient</div>
            <div>Plan</div>
            <div>Created</div>
            <div>Expires</div>
            <div>Status</div>
          </TblHead>
          {loading ? (
            <div style={{ padding: "40px 22px", textAlign: "center", color: "#888", fontSize: 13 }}>Loading…</div>
          ) : tokens.length === 0 ? (
            <div style={{ padding: "40px 22px", textAlign: "center", color: "#888", fontSize: 13 }}>No tokens found.</div>
          ) : (
            tokens.map((t) => (
              <TblRow key={t.id} cols="1.6fr 1.5fr 0.7fr 0.9fr 0.9fr 0.8fr">
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg)" }}>
                  {t.token}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#a1a1a1" }}>
                  {t.email || "—"}
                </div>
                <div><PlanChip plan={t.plan} /></div>
                <div style={{ color: "#888", fontSize: 12.5 }}>{formatDate(t.created_at)}</div>
                <div style={{ color: "#888", fontSize: 12.5 }}>
                  {t.expires_at ? formatDate(t.expires_at) : "Lifetime"}
                </div>
                <div><TokenStatusChip status={t.computed_status} /></div>
              </TblRow>
            ))
          )}
        </div>
      </Card>
    </Reveal>
  );
}

// ─── Tab 4: Usage Stats ────────────────────────────────────────────────────────

function UsageStatsTab({ apiFetch }: { apiFetch: ApiFetch }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} />;
  if (!data) return null;

  const maxVol = Math.max(...data.scan_volume_7days.map((d) => d.count), 1);

  return (
    <Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 20, alignItems: "start" }}>
        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          <StatCard label="Total users" value={data.total_users} />
          <StatCard label="Total scans" value={data.total_scans} />
          <StatCard label="Scans today" value={data.scans_today} />
          <StatCard label="Active Pro + Biz" value={data.active_paid_users} />
        </div>

        {/* 7-day chart */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>7-day scan volume</span>
            <span style={{ color: "#888", fontSize: 12, fontFamily: "var(--font-mono)" }}>
              {data.scan_volume_7days[0]?.date} – {data.scan_volume_7days[data.scan_volume_7days.length - 1]?.date}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 200, paddingTop: 8 }}>
            {data.scan_volume_7days.map((d) => {
              const pct = Math.round((d.count / maxVol) * 100);
              const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
              return (
                <div
                  key={d.date}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#a1a1a1" }}>
                    {d.count}
                  </div>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 44,
                      height: `${pct}%`,
                      minHeight: 4,
                      borderRadius: "6px 6px 2px 2px",
                      background: "rgba(29,158,117,0.16)",
                      borderTop: "2px solid var(--accent)",
                      transition: "height 500ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#888" }}>{dayLabel}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </Reveal>
  );
}

// ─── Tab 5: API Monitor ────────────────────────────────────────────────────────

function ApiMonitorTab({ apiFetch }: { apiFetch: ApiFetch }) {
  const [services, setServices] = useState<ApiService[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    apiFetch("/api/admin/api-health")
      .then((r) => r.json())
      .then((d) => {
        if (d.services) {
          setServices(d.services);
          setCheckedAt(d.checked_at);
        } else {
          setError(d.error ?? "Failed to load monitor data");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} />;

  return (
    <Reveal>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        {checkedAt && (
          <span style={{ fontSize: 12, color: "#888", fontFamily: "var(--font-mono)" }}>
            Checked {new Date(checkedAt).toLocaleTimeString()}
          </span>
        )}
        <Button variant="secondary" size="sm" onClick={refresh} style={{ marginLeft: "auto" }}>
          Refresh
        </Button>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div>
          <TblHead cols="1.4fr 1fr 1fr 1.2fr 0.7fr">
            <div>API name</div>
            <div>Status</div>
            <div>Response time</div>
            <div>HTTP</div>
            <div style={{ textAlign: "right" }}>Health</div>
          </TblHead>
          {services.map((svc) => (
            <TblRow key={svc.name} cols="1.4fr 1fr 1fr 1.2fr 0.7fr">
              <div style={{ fontWeight: 500, color: "var(--fg)", fontSize: 13 }}>{svc.name}</div>
              <div>
                <ApiStatusChip status={svc.status} />
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#a1a1a1" }}>
                {svc.response_time_ms !== null ? `${svc.response_time_ms} ms` : "—"}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#888" }}>
                {svc.http_status ?? (svc.error || "—")}
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background:
                      svc.status === "ok"
                        ? "var(--accent)"
                        : svc.status === "degraded"
                        ? "#F5A623"
                        : "#E5484D",
                  }}
                />
              </div>
            </TblRow>
          ))}
          {services.length === 0 && (
            <div style={{ padding: "40px 22px", textAlign: "center", color: "#888", fontSize: 13 }}>
              No data available.
            </div>
          )}
        </div>
      </Card>
    </Reveal>
  );
}

// ─── Tab 6: Announcements ─────────────────────────────────────────────────────

function AnnouncementsTab({ apiFetch }: { apiFetch: ApiFetch }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [annType, setAnnType] = useState("info");
  const [expiresAt, setExpiresAt] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/admin/announcements?limit=50");
      const d = await r.json();
      if (d.data) setAnnouncements(d.data);
      else setError(d.error ?? "Failed to load");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handlePost = async () => {
    setPostError("");
    if (!title.trim() || !message.trim()) return;
    setPosting(true);
    try {
      const r = await apiFetch("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          target,
          type: annType,
          expires_at: expiresAt || undefined,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setTitle("");
        setMessage("");
        setExpiresAt("");
        fetchAnnouncements();
      } else {
        setPostError(d.error ?? "Failed to post");
      }
    } finally {
      setPosting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    await apiFetch(`/api/admin/announcements/${id}/deactivate`, { method: "PATCH" });
    fetchAnnouncements();
  };

  return (
    <Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20, alignItems: "start" }}>
        {/* Compose */}
        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>
            Compose announcement
          </div>
          <p style={{ fontSize: 12.5, color: "#888", margin: "0 0 18px" }}>
            Published messages appear in the recipient's in-app inbox.
          </p>

          <div style={{ marginBottom: 14 }}>
            <FormLabel>Title</FormLabel>
            <InputText
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short, clear headline"
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <FormLabel>Message</FormLabel>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the announcement body"
              rows={4}
              style={{
                width: "100%",
                padding: "11px 12px",
                background: "#0B0B0B",
                border: "1px solid #1e1e1e",
                borderRadius: 8,
                color: "var(--fg)",
                fontFamily: "inherit",
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 160 }}>
              <FormLabel>Target</FormLabel>
              <AdminSelect
                value={target}
                onChange={setTarget}
                options={[
                  { value: "all", label: "All users" },
                  { value: "free", label: "Free" },
                  { value: "pro", label: "Pro" },
                  { value: "business", label: "Business" },
                ]}
                full
              />
            </div>
            <div style={{ width: 140 }}>
              <FormLabel>Type</FormLabel>
              <AdminSelect
                value={annType}
                onChange={setAnnType}
                options={[
                  { value: "info", label: "Info" },
                  { value: "success", label: "Success" },
                  { value: "warning", label: "Warning" },
                ]}
                full
              />
            </div>
            <Button
              variant="primary"
              size="md"
              icon={Send}
              onClick={handlePost}
              disabled={posting || !title.trim() || !message.trim()}
              style={{ marginLeft: "auto" }}
            >
              {posting ? "Posting…" : "Publish"}
            </Button>
          </div>

          {postError && (
            <p style={{ fontSize: 12, color: "#E5484D", marginTop: 10 }}>{postError}</p>
          )}
        </Card>

        {/* Recent announcements */}
        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 8 }}>
            Recent announcements
          </div>
          {loading ? (
            <TabLoading />
          ) : error ? (
            <TabError message={error} />
          ) : announcements.length === 0 ? (
            <p style={{ fontSize: 13, color: "#888", paddingTop: 8 }}>No announcements yet.</p>
          ) : (
            <div>
              {announcements.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    padding: "18px 0",
                    borderTop: i === 0 ? "none" : "1px solid #161616",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 7 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--fg)" }}>
                      {a.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontFamily: "var(--font-mono)",
                        background: "#161616",
                        color: "#a1a1a1",
                        border: "1px solid #1e1e1e",
                      }}
                    >
                      {a.target}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 12,
                        color: "#5a5a5a",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {formatDate(a.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13.5, color: "#a1a1a1", lineHeight: 1.55, maxWidth: 720, margin: "0 0 8px" }}>
                    {a.message}
                  </p>
                  {a.is_active && (
                    <button
                      onClick={() => handleDeactivate(a.id)}
                      style={{
                        height: 28,
                        padding: "0 12px",
                        borderRadius: 999,
                        fontSize: 12,
                        background: "#161616",
                        color: "#888",
                        border: "1px solid #1e1e1e",
                        cursor: "pointer",
                      }}
                    >
                      Deactivate
                    </button>
                  )}
                  {!a.is_active && (
                    <span style={{ fontSize: 12, color: "#5a5a5a" }}>Deactivated</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Reveal>
  );
}

// ─── User Detail Modal ─────────────────────────────────────────────────────────

function UserDetailModal({
  detail,
  loading,
  onClose,
  apiFetch,
  onUpdate,
}: {
  detail: UserDetail | null;
  loading: boolean;
  onClose: () => void;
  apiFetch: ApiFetch;
  onUpdate: () => void;
}) {
  const [newPlan, setNewPlan] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    if (detail?.profile?.plan) setNewPlan(detail.profile.plan);
    setConfirmEmail("");
    setPlanError("");
  }, [detail]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const savePlan = async () => {
    if (!detail) return;
    setSavingPlan(true);
    setPlanError("");
    try {
      const r = await apiFetch(`/api/admin/users/${detail.profile.clerk_user_id}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ plan: newPlan }),
      });
      const d = await r.json();
      if (d.success) onUpdate();
      else setPlanError(d.error ?? "Failed to update");
    } finally {
      setSavingPlan(false);
    }
  };

  const revokeAccess = async () => {
    if (!detail) return;
    setRevoking(true);
    try {
      await apiFetch(`/api/admin/users/${detail.profile.clerk_user_id}/access`, {
        method: "DELETE",
      });
      onUpdate();
      onClose();
    } finally {
      setRevoking(false);
    }
  };

  const email = detail?.clerk_metadata?.email || detail?.profile?.email || "";
  const confirmValid = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "56px 24px",
        overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: 16,
          animation: "aw-rise 150ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Modal head */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            padding: 24,
            borderBottom: "1px solid #1e1e1e",
          }}
        >
          {loading ? (
            <div style={{ color: "#888", fontSize: 13 }}>Loading…</div>
          ) : detail ? (
            <>
              <UserAvatar name={detail.profile.display_name || email} size={52} />
              <div>
                <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--fg)" }}>
                  {detail.profile.display_name || "—"}
                </div>
                <div style={{ fontSize: 13, color: "#888", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {email}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 9 }}>
                  <PlanChip plan={detail.profile.plan} />
                  <span style={{ color: "#5a5a5a", fontSize: 12 }}>·</span>
                  <span style={{ color: "#888", fontSize: 12.5 }}>
                    Joined {formatDate(detail.profile.created_at)}
                  </span>
                  <span style={{ color: "#5a5a5a", fontSize: 12 }}>·</span>
                  <span style={{ color: "#888", fontSize: 12.5 }}>
                    {detail.recent_scans.length} recent scans shown
                  </span>
                </div>
              </div>
            </>
          ) : null}
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "1px solid #1e1e1e",
              borderRadius: 8,
              width: 32,
              height: 32,
              color: "#888",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {detail && (
          <div style={{ padding: 24 }}>
            {/* Plan change */}
            <div style={{ marginBottom: 26 }}>
              <FormLabel>Change plan</FormLabel>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                <div style={{ flex: 1, maxWidth: 260 }}>
                  <AdminSelect
                    value={newPlan}
                    onChange={setNewPlan}
                    options={[
                      { value: "free", label: "Free" },
                      { value: "pro", label: "Pro" },
                      { value: "business", label: "Business" },
                    ]}
                    full
                  />
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={savePlan}
                  disabled={savingPlan || newPlan === detail.profile.plan}
                >
                  {savingPlan ? "Saving…" : "Save changes"}
                </Button>
              </div>
              {planError && (
                <p style={{ fontSize: 12, color: "#E5484D", marginTop: 6 }}>{planError}</p>
              )}
            </div>

            {/* Recent scans */}
            <div style={{ marginBottom: 26 }}>
              <FormLabel style={{ marginBottom: 10 }}>Recent scans</FormLabel>
              <Card style={{ overflow: "hidden" }}>
                <TblHead cols="1.6fr 0.6fr 0.9fr 1fr">
                  <div>Address</div>
                  <div>Chain</div>
                  <div>Score</div>
                  <div>Date</div>
                </TblHead>
                {detail.recent_scans.length === 0 ? (
                  <div style={{ padding: "20px 22px", color: "#888", fontSize: 13 }}>No scans.</div>
                ) : (
                  detail.recent_scans.map((s) => {
                    const label = s.risk_label?.toLowerCase() || "";
                    const tone = label === "safe" || label === "low"
                      ? "safe"
                      : label === "medium" || label === "med"
                      ? "medium"
                      : "high";
                    return (
                      <TblRow key={s.id} cols="1.6fr 0.6fr 0.9fr 1fr">
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#a1a1a1" }}>
                          {s.wallet_address.slice(0, 6)}…{s.wallet_address.slice(-4)}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", color: "#a1a1a1", fontSize: 12.5 }}>
                          {s.chain?.toUpperCase()}
                        </div>
                        <div>
                          <Chip tone={tone} dot>{s.risk_label?.toUpperCase() || String(s.risk_score)}</Chip>
                        </div>
                        <div style={{ color: "#888", fontSize: 12.5 }}>{formatDate(s.created_at)}</div>
                      </TblRow>
                    );
                  })
                )}
              </Card>
            </div>

            {/* Danger zone */}
            <div
              style={{
                border: "1px solid rgba(229,72,77,0.4)",
                background: "rgba(229,72,77,0.07)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div
                style={{
                  color: "#E5484D",
                  fontWeight: 600,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <AlertTriangle style={{ width: 16, height: 16 }} />
                Danger zone
              </div>
              <p style={{ fontSize: 12.5, color: "#a1a1a1", lineHeight: 1.5, marginBottom: 16 }}>
                Revoking access immediately signs this user out and disables their plan. This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                <input
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Type user email to confirm"
                  style={{
                    flex: 1,
                    height: 38,
                    padding: "0 12px",
                    background: "#0B0B0B",
                    border: "1px solid rgba(229,72,77,0.3)",
                    borderRadius: 8,
                    color: "var(--fg)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <button
                  onClick={revokeAccess}
                  disabled={!confirmValid || revoking}
                  style={{
                    height: 38,
                    padding: "0 16px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    background: confirmValid ? "#E5484D" : "#2A1314",
                    color: confirmValid ? "#1A0809" : "#7a4042",
                    border: "none",
                    cursor: confirmValid ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap",
                  }}
                >
                  {revoking ? "Revoking…" : "Revoke access"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

type ApiFetch = (path: string, opts?: RequestInit) => Promise<Response>;

function TblHead({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: 14,
        padding: "13px 22px",
        fontSize: 10.5,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#5a5a5a",
        fontWeight: 500,
        background: "#0B0B0B",
        borderBottom: "1px solid #1e1e1e",
      }}
    >
      {children}
    </div>
  );
}

function TblRow({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: 14,
        padding: "13px 22px",
        fontSize: 13,
        borderTop: "1px solid #161616",
        transition: "background 150ms",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#161616"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
    >
      {children}
    </div>
  );
}

function UserAvatar({ name, size = 34 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: "#161616",
        border: "1px solid #1e1e1e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size > 40 ? 17 : 12,
        fontWeight: 600,
        color: "#a1a1a1",
      }}
    >
      {initials || "?"}
    </div>
  );
}

function PlanChip({ plan }: { plan: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    free:     { bg: "#1A1A1A", color: "#a1a1a1", border: "#262626" },
    pro:      { bg: "rgba(29,158,117,0.10)", color: "var(--accent)", border: "rgba(29,158,117,0.30)" },
    business: { bg: "rgba(29,158,117,0.16)", color: "#2fc792", border: "rgba(29,158,117,0.5)" },
  };
  const s = styles[plan?.toLowerCase()] ?? styles.free;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 9px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "var(--font-mono)",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {plan?.toUpperCase() || "FREE"}
    </span>
  );
}

function TokenStatusChip({ status }: { status: "used" | "unused" | "expired" }) {
  const cfg = {
    used:    { color: "var(--accent)", bg: "rgba(29,158,117,0.10)", dot: "var(--accent)" },
    unused:  { color: "#a1a1a1", bg: "#1A1A1A", dot: "#5a5a5a" },
    expired: { color: "#E5484D", bg: "rgba(229,72,77,0.10)", dot: "#E5484D" },
  }[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 22,
        padding: "0 9px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "var(--font-mono)",
        background: cfg.bg,
        color: cfg.color,
        border: "1px solid #262626",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ApiStatusChip({ status }: { status: "ok" | "degraded" | "down" }) {
  const cfg = {
    ok:       { label: "Operational", color: "var(--accent)", bg: "rgba(29,158,117,0.10)", dot: "var(--accent)" },
    degraded: { label: "Degraded",    color: "#F5A623",        bg: "rgba(245,166,35,0.10)", dot: "#F5A623" },
    down:     { label: "Down",        color: "#E5484D",        bg: "rgba(229,72,77,0.10)",  dot: "#E5484D" },
  }[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 22,
        padding: "0 9px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "var(--font-mono)",
        background: cfg.bg,
        color: cfg.color,
        border: "1px solid #262626",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: active ? "var(--accent)" : "#5a5a5a",
        }}
      />
      <span style={{ color: active ? "#a1a1a1" : "#888" }}>{active ? "Active" : "Banned"}</span>
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1e1e1e",
        borderRadius: 12,
        padding: 22,
      }}
    >
      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>{label}</div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 38,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: "var(--fg)",
        }}
      >
        <CountUp to={value} />
      </div>
    </div>
  );
}

function AdminSelect({
  value,
  onChange,
  options,
  full,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  full?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        background: "#0B0B0B",
        border: "1px solid #1e1e1e",
        borderRadius: 8,
        height: 38,
        width: full ? "100%" : undefined,
      }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          background: "none",
          border: "none",
          outline: "none",
          color: "#a1a1a1",
          fontFamily: "inherit",
          fontSize: 13,
          height: "100%",
          padding: "0 32px 0 12px",
          cursor: "pointer",
          width: full ? "100%" : undefined,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          width: 7,
          height: 7,
          pointerEvents: "none",
          borderRight: "1.5px solid #5a5a5a",
          borderBottom: "1.5px solid #5a5a5a",
          transform: "translateY(-65%) rotate(45deg)",
        }}
      />
    </div>
  );
}

function InputText({
  mono,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        height: 38,
        padding: "0 12px",
        background: "#0B0B0B",
        border: "1px solid #1e1e1e",
        borderRadius: 8,
        color: "var(--fg)",
        fontFamily: mono ? "var(--font-mono)" : "inherit",
        fontSize: 13,
        outline: "none",
        ...(props.style || {}),
      }}
    />
  );
}

function FormLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 500,
        color: "#888",
        marginBottom: 7,
        ...style,
      }}
    >
      {children}
    </label>
  );
}

function TabLoading() {
  return (
    <div style={{ padding: "48px 0", textAlign: "center", color: "#888", fontSize: 13 }}>
      Loading…
    </div>
  );
}

function TabError({ message }: { message: string }) {
  return (
    <div style={{ padding: "48px 0", textAlign: "center", color: "#E5484D", fontSize: 13 }}>
      {message}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
