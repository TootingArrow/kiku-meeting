export type TranscriptLine = {
  speaker: string;
  text: string;
  timestamp: number;
};

export type BulletPoint = {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
};

export type CallSummary = {
  title: string;
  date: string;
  duration: string;
  participants: string[];
  keyPoints: string[];
  decisions: string[];
  actionItems: { person: string; task: string }[];
  homework: { person: string; task: string }[];
};

export type DataChannelMessage =
  | { type: "transcript"; speaker: string; text: string; ts: number }
  | { type: "bullets"; bullets: BulletPoint[] }
  | { type: "chat"; sender: string; text: string; ts: number };
