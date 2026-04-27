import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/summary/route';

const mockChatCompletionsCreate = vi.fn();

vi.mock('@/lib/groq', () => ({
  getGroqClient: vi.fn(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockChatCompletionsCreate(...args),
      },
    },
  })),
}));

describe('/api/summary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockChatCompletionsCreate.mockReset();
  });

  it('handles empty transcript gracefully', async () => {
    const request = new Request('http://localhost/api/summary', {
      method: 'POST',
      body: JSON.stringify({
        transcript: [],
        participants: ['Alice', 'Bob'],
        duration: '00:05:00',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Summary unavailable');
    expect(data.keyPoints).toEqual([]);
    expect(data.participants).toEqual(['Alice', 'Bob']);
    expect(data.duration).toBe('00:05:00');
    expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
  });

  it('handles malformed JSON response from LLM', async () => {
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'this is not json { broken',
          },
        },
      ],
    });

    const request = new Request('http://localhost/api/summary', {
      method: 'POST',
      body: JSON.stringify({
        transcript: [{ speaker: 'Alice', text: 'Hello', timestamp: 0 }],
        participants: ['Alice'],
        duration: '00:01:00',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Summary unavailable');
    expect(data.keyPoints).toEqual([]);
    expect(data.decisions).toEqual([]);
    expect(data.actionItems).toEqual([]);
    expect(data.homework).toEqual([]);
    expect(data.participants).toEqual(['Alice']);
    expect(data.duration).toBe('00:01:00');
  });

  it('fills missing fields with defaults when LLM omits them', async () => {
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: 'Partial Summary',
              // keyPoints, decisions, actionItems, homework are missing
            }),
          },
        },
      ],
    });

    const request = new Request('http://localhost/api/summary', {
      method: 'POST',
      body: JSON.stringify({
        transcript: [{ speaker: 'Alice', text: 'Hello', timestamp: 0 }],
        participants: ['Alice'],
        duration: '00:01:00',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Partial Summary');
    expect(data.keyPoints).toEqual([]);
    expect(data.decisions).toEqual([]);
    expect(data.actionItems).toEqual([]);
    expect(data.homework).toEqual([]);
  });

  it('handles Groq API errors with fallback summary preserving request context', async () => {
    mockChatCompletionsCreate.mockRejectedValue(new Error('Groq rate limited'));

    const request = new Request('http://localhost/api/summary', {
      method: 'POST',
      body: JSON.stringify({
        transcript: [{ speaker: 'Alice', text: 'Hello', timestamp: 0 }],
        participants: ['Alice'],
        duration: '00:01:00',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Summary unavailable');
    expect(data.duration).toBe('00:01:00');
    expect(data.participants).toEqual(['Alice']);
  });

  it('formats transcript with timestamps correctly', async () => {
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: 'Test Meeting',
              keyPoints: ['Point 1'],
              decisions: [],
              actionItems: [],
              homework: [],
            }),
          },
        },
      ],
    });

    const request = new Request('http://localhost/api/summary', {
      method: 'POST',
      body: JSON.stringify({
        transcript: [
          { speaker: 'Alice', text: 'Hello', timestamp: 65000 },
          { speaker: 'Bob', text: 'Hi there', timestamp: 125000 },
        ],
        participants: ['Alice', 'Bob'],
        duration: '00:02:05',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(request);

    const callArgs = mockChatCompletionsCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
    expect(userMessage.content).toContain('[01:05] Alice: Hello');
    expect(userMessage.content).toContain('[02:05] Bob: Hi there');
  });
});
