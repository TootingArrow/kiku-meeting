import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";

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

    const buffer = Buffer.from(await audio.arrayBuffer());

    const transcription = await getGroqClient().audio.transcriptions.create({
      file: new File([buffer], "audio.webm", { type: "audio/webm" }),
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json",
    });

    const text = (transcription as unknown as { text?: string }).text?.trim();
    const avgLogprob = (transcription as unknown as { avg_logprob?: number }).avg_logprob;

    if (!text || text.length === 0 || (avgLogprob !== undefined && avgLogprob < -1.0)) {
      return NextResponse.json({ text: null });
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ text: null });
  }
}
