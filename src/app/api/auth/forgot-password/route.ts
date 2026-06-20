import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limit: 3 requests per 10 minutes per IP
    const limiter = rateLimit(req, { limit: 3, windowMs: 10 * 60 * 1000 });
    if (!limiter.success) {
      return NextResponse.json(
        { message: `Too many password reset attempts. Please try again in ${limiter.reset} seconds.` },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.reset),
          },
        }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { email } = body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { message: "Valid email address is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Secure response: Do not leak whether the email exists
    const successResponse = NextResponse.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });

    if (!user) {
      return successResponse;
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save to user
    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await user.save();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://voxora.ai";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Log to console for developer access
    console.log("\n==================================================");
    console.log(`🔑 PASSWORD RESET REQUESTED FOR: ${email}`);
    console.log(`URL: ${resetUrl}`);
    console.log("==================================================\n");

    // Push to Slack Webhook for easy local retrieval
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🔑 *Password Reset Link Generated*\n*Email:* ${email}\n*Reset Link:* <${resetUrl}|Click here to reset password>`,
          }),
        });
      } catch (slackErr: any) {
        console.error("Failed to send reset link to Slack:", slackErr.message);
      }
    }

    return successResponse;
  } catch (err: any) {
    console.error("Forgot password API error:", err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
