import { connectDB } from "@/lib/mongodb";
import Contact from "@/models/Contact";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const contact = await Contact.create(body);
    return Response.json({
      success: true,
      contact,
    });
  } catch (error: any) {
    console.error("Error creating contact:", error);
    return Response.json(
      {
        success: false,
        message: error.message || "Failed to save contact data.",
      },
      { status: 500 }
    );
  }
}
