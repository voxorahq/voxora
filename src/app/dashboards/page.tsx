"use client";

import { useEffect, useState, useCallback } from "react";

interface Contact {
  _id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
  createdAt: string;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function getWeekBounds(offsetWeeks: number) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDayLabel(d: Date) {
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

// ─── CSV export ──────────────────────────────────────────────────────────────

function exportCSV(contacts: Contact[], weekLabel: string) {
  const header = ["Name", "Email", "Company", "Phone", "Message", "Date"];
  const rows = contacts.map((c) => [
    c.name ?? "",
    c.email ?? "",
    c.company ?? "",
    c.phone ?? "",
    (c.message ?? "").replace(/,/g, ";"),
    formatDateFull(c.createdAt),
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `voxora-leads-${weekLabel.replace(/\s/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      height: "150px",
      paddingTop: "24px",
      gap: "12px",
    }}>
      {data.map((d) => {
        const barHeightPct = (d.count / max) * 100;
        return (
          <div
            key={d.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              position: "relative",
            }}
          >
            {/* Bar Track & Fill Container */}
            <div style={{
              width: "100%",
              maxWidth: "32px",
              height: "140px",
              position: "relative",
              background: "var(--muted)",
              borderRadius: "6px",
              display: "flex",
              alignItems: "flex-end",
            }}>
              {/* Count Label */}
              {d.count > 0 && (
                <span style={{
                  position: "absolute",
                  bottom: `calc(${barHeightPct}% + 6px)`,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--foreground)",
                  fontFamily: "var(--font-sans)",
                  whiteSpace: "nowrap",
                }}>
                  {d.count}
                </span>
              )}

              {/* Bar Fill */}
              {d.count > 0 && (
                <div style={{
                  width: "100%",
                  height: `${barHeightPct}%`,
                  background: "var(--foreground)",
                  opacity: 0.85,
                  borderRadius: "6px",
                }} />
              )}
            </div>

            {/* Day Label */}
            <span style={{
              marginTop: "8px",
              fontSize: "11px",
              color: "var(--muted-foreground)",
              fontFamily: "var(--font-sans)",
            }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { dir: "up" | "down" | "neutral"; pct: number };
}) {
  const trendColor =
    trend?.dir === "up"
      ? "#4ade80"
      : trend?.dir === "down"
        ? "var(--destructive)"
        : "var(--muted-foreground)";
  const trendIcon =
    trend?.dir === "up" ? "▲" : trend?.dir === "down" ? "▼" : "—";

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "24px",
        flex: "1",
        minWidth: "0",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "var(--muted-foreground)",
          textTransform: "uppercase",
          margin: "0 0 12px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "40px",
          fontWeight: 700,
          color: "var(--foreground)",
          margin: "0 0 6px",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {trend && (
          <span style={{ fontSize: "12px", fontWeight: 600, color: trendColor }}>
            {trendIcon} {trend.pct}%
          </span>
        )}
        {sub && (
          <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard/contacts", { credentials: "include" });
        const data = await res.json();
        setAllContacts(data.contacts ?? []);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const { start, end } = getWeekBounds(weekOffset);
  const prevWeek = getWeekBounds(weekOffset - 1);

  const thisWeekLeads = allContacts.filter((c) => {
    const d = new Date(c.createdAt);
    return d >= start && d <= end;
  });

  const lastWeekLeads = allContacts.filter((c) => {
    const d = new Date(c.createdAt);
    return d >= prevWeek.start && d <= prevWeek.end;
  });

  // Trend
  const thisCount = thisWeekLeads.length;
  const lastCount = lastWeekLeads.length;
  let trendDir: "up" | "down" | "neutral" = "neutral";
  let trendPct = 0;
  if (lastCount > 0) {
    trendPct = Math.round(((thisCount - lastCount) / lastCount) * 100);
    trendDir = trendPct > 0 ? "up" : trendPct < 0 ? "down" : "neutral";
  } else if (thisCount > 0) {
    trendPct = 100;
    trendDir = "up";
  }

  // Bar chart: Mon–Sun
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const count = thisWeekLeads.filter((c) => {
      const d = new Date(c.createdAt);
      return (
        d.getDate() === day.getDate() &&
        d.getMonth() === day.getMonth() &&
        d.getFullYear() === day.getFullYear()
      );
    }).length;
    return { label: getDayLabel(day), count };
  });

  const weekLabel = `${formatDateShort(start)} – ${formatDateShort(end)}`;
  const isCurrentWeek = weekOffset === 0;

  return (
    <div style={{ padding: "40px 40px 80px", maxWidth: "1100px" }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "40px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted-foreground)",
              margin: "0 0 6px",
            }}
          >
            Weekly Report
          </p>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "var(--foreground)",
              margin: 0,
            }}
          >
            {isCurrentWeek ? "This Week" : weekLabel}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            {isCurrentWeek ? weekLabel : `Week of ${weekLabel}`}
          </p>
        </div>

        {/* Week navigator */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            style={{
              background: "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              color: "var(--foreground)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--muted)")}
          >
            ← Prev
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "13px",
                color: "var(--muted-foreground)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Today
            </button>
          )}
          <button
            onClick={() => setWeekOffset((o) => Math.min(o + 1, 0))}
            disabled={isCurrentWeek}
            style={{
              background: "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              color: isCurrentWeek ? "var(--muted-foreground)" : "var(--foreground)",
              cursor: isCurrentWeek ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans)",
              opacity: isCurrentWeek ? 0.4 : 1,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isCurrentWeek) e.currentTarget.style.background = "var(--accent)";
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--muted)")}
          >
            Next →
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap" }}>
        <StatCard
          label="This Week"
          value={loading ? "—" : thisCount}
          trend={loading ? undefined : { dir: trendDir, pct: Math.abs(trendPct) }}
          sub="vs last week"
        />
        <StatCard
          label="Last Week"
          value={loading ? "—" : lastCount}
          sub="leads captured"
        />
        <StatCard
          label="All Time"
          value={loading ? "—" : allContacts.length}
          sub="total leads"
        />
      </div>

      {/* ── Bar chart ── */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "28px 28px 20px",
          marginBottom: "24px",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--foreground)",
            margin: "0 0 44px",
          }}
        >
          Daily Activity
        </p>
        {loading ? (
          <div style={{ height: "148px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Loading…</span>
          </div>
        ) : (
          <BarChart data={chartData} />
        )}
      </div>

      {/* ── This week's leads ── */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", margin: "0 0 2px" }}>
              {isCurrentWeek ? "This Week's Leads" : "Week's Leads"}
            </h2>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0 }}>
              {loading ? "Loading…" : `${thisCount} contact${thisCount !== 1 ? "s" : ""}`}
            </p>
          </div>
          {thisCount > 0 && (
            <button
              onClick={() => exportCSV(thisWeekLeads, weekLabel)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "7px 14px",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--foreground)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "background 0.15s, border-color 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--muted)";
                e.currentTarget.style.borderColor = "var(--ring)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              ↓ Export CSV
            </button>
          )}
        </div>

        {/* Leads list */}
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted-foreground)", fontSize: "13px" }}>
            Loading leads…
          </div>
        ) : thisWeekLeads.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--foreground)", margin: "0 0 6px" }}>
              No leads this week
            </p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0 }}>
              {isCurrentWeek
                ? "New leads will appear here as they come in."
                : "No leads were captured during this week."}
            </p>
          </div>
        ) : (
          <div>
            {thisWeekLeads.map((c, i) => (
              <div
                key={c._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "14px 24px",
                  borderBottom: i < thisWeekLeads.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--foreground)",
                    flexShrink: 0,
                  }}
                >
                  {(c.name || c.email || "?")[0].toUpperCase()}
                </div>

                {/* Name + email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.name || "Unknown"}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.email}
                  </p>
                </div>

                {/* Company */}
                {c.company && (
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--muted-foreground)",
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    padding: "3px 8px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>
                    {c.company}
                  </span>
                )}

                {/* Date */}
                <span style={{
                  fontSize: "11px",
                  color: "var(--muted-foreground)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  marginLeft: "auto",
                  paddingLeft: "16px",
                }}>
                  {formatDateFull(c.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
