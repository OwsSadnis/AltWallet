/**
 * supabaseAdmin — lightweight Supabase REST helper using the service role key.
 * Uses native fetch instead of @supabase/supabase-js to keep the package list clean.
 * Bypasses RLS — use only in authenticated admin routes.
 * NEVER expose SUPABASE_SERVICE_ROLE_KEY via VITE_ prefix.
 */

function sbUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL");
  return url;
}

function sbHeaders(extra?: Record<string, string>): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

type SupabaseResponse<T> = { data: T | null; error: { message: string } | null; count?: number | null };

class QueryBuilder<T = Record<string, unknown>> {
  private table: string;
  private filters: string[] = [];
  private selectCols = "*";
  private wantCount = false;
  private orderClause = "";
  private limitVal?: number;
  private offsetVal?: number;

  constructor(table: string) {
    this.table = table;
  }

  select(cols: string, opts?: { count?: string; head?: boolean }): this {
    this.selectCols = cols;
    if (opts?.count === "exact") this.wantCount = true;
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push(`${col}=eq.${encodeURIComponent(String(val))}`);
    return this;
  }

  in(col: string, vals: unknown[]): this {
    this.filters.push(`${col}=in.(${vals.map((v) => encodeURIComponent(String(v))).join(",")})`);
    return this;
  }

  or(condition: string): this {
    this.filters.push(`or=(${condition})`);
    return this;
  }

  gt(col: string, val: unknown): this {
    this.filters.push(`${col}=gt.${encodeURIComponent(String(val))}`);
    return this;
  }

  lt(col: string, val: unknown): this {
    this.filters.push(`${col}=lt.${encodeURIComponent(String(val))}`);
    return this;
  }

  gte(col: string, val: unknown): this {
    this.filters.push(`${col}=gte.${encodeURIComponent(String(val))}`);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderClause = `${col}.${opts?.ascending ? "asc" : "desc"}`;
    return this;
  }

  range(from: number, to: number): this {
    this.limitVal = to - from + 1;
    this.offsetVal = from;
    return this;
  }

  limit(n: number): this {
    this.limitVal = n;
    return this;
  }

  private buildUrl(): string {
    const params = [...this.filters];
    if (this.selectCols !== "*") params.push(`select=${encodeURIComponent(this.selectCols)}`);
    if (this.orderClause) params.push(`order=${this.orderClause}`);
    if (this.limitVal !== undefined) params.push(`limit=${this.limitVal}`);
    if (this.offsetVal !== undefined) params.push(`offset=${this.offsetVal}`);
    const qs = params.join("&");
    return `${sbUrl()}/rest/v1/${this.table}${qs ? "?" + qs : ""}`;
  }

  async then(resolve: (val: SupabaseResponse<T[]>) => void): Promise<void> {
    try {
      const headers = sbHeaders(
        this.wantCount ? { Prefer: "count=exact" } : undefined
      );
      const res = await fetch(this.buildUrl(), { headers });
      let count: number | null = null;
      if (this.wantCount) {
        const cr = res.headers.get("content-range");
        if (cr) {
          const parts = cr.split("/");
          count = parts[1] ? parseInt(parts[1]) : null;
        }
      }
      if (!res.ok) {
        const text = await res.text();
        resolve({ data: null, error: { message: text }, count });
        return;
      }
      const data = (await res.json()) as T[];
      resolve({ data, error: null, count });
    } catch (err: any) {
      resolve({ data: null, error: { message: err?.message ?? "Unknown error" }, count: null });
    }
  }

  async single(): Promise<SupabaseResponse<T>> {
    const full = await new Promise<SupabaseResponse<T[]>>((res) => this.then(res));
    if (full.error) return { data: null, error: full.error };
    const arr = full.data ?? [];
    if (arr.length === 0) return { data: null, error: { message: "Row not found" } };
    return { data: arr[0] ?? null, error: null };
  }
}

class InsertBuilder<T = Record<string, unknown>> {
  private table: string;
  private payload: unknown;
  private wantSelect = false;
  private wantSingle = false;

  constructor(table: string, payload: unknown) {
    this.table = table;
    this.payload = payload;
  }

  select(): this { this.wantSelect = true; return this; }

  async single(): Promise<SupabaseResponse<T>> {
    try {
      const res = await fetch(`${sbUrl()}/rest/v1/${this.table}`, {
        method: "POST",
        headers: sbHeaders({ Prefer: "return=representation" }),
        body: JSON.stringify(this.payload),
      });
      if (!res.ok) {
        const text = await res.text();
        return { data: null, error: { message: text } };
      }
      const arr = (await res.json()) as T[];
      return { data: arr[0] ?? null, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err?.message ?? "Unknown error" } };
    }
  }

  // Allow awaiting without .single()
  then(resolve: (val: SupabaseResponse<T[]>) => void) {
    fetch(`${sbUrl()}/rest/v1/${this.table}`, {
      method: "POST",
      headers: sbHeaders({ Prefer: this.wantSelect ? "return=representation" : "return=minimal" }),
      body: JSON.stringify(this.payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          resolve({ data: null, error: { message: text } });
          return;
        }
        const data = this.wantSelect ? ((await res.json()) as T[]) : [];
        resolve({ data, error: null });
      })
      .catch((err) => resolve({ data: null, error: { message: err?.message ?? "Unknown error" } }));
  }
}

class UpdateBuilder<T = Record<string, unknown>> {
  private table: string;
  private payload: unknown;
  private filters: string[] = [];

  constructor(table: string, payload: unknown) {
    this.table = table;
    this.payload = payload;
  }

  eq(col: string, val: unknown): this {
    this.filters.push(`${col}=eq.${encodeURIComponent(String(val))}`);
    return this;
  }

  then(resolve: (val: SupabaseResponse<T[]>) => void) {
    const qs = this.filters.join("&");
    fetch(`${sbUrl()}/rest/v1/${this.table}${qs ? "?" + qs : ""}`, {
      method: "PATCH",
      headers: sbHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify(this.payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          resolve({ data: null, error: { message: text } });
          return;
        }
        resolve({ data: [], error: null });
      })
      .catch((err) => resolve({ data: null, error: { message: err?.message ?? "Unknown error" } }));
  }
}

export const supabaseAdmin = {
  from<T = Record<string, unknown>>(table: string) {
    return {
      select(cols = "*", opts?: { count?: string; head?: boolean }) {
        return new QueryBuilder<T>(table).select(cols, opts);
      },
      insert(payload: unknown) {
        return new InsertBuilder<T>(table, payload);
      },
      update(payload: unknown) {
        return new UpdateBuilder<T>(table, payload);
      },
    };
  },
};
