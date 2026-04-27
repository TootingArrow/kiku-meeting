import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";

const MAX_AUDIO_SIZE_MB = 25;
const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3"];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;
    const speaker = formData.get("speaker") as string | null;

    if (!audio || !speaker) {
      return NextResponse.json(
        { error: "audio and speaker required" },
        { status: 400 }
      );
    }

    if (typeof speaker !== "string" || speaker.trim().length === 0 || speaker.length > 100) {
      return NextResponse.json(
        { error: "Invalid speaker name" },
        { status: 400 }
      );
    }

    if (!ALLOWED_AUDIO_TYPES.includes(audio.type)) {
      return NextResponse.json(
        { error: `Unsupported audio type: ${audio.type}` },
        { status: 400 }
      );
    }

    if (audio.size > MAX_AUDIO_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Audio file too large. Max ${MAX_AUDIO_SIZE_MB}MB.` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await audio.arrayBuffer());

    const transcription = await getGroqClient().audio.transcriptions.create({
      file: new File([buffer], "audio.webm", { type: audio.type }),
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json",
    });

    const text = (transcription as unknown as { text?: string }).text?.trim();
    const avgLogprob = (transcription as unknown as { avg_logprob?: number }).avg_logprob;

    if (!text || text.length === 0 || (avgLogprob !== undefined && avgLogprob < -1.0)) {
      return NextResponse.json({ text: null });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Transcription error:", error);
    const message = error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
