import { AccessToken } from "livekit-server-sdk";
import { nanoid } from "nanoid";

export async function generateLiveKitToken(
  roomId: string,
  user: { identity: string; name?: string | null }
): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit credentials not configured");
  }

  // Ensure unique identity by appending a short random suffix
  const uniqueIdentity = `${user.identity}-${nanoid(4)}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: uniqueIdentity,
    name: user.name || user.identity,
    ttl: 4 * 60 * 60, // 4 hours
  });

  at.addGrant({ roomJoin: true, room: roomId });

  return await at.toJwt();
}
