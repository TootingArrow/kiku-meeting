import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/livekit/token/route';
import { AccessToken } from 'livekit-server-sdk';

vi.mock('livekit-server-sdk', () => ({
  AccessToken: vi.fn().mockImplementation(function () {
    return {
      addGrant: vi.fn(),
      toJwt: vi.fn().mockResolvedValue('mock-jwt-token'),
    };
  }),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('abcd'),
}));

describe('/api/livekit/token', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.LIVEKIT_API_KEY = 'test-key';
    process.env.LIVEKIT_API_SECRET = 'test-secret';
  });

  it('returns 400 when roomId is missing', async () => {
    const request = new Request('http://localhost/api/livekit/token', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('roomId required');
  });

  it('returns 400 when roomId is not a string', async () => {
    const request = new Request('http://localhost/api/livekit/token', {
      method: 'POST',
      body: JSON.stringify({ roomId: 123, name: 'Alice' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('roomId required');
  });

  it('returns 400 for malformed JSON body', async () => {
    const request = new Request('http://localhost/api/livekit/token', {
      method: 'POST',
      body: 'not-valid-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON body');
  });

  it('returns 500 when LiveKit env vars are missing', async () => {
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;

    const request = new Request('http://localhost/api/livekit/token', {
      method: 'POST',
      body: JSON.stringify({ roomId: 'room-1', name: 'Alice' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to generate token');
  });

  it('returns a token on successful generation', async () => {
    const request = new Request('http://localhost/api/livekit/token', {
      method: 'POST',
      body: JSON.stringify({ roomId: 'room-1', name: 'Alice' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBe('mock-jwt-token');
    expect(AccessToken).toHaveBeenCalledWith(
      'test-key',
      'test-secret',
      expect.objectContaining({
        identity: expect.stringContaining('Alice-'),
        name: 'Alice',
        ttl: 4 * 60 * 60,
      })
    );
  });

  it('falls back to anonymous when name is missing', async () => {
    const request = new Request('http://localhost/api/livekit/token', {
      method: 'POST',
      body: JSON.stringify({ roomId: 'room-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBe('mock-jwt-token');
  });
});
