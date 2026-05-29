// Types matching the exact shape returned by /api/dashboard/* endpoints

export interface DashboardStats {
  total_scans: number;
  flagged_count: number;
  chains_used: string[];
  scans_today: number;
  scans_this_month: number;
  daily_limit: number; // 3 | 50 | 200
}

export interface RecentScan {
  id: string;
  address: string;
  chain: string;
  risk_score: number | null;
  label: string | null;
  scanned_at: string; // ISO timestamp
}

export interface RecentScansResponse {
  scans: RecentScan[];
}

export interface TeamSeat {
  id: string;
  member_email: string;
  member_id: string | null;
  status: "pending" | "active" | "removed";
  invited_at: string;
  joined_at: string | null;
}

export interface TeamResponse {
  team: TeamSeat[];
}

export interface InviteResponse {
  seat: Pick<TeamSeat, "id" | "member_email" | "status" | "invited_at">;
}

export interface RemoveTeamResponse {
  success: boolean;
  removed_id: string;
}

export interface ApiError {
  error: string;
}
