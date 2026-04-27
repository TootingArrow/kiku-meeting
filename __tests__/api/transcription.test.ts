import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/transcription/route';
import { getGroqClient } from '@/lib/groq';

vi.mock('@/lib/groq', () => ({
  getGroqClient: vi.fn(),
}));

function createMockRequest(formData: FormData): Request {
  return {
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request;
}

describe('/api/transcription', () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockCreate = vi.fn();
    vi.mocked(getGroqClient).mockReturnValue({
      audio: {
        transcriptions: {
          create: mockCreate,
        },
      },
    } as any);
  });

  function createFormData(audio?: File, speaker?: string) {
    const formData = new FormData();
    if (audio) formData.append('audio', audio);
    if (speaker !== undefined) formData.append('speaker', speaker);
    return formData;
  }

  it('returns 400 when audio is missing', async () => {
    const formData = createFormData(undefined, 'Alice');
    const request = createMockRequest(formData);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('audio and speaker required');
  });

  it('returns 400 when speaker is missing', async () => {
    const audio = new File(['fake-audio'], 'audio.webm', { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audio);
    // do not append speaker at all
    const request = createMockRequest(formData);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('audio and speaker required');
  });

  it('returns null text for empty audio transcription', async () => {
    mockCreate.mockResolvedValue({
      text: '   ',
      avg_logprob: -0.5,
    });

    const audio = new File(['fake-audio'], 'audio.webm', { type: 'audio/webm' });
    const formData = createFormData(audio, 'Alice');
    const request = createMockRequest(formData);

    const response = await POST(request);
    const data = await response.json();

    expect(data.text).toBeNull();
  });

  it('returns null text when avg_logprob is below -1.0', async () => {
    mockCreate.mockResolvedValue({
      text: 'some garbled text',
      avg_logprob: -1.5,
    });

    const audio = new File(['fake-audio'], 'audio.webm', { type: 'audio/webm' });
    const formData = createFormData(audio, 'Alice');
    const request = createMockRequest(formData);

    const response = await POST(request);
    const data = await response.json();

    expect(data.text).toBeNull();
  });

  it('returns transcription text on success', async () => {
    mockCreate.mockResolvedValue({
      text: 'Hello world',
      avg_logprob: -0.2,
    });

    const audio = new File(['fake-audio'], 'audio.webm', { type: 'audio/webm' });
    const formData = createFormData(audio, 'Alice');
    const request = createMockRequest(formData);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.text).toBe('Hello world');
  });

  it('returns 500 when Groq throws an error', async () => {
    mockCreate.mockRejectedValue(new Error('Groq API error'));

    const audio = new File(['fake-audio'], 'audio.webm', { type: 'audio/webm' });
    const formData = createFormData(audio, 'Alice');
    const request = createMockRequest(formData);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Groq API error');
  });

  it('calls Groq with correct parameters', async () => {
    mockCreate.mockResolvedValue({
      text: 'Hello',
      avg_logprob: -0.1,
    });

    const audio = new File(['fake-audio'], 'audio.webm', { type: 'audio/webm' });
    const formData = createFormData(audio, 'Alice');
    const request = createMockRequest(formData);

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'whisper-large-v3-turbo',
        response_format: 'verbose_json',
      })
    );
    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.file).toBeInstanceOf(File);
    expect(callArg.file.name).toBe('audio.webm');
    expect(callArg.file.type).toBe('audio/webm');
  });
});
