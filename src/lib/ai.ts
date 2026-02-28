export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIExtracted {
  project_type: 'brand' | 'web' | 'motion' | 'graphic' | 'other';
  budget_signal: 'low' | 'mid' | 'high' | 'enterprise';
  urgency: 'immediate' | 'soon' | 'flexible';
  sentiment: 'excited' | 'neutral' | 'frustrated' | 'exploratory';
  summary: string;
}

interface AnalyzeResult {
  reply: string;
  extracted: AIExtracted | null;
}

const SYSTEM_PROMPT = `You are Tool's intake assistant — a friendly, concise creative consultancy AI for tool.nyc. Your job is to understand what the prospective client needs and extract project details.

Be conversational but efficient. Ask one clarifying question at a time. Keep replies under 2 sentences.

After the user's FIRST message, include a JSON block with your best extraction of their intent. Update it on subsequent messages if new info emerges. Format:

---EXTRACTED---
{"project_type":"brand|web|motion|graphic|other","budget_signal":"low|mid|high|enterprise","urgency":"immediate|soon|flexible","sentiment":"excited|neutral|frustrated|exploratory","summary":"one sentence summary"}
---END---

If you can't determine a field, use your best guess based on context. Always include the JSON block after every response.`;

/**
 * Transcribe audio via OpenAI Whisper API (gpt-4o-mini-transcribe).
 * Max 5MB enforced by caller.
 */
export async function transcribeAudio(audioBuffer: ArrayBuffer, apiKey: string): Promise<string> {
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');
  formData.append('model', 'gpt-4o-mini-transcribe');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper API error ${response.status}: ${err}`);
  }

  const result = await response.json() as { text: string };
  return result.text;
}

/**
 * Run conversation through OpenAI gpt-4o-mini and extract intent.
 * Uses the same OPENAI_API_KEY as Whisper — no Workers AI binding needed.
 */
export async function analyzeIntent(
  messages: ChatMessage[],
  apiKey: string,
): Promise<AnalyzeResult> {
  const aiMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: aiMessages,
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI chat error ${response.status}: ${err}`);
  }

  const result = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const raw = result.choices[0]?.message?.content || '';

  // Parse extracted JSON if present
  let extracted: AIExtracted | null = null;
  const extractMatch = raw.match(/---EXTRACTED---\s*([\s\S]*?)\s*---END---/);
  if (extractMatch) {
    try {
      extracted = JSON.parse(extractMatch[1]) as AIExtracted;
    } catch {
      // Extraction failed — non-critical, continue without it
    }
  }

  // Reply is everything before the extraction block
  const reply = raw.replace(/---EXTRACTED---[\s\S]*?---END---/, '').trim();

  return { reply: reply || "Thanks for sharing. Could you tell me a bit more about what you're looking for?", extracted };
}

/**
 * Assemble a project_inquiries insert record from AI conversation data.
 */
export function buildInquiryRecord(params: {
  name: string;
  email: string;
  source: 'ai_voice' | 'ai_text';
  messages: ChatMessage[];
  extracted: AIExtracted | null;
}) {
  const transcript = params.messages
    .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n\n');

  return {
    name: params.name,
    email: params.email,
    company: null,
    project_type: params.extracted?.project_type ?? null,
    description: params.extracted?.summary ?? params.messages[0]?.content ?? '',
    budget_range: params.extracted?.budget_signal ?? null,
    timeline: params.extracted?.urgency ?? null,
    source: params.source,
    ai_transcript: transcript,
    ai_extracted: params.extracted,
    ai_summary: params.extracted?.summary ?? null,
  };
}
