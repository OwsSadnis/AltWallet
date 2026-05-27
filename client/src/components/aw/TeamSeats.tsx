import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Card, Chip, Eyebrow, Button } from "@/components/aw/Primitives";
import { UserMinus, UserPlus, Lock } from "lucide-react";
import { useLocation } from "wouter";

interface TeamMember {
  id: string;
  member_email: string;
  invited_at: string;
  joined_at: string | null;
}

interface TeamData {
  members: TeamMember[];
  seats_used: number;
  seats_max: number;
}

export function TeamSeats({ plan }: { plan: string }) {
  const { getToken } = useAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const r = await fetch("/api/team/members", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (r.ok) {
        const d = await r.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (plan === "business") fetchMembers();
  }, [plan, fetchMembers]);

  if (plan !== "business") {
    return (
      <Card hover>
        <div className="aw-card-head">
          <Eyebrow>Team Seats</Eyebrow>
          <Chip tone="neutral">Business only</Chip>
        </div>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Lock className="w-8 h-8 text-[color:var(--fg-tertiary)]" />
          <p className="text-[13px] text-[color:var(--fg-secondary)]">
            Team seats are available on the Business plan.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate("/pricing")}>
            Upgrade to Business
          </Button>
        </div>
      </Card>
    );
  }

  const handleInvite = async () => {
    setInviteError("");
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const token = await getToken();
      const r = await fetch("/api/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const d = await r.json();
      if (!d.success) {
        setInviteError(d.error ?? "Invite failed.");
      } else {
        setInviteEmail("");
        fetchMembers();
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    const token = await getToken();
    await fetch(`/api/team/members/${memberId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    fetchMembers();
  };

  return (
    <Card hover>
      <div className="aw-card-head">
        <Eyebrow>Team Seats</Eyebrow>
        {data && (
          <span className="aw-meta">
            {data.seats_used} / {data.seats_max} seats used
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <div className="aw-input flex-1">
          <UserPlus className="aw-input-icon" />
          <input
            type="email"
            placeholder="Invite by email…"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleInvite}
          disabled={inviteLoading || !inviteEmail.trim()}
        >
          {inviteLoading ? "Inviting…" : "Invite"}
        </Button>
      </div>

      {inviteError && (
        <p className="text-[12px] mb-3" style={{ color: "#E53E3E" }}>
          {inviteError}
        </p>
      )}

      {loading ? (
        <p className="text-[13px] text-[color:var(--fg-tertiary)] py-4">Loading…</p>
      ) : data && data.members.length > 0 ? (
        <div className="flex flex-col">
          {data.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between py-3 border-t"
              style={{ borderColor: "#1a1a1a" }}
            >
              <div>
                <div className="text-[13px] text-white">{m.member_email}</div>
                <div className="text-[11px] text-[color:var(--fg-tertiary)]">
                  Invited{" "}
                  {new Date(m.invited_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {m.joined_at && " · Joined"}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={UserMinus}
                onClick={() => handleRemove(m.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-[color:var(--fg-tertiary)] py-2">
          No team members yet.
        </p>
      )}
    </Card>
  );
}
