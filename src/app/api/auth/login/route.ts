import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { LoginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // 🛡️ RATE LIMITING: 5 login requests per 1 minute
    const limiter = rateLimit(req, { limit: 5, windowMs: 60 * 1000 });
    if (!limiter.success) {
      return NextResponse.json(
        { message: `Too many login attempts. Please try again in ${limiter.reset} seconds.` },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.reset),
          },
        }
      );
    }

    await connectDB();

    // ✅ SAFE JSON PARSE
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    // ✅ VALIDATION WITH ZOD
    const validation = LoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = validation.data;

    // ✅ FIND USER
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 400 }
      );
    }

    // ✅ CHECK PASSWORD
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 400 }
      );
    }

    // ✅ CREATE TOKEN
    const token = signToken({ userId: user._id });

    // ✅ RETURN RESPONSE + SET COOKIE (CORRECT WAY)
    const res = NextResponse.json({ success: true });

    const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;

    res.cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: cookieMaxAge,
    });

    return res;
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
