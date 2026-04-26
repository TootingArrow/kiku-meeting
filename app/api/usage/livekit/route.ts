import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!url || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "LiveKit not fully configured" }, { status: 500 });
    }

    // LiveKit self-hosted does not expose a simple remaining-credits endpoint.
    // For LiveKit Cloud you would call their server API with the project API key.
    // We return the server URL so the user knows which instance is active.
    return NextResponse.json({
      provider: "LiveKit",
      serverUrl: url,
      note: "LiveKit self-hosted does not expose a remaining-credits endpoint. Monitor usage via your server dashboard.",
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch LiveKit usage" }, { status: 500 });
  }
}
