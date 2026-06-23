import { connectDB } from "@/lib/mongodb";
import Contact from "@/models/Contact";
import { ContactSchema as ContactZodSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { sendLeadNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    // 🛡️ RATE LIMITING: 5 contact requests per 1 minute
    const limiter = rateLimit(req, { limit: 5, windowMs: 60 * 1000 });
    if (!limiter.success) {
      return Response.json(
        { success: false, message: `Too many submissions. Please try again in ${limiter.reset} seconds.` },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.reset),
          },
        }
      );
    }

    await connectDB();

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    // ✅ VALIDATION WITH ZOD
    const validation = ContactZodSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { success: false, message: validation.error.issues[0].message, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, company, phone, message } = validation.data;

    const contact = await Contact.create({
      name,
      email,
      company,
      phone,
      message,
    });

    // Fire lead notification in background (non-blocking)
    sendLeadNotification({ name, email, company, phone, message }).catch((err) => {
      console.error("💥 Failed to send background Slack notification:", err);
    });

    return Response.json({
      success: true,
      contact,
    });
  } catch (error: any) {
    console.error("Error creating contact:", error);
    return Response.json(
      {
        success: false,
        message: "Failed to save contact data.",
      },
      { status: 500 }
    );
  }
}