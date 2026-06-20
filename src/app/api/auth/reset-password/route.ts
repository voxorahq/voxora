import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { RegisterSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// Zod schema for validation
const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function POST(req: Request) {
  try {
    // Rate limit: 5 attempts per 10 minutes per IP
    const limiter = rateLimit(req, { limit: 5, windowMs: 10 * 60 * 1000 });
    if (!limiter.success) {
      return NextResponse.json(
        { message: `Too many attempts. Please try again in ${limiter.reset} seconds.` },
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

    // Validate inputs
    const validation = ResetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    await connectDB();

    // Find user with valid and unexpired token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired password reset token" },
        { status: 400 }
      );
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Optional: Send Slack alert about password change for security visibility
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `⚠️ *Security Alert*\nPassword was successfully reset for user: *${user.email}*`,
          }),
        });
      } catch (slackErr: any) {
        console.error("Failed to send security alert to Slack:", slackErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Password has been successfully updated.",
    });
  } catch (err: any) {
    console.error("Reset password API error:", err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
