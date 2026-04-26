import { NextResponse } from "next/server";
import { createRoom } from "@/lib/rooms";

export async function POST() {
  const roomId = createRoom("anonymous");
  return NextResponse.json({ roomId });
}
