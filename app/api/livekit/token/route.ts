import { NextResponse } from "next/server";
import { generateLiveKitToken } from "@/lib/livekit";

export async function POST(request: Request) {
  const { roomId, name }: { roomId?: string; name?: string } = await request.json();

  if (!roomId || typeof roomId !== "string") {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  try {
    const token = await generateLiveKitToken(roomId, {
      identity: name || "anonymous",
      name: name || "Anonymous",
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
