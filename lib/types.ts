export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  keywords: string[];
}

export interface CalendarEventParams {
  transcript: string;
  sentiment: string;
}

export interface AnalyzeVoiceResponse {
  success: boolean;
  eventLink?: string;
  sentiment?: string;
  error?: string;
}

export type RecordingState = 'idle' | 'recording' | 'processing' | 'success' | 'error';
