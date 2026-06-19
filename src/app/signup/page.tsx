"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MagneticCursor } from "@/components/ui/magnetic-cursor";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      // Register
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) {
        setError(regData.message || "Registration failed.");
        return;
      }

      // Auto-login
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (loginData.success) {
        router.push("/dashboards");
      } else {
        router.push("/login");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--muted)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "12px 16px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    fontFamily: "var(--font-sans)",
    width: "100%",
    boxSizing: "border-box",
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
            Create your account
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)", margin: "0 0 32px" }}>
            Start deploying AI voice agents today
          </p>

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                Full name
              </label>
              <input
                id="signup-name"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--ring)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                Work email
              </label>
              <input
                id="signup-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--ring)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
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
              id="signup-submit"
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
              {loading ? "Creating account…" : "Create account"}
            </button>

            <p style={{ textAlign: "center", fontSize: "12px", color: "var(--muted-foreground)", margin: 0 }}>
              By signing up you agree to our{" "}
              <Link href="/terms" style={{ color: "var(--foreground)", textDecoration: "none" }}>Terms</Link>
              {" & "}
              <Link href="/privacy" style={{ color: "var(--foreground)", textDecoration: "none" }}>Privacy Policy</Link>
            </p>
          </form>
        </div>

        {/* Footer link */}
        <p style={{
          textAlign: "center",
          marginTop: "24px",
          fontSize: "14px",
          color: "var(--muted-foreground)",
        }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--foreground)", fontWeight: 500, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
    </MagneticCursor>
  );
}
