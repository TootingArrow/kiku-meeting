import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getGroqUsage } from '@/app/api/usage/groq/route';
import { GET as getLivekitUsage } from '@/app/api/usage/livekit/route';

describe('/api/usage/groq', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GROQ_API_KEY;
  });

  it('returns 500 when GROQ_API_KEY is missing', async () => {
    const request = new Request('http://localhost/api/usage/groq');
    const response = await getGroqUsage(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('No API key configured');
  });

  it('returns rate limit info when API key is present', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    global.fetch = vi.fn().mockResolvedValue({
      headers: {
        get: vi.fn((name: string) => {
          if (name === 'x-ratelimit-limit-requests') return '100';
          if (name === 'x-ratelimit-remaining-requests') return '95';
          if (name === 'x-ratelimit-reset-requests') return '3600';
          return null;
        }),
      },
    }) as unknown as typeof fetch;

    const request = new Request('http://localhost/api/usage/groq');
    const response = await getGroqUsage(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.provider).toBe('Groq');
    expect(data.rateLimitRequests).toBe('100');
    expect(data.rateLimitRemaining).toBe('95');
    expect(data.rateLimitReset).toBe('3600');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-groq-key' },
      })
    );
  });

  it('returns N/A for missing rate limit headers', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    global.fetch = vi.fn().mockResolvedValue({
      headers: {
        get: vi.fn(() => null),
      },
    }) as unknown as typeof fetch;

    const request = new Request('http://localhost/api/usage/groq');
    const response = await getGroqUsage(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rateLimitRequests).toBe('N/A');
    expect(data.rateLimitRemaining).toBe('N/A');
    expect(data.rateLimitReset).toBe('N/A');
  });
});

describe('/api/usage/livekit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
  });

  it('returns 500 when any LiveKit env var is missing', async () => {
    process.env.NEXT_PUBLIC_LIVEKIT_URL = 'wss://livekit.example.com';
    // Missing API key and secret

    const request = new Request('http://localhost/api/usage/livekit');
    const response = await getLivekitUsage(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('LiveKit not fully configured');
  });

  it('returns server info when all env vars are present', async () => {
    process.env.NEXT_PUBLIC_LIVEKIT_URL = 'wss://livekit.example.com';
    process.env.LIVEKIT_API_KEY = 'key';
    process.env.LIVEKIT_API_SECRET = 'secret';

    const request = new Request('http://localhost/api/usage/livekit');
    const response = await getLivekitUsage(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.provider).toBe('LiveKit');
    expect(data.serverUrl).toBe('wss://livekit.example.com');
    expect(data.note).toContain('self-hosted');
  });
});
