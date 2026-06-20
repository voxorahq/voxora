"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MagneticCursor } from "@/components/ui/magnetic-cursor";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Email address is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || "A recovery link has been generated and logged.");
      } else {
        setError(data.message || "Something went wrong. Please check your email and try again.");
      }
    } catch {
      setError("Network error. Please try again.");
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
              Reset Password
            </h1>
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", margin: "0 0 32px" }}>
              Enter your email and we will send you a password recovery link.
            </p>

            <form onSubmit={handleRequestReset} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                  Email Address
                </label>
                <input
                  id="forgot-email"
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

              {/* Error Info */}
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

              {/* Success Info */}
              {message && (
                <div style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#22c55e",
                }}>
                  {message}
                </div>
              )}

              {/* Submit */}
              <button
                id="forgot-submit"
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
                {loading ? "Sending link…" : "Send Reset Link"}
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
            Remember your password?{" "}
            <Link href="/login" style={{ color: "var(--foreground)", fontWeight: 500, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </MagneticCursor>
  );
}
