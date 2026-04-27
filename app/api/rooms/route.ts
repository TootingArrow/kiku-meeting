import { NextResponse } from "next/server";
import { createRoom } from "@/lib/rooms";

export async function POST() {
  try {
    const roomId = createRoom("anonymous");
    return NextResponse.json({ roomId });
  } catch (error) {
    console.error("Room creation error:", error);
    const message = error instanceof Error ? error.message : "Failed to create room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
