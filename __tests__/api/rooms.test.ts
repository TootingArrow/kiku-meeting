import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/rooms/route';
import fs from 'fs';
import { nanoid } from 'nanoid';

vi.mock('nanoid', () => ({
  nanoid: vi.fn(),
}));

import path from 'path';

describe('/api/rooms', () => {
  const ROOMS_FILE = path.join(process.cwd(), '.data', 'rooms.json');

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(nanoid).mockReset();
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('file not found');
    });
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a room and returns a roomId', async () => {
    vi.mocked(nanoid).mockReturnValue('abc123def4');

    const request = new Request('http://localhost/api/rooms', { method: 'POST' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.roomId).toBe('abc123def4');
    expect(nanoid).toHaveBeenCalledWith(10);
  });

  it('roomId is exactly 10 alphanumeric characters', async () => {
    vi.mocked(nanoid).mockReturnValue('a1b2c3d4e5');

    const request = new Request('http://localhost/api/rooms', { method: 'POST' });
    const response = await POST(request);
    const data = await response.json();

    expect(data.roomId).toMatch(/^[A-Za-z0-9_-]{10}$/);
    expect(data.roomId).toHaveLength(10);
  });

  it('avoids roomId collisions by checking existing rooms', async () => {
    // First call generates existing id, second call generates a new one
    vi.mocked(nanoid)
      .mockReturnValueOnce('duplicate1')
      .mockReturnValueOnce('unique12345');

    // Simulate existing room with 'duplicate1'
    vi.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (path === ROOMS_FILE) {
        return JSON.stringify([{ roomId: 'duplicate1', createdBy: 'anonymous', createdAt: 1 }]);
      }
      throw new Error('file not found');
    });

    const request = new Request('http://localhost/api/rooms', { method: 'POST' });
    const response = await POST(request);
    const data = await response.json();

    expect(data.roomId).not.toBe('duplicate1');
    expect(data.roomId).toBe('unique12345');
    expect(nanoid).toHaveBeenCalledTimes(2);
  });

  it('persists room to rooms.json', async () => {
    vi.mocked(nanoid).mockReturnValue('persist123');

    const request = new Request('http://localhost/api/rooms', { method: 'POST' });
    await POST(request);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      ROOMS_FILE,
      expect.stringContaining('persist123'),
      expect.objectContaining({ mode: 0o600 })
    );
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(ROOMS_FILE), { recursive: true });
  });

  it('appends new rooms to existing list', async () => {
    vi.mocked(nanoid).mockReturnValue('newroom123');
    vi.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (path === ROOMS_FILE) {
        return JSON.stringify([{ roomId: 'oldroom456', createdBy: 'alice', createdAt: 1000 }]);
      }
      throw new Error('file not found');
    });

    const request = new Request('http://localhost/api/rooms', { method: 'POST' });
    await POST(request);

    const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1] as string);

    expect(writtenData).toHaveLength(2);
    expect(writtenData[0].roomId).toBe('oldroom456');
    expect(writtenData[1].roomId).toBe('newroom123');
  });
});
