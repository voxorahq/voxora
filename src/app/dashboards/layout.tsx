"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MagneticCursor } from "@/components/ui/magnetic-cursor";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboards" },
  { label: "Leads", href: "/dashboards/leads" },
  { label: "Analytics", href: "/dashboards/analytics" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [activeNav, setActiveNav] = useState("Dashboard");


  useEffect(() => {
    // Fix: use /api/auth/me (HTTP-only cookie) instead of localStorage
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          router.replace("/login");
        } else {
          setChecking(false);
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (checking) {
    return (
      <MagneticCursor magneticFactor={0.3} cursorSize={28} blendMode="exclusion">
        <div style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-sans)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "32px", height: "32px",
              border: "2px solid var(--border)",
              borderTop: "2px solid var(--foreground)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>Verifying session…</span>
          </div>
        </div>
      </MagneticCursor>
    );
  }

  return (
    <MagneticCursor magneticFactor={0.3} cursorSize={28} blendMode="exclusion">
      <div style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--background)",
        fontFamily: "var(--font-sans)",
      }}>
        {/* ── Sidebar ── */}
        <aside style={{
          width: "240px",
          flexShrink: 0,
          background: "var(--card)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px",
        }}>
          {/* Brand */}
          <Link href="/" style={{
            display: "flex", alignItems: "center", gap: "10px",
            textDecoration: "none", marginBottom: "40px",
          }}>
            <Image src="/logo.svg" alt="Voxora" width={22} height={22} />
            <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>Voxora</span>
            <span style={{
              marginLeft: "auto",
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--muted-foreground)",
              background: "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "2px 6px",
              letterSpacing: "0.05em",
            }}>ADMIN</span>
          </Link>

          {/* Nav links */}
          <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
            <p style={{
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em",
              color: "var(--muted-foreground)", textTransform: "uppercase",
              margin: "0 0 8px 8px",
            }}>Navigation</p>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setActiveNav(link.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: activeNav === link.label ? 600 : 400,
                  color: activeNav === link.label ? "var(--foreground)" : "var(--muted-foreground)",
                  background: activeNav === link.label ? "var(--muted)" : "transparent",
                  border: activeNav === link.label ? "1px solid var(--border)" : "1px solid transparent",
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <button
            id="dashboard-logout"
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--muted-foreground)",
              background: "transparent",
              border: "1px solid var(--border)",
              cursor: "pointer",
              transition: "all 0.15s",
              width: "100%",
              fontFamily: "var(--font-sans)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--destructive)";
              e.currentTarget.style.borderColor = "rgba(255,100,103,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted-foreground)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            ↩ Logout
          </button>
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflow: "auto" }}>
          {children}
        </main>
      </div>
    </MagneticCursor>
  );
}
