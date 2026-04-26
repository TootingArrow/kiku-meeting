import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import type { TranscriptLine, CallSummary } from "@/types";

export async function POST(request: Request) {
  try {
    const { transcript, participants, duration }: {
      transcript: TranscriptLine[];
      participants: string[];
      duration: string;
    } = await request.json();

    const formattedTranscript = transcript
      .map((line) => {
        const minutes = Math.floor(line.timestamp / 60000)
          .toString()
          .padStart(2, "0");
        const seconds = Math.floor((line.timestamp % 60000) / 1000)
          .toString()
          .padStart(2, "0");
        return `[${minutes}:${seconds}] ${line.speaker}: ${line.text}`;
      })
      .join("\n");

    const completion = await getGroqClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a meeting summarizer. Given a full transcript, produce a structured summary.

Return ONLY valid JSON with no preamble or markdown fences:
{
  "title": "short descriptive title for this meeting",
  "keyPoints": ["point 1", "point 2"],
  "decisions": ["decision 1"],
  "actionItems": [{ "person": "name", "task": "what they need to do" }],
  "homework": [{ "person": "name", "task": "what they need to prepare or study" }]
}

Rules:
- keyPoints: 3 to 7 most important things discussed
- decisions: anything explicitly agreed upon
- actionItems: specific tasks someone committed to
- homework: studying, reading, or preparation assigned to someone
- If a category has nothing, return an empty array
- Be specific and concrete, not vague`,
        },
        {
          role: "user",
          content: formattedTranscript,
        },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content || "";

    let parsed: Partial<CallSummary>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({
        title: "Summary unavailable",
        date: new Date().toISOString().split("T")[0],
        duration,
        participants,
        keyPoints: [],
        decisions: [],
        actionItems: [],
        homework: [],
      } as CallSummary);
    }

    const summary: CallSummary = {
      title: parsed.title || "Meeting Summary",
      date: new Date().toISOString().split("T")[0],
      duration,
      participants,
      keyPoints: parsed.keyPoints || [],
      decisions: parsed.decisions || [],
      actionItems: parsed.actionItems || [],
      homework: parsed.homework || [],
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Summary error:", error);
    return NextResponse.json({
      title: "Summary unavailable",
      date: new Date().toISOString().split("T")[0],
      duration: "",
      participants: [],
      keyPoints: [],
      decisions: [],
      actionItems: [],
      homework: [],
    } as CallSummary);
  }
}
