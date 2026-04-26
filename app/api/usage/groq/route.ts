import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No API key configured" }, { status: 500 });
    }

    // Groq doesn't have a direct remaining-credits API.
    // We can infer some info from the account/rate-limit headers by making a tiny request.
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const rateLimit = res.headers.get("x-ratelimit-limit-requests") || "N/A";
    const rateRemaining = res.headers.get("x-ratelimit-remaining-requests") || "N/A";
    const rateReset = res.headers.get("x-ratelimit-reset-requests") || "N/A";

    return NextResponse.json({
      provider: "Groq",
      rateLimitRequests: rateLimit,
      rateLimitRemaining: rateRemaining,
      rateLimitReset: rateReset,
      note: "Groq does not expose a remaining-credits endpoint. Showing rate-limit info instead.",
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch Groq usage" }, { status: 500 });
  }
}
