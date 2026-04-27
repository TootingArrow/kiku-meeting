import { NextResponse } from "next/server";
import { generateLiveKitToken } from "@/lib/livekit";

export async function POST(request: Request) {
  let body: { roomId?: unknown; name?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roomId, name } = body;

  if (!roomId || typeof roomId !== "string" || roomId.trim().length === 0) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  if (roomId.length > 128) {
    return NextResponse.json({ error: "roomId too long" }, { status: 400 });
  }

  const safeName = typeof name === "string" ? name.trim().slice(0, 100) : "anonymous";

  try {
    const token = await generateLiveKitToken(roomId.trim(), {
      identity: safeName,
      name: safeName || "Anonymous",
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("LiveKit token error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
