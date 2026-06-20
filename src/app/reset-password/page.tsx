"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MagneticCursor } from "@/components/ui/magnetic-cursor";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing password recovery token.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.message || "Failed to reset password. The link may have expired.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
          Choose new password
        </h1>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)", margin: "0 0 32px" }}>
          Please enter your new password below.
        </p>

        {!token ? (
          <div style={{
            background: "rgba(255,100,103,0.08)",
            border: "1px solid rgba(255,100,103,0.25)",
            borderRadius: "8px",
            padding: "14px",
            fontSize: "13px",
            color: "var(--destructive)",
            textAlign: "center",
          }}>
            Missing or invalid reset token. Please request a new password reset link.
          </div>
        ) : (
          <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* New Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                New Password
              </label>
              <input
                id="reset-password-input"
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

            {/* Confirm Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                Confirm New Password
              </label>
              <input
                id="reset-confirm-password-input"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            {success && (
              <div style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "#22c55e",
              }}>
                Password successfully updated! Redirecting to login page…
              </div>
            )}

            {/* Submit */}
            <button
              id="reset-submit"
              type="submit"
              disabled={loading || success}
              style={{
                background: loading || success ? "var(--muted)" : "var(--foreground)",
                color: loading || success ? "var(--muted-foreground)" : "var(--background)",
                border: "none",
                borderRadius: "8px",
                padding: "13px 24px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading || success ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
                fontFamily: "var(--font-sans)",
                letterSpacing: "0.01em",
              }}
            >
              {loading ? "Updating password…" : "Reset Password"}
            </button>
          </form>
        )}
      </div>

      {/* Footer link */}
      <p style={{
        textAlign: "center",
        marginTop: "24px",
        fontSize: "14px",
        color: "var(--muted-foreground)",
      }}>
        Back to{" "}
        <Link href="/login" style={{ color: "var(--foreground)", fontWeight: 500, textDecoration: "none" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPassword() {
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
        <Suspense fallback={
          <div style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
            Loading password reset form…
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </MagneticCursor>
  );
}
