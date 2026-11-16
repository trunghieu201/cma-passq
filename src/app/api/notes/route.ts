import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/notes?questionId=...
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("questionId");

    if (questionId) {
      const note = await prisma.userNote.findUnique({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId,
          },
        },
      });

      return NextResponse.json({ note: note ? note.content : null });
    }

    // List all user notes
    const notes = await prisma.userNote.findMany({
      where: { userId: user.id },
      include: {
        question: {
          select: {
            id: true,
            stem: true,
            correctChoice: true,
            subunit: { select: { code: true, title: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error in GET /api/notes:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/notes
// Body: { questionId: string, content: string }
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { questionId, content } = body;

    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid questionId" },
        { status: 400 }
      );
    }

    const trimmedContent = typeof content === "string" ? content.trim() : "";

    if (!trimmedContent) {
      // If content is empty, delete existing note if any
      await prisma.userNote.deleteMany({
        where: {
          userId: user.id,
          questionId,
        },
      });

      return NextResponse.json({ success: true, note: null });
    }

    const note = await prisma.userNote.upsert({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId,
        },
      },
      create: {
        userId: user.id,
        questionId,
        content: trimmedContent,
      },
      update: {
        content: trimmedContent,
      },
    });

    return NextResponse.json({ success: true, note: note.content });
  } catch (error) {
    console.error("Error in POST /api/notes:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
