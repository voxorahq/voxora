"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MagneticCursor } from "@/components/ui/magnetic-cursor";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboards");
      } else {
        setError(data.message || "Invalid credentials.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MagneticCursor magneticFactor={0.3} cursorSize={28} blendMode="exclusion">
      <div style={{
        minHeight: "100vh",
        background: "var(--background)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "var(--font-sans)",
      }}>
      {/* Background glow */}
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(115,115,115,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "440px", position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <Image src="/logo.svg" alt="Voxora" width={28} height={28} />
            <span style={{ fontSize: "20px", fontWeight: 600, color: "var(--foreground)" }}>Voxora</span>
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "40px",
        }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)", margin: "0 0 32px" }}>
            Sign in to your Voxora dashboard
          </p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  color: "var(--foreground)",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "var(--font-sans)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--ring)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                  Password
                </label>
                <Link href="/forgot-password" style={{ fontSize: "12px", color: "var(--muted-foreground)", textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  color: "var(--foreground)",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "var(--font-sans)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--ring)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(255,100,103,0.08)",
                border: "1px solid rgba(255,100,103,0.25)",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "var(--destructive)",
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "var(--muted)" : "var(--foreground)",
                color: loading ? "var(--muted-foreground)" : "var(--background)",
                border: "none",
                borderRadius: "8px",
                padding: "13px 24px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
                fontFamily: "var(--font-sans)",
                letterSpacing: "0.01em",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p style={{
          textAlign: "center",
          marginTop: "24px",
          fontSize: "14px",
          color: "var(--muted-foreground)",
        }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "var(--foreground)", fontWeight: 500, textDecoration: "none" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
    </MagneticCursor>
  );
}
