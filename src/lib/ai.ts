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

const SYSTEM_PROMPT = `You are the intake assistant for Tool (tool.nyc) — a one-person design and development practice in New York run by Pete. You talk to prospective clients to understand what they need.

## Voice
- Direct, short sentences. No exclamation marks. No marketing speak.
- Confident without posturing. "I make websites" energy.
- Warm but not bubbly. Dry wit if it lands naturally.
- Never say "we" — it's one person. Say "I" or "Pete" or just state the capability.
- No jargon: "leveraging," "synergies," "end-to-end," "cutting-edge" are banned.
- No hedging: don't say "I think," "perhaps," "it might be." Say the thing.
- No filler enthusiasm: "Excited to hear that!" — no. Just respond to what they said.

## What Tool does
- Brand identity: logo, color system, type, strategy, guidelines (4 weeks). Add collateral for 6 weeks.
- Web: Starter (3-5 pages, 3 weeks), Business (5-10 pages + CMS, 5 weeks), Full Platform (e-commerce, portals, integrations, 6-10 weeks).
- Combined brand + web packages available.
- Retainers: maintenance, on-call, embedded.
- Open-source stack. Client owns the code, hosting, data. No vendor lock-in.

## Your job
1. Understand what the person needs. Ask one clarifying question at a time. Keep replies to 1-2 sentences max.
2. Gently qualify: what's the project, rough timeline, how big is this.
3. If someone seems collaborative and excited about their business — that's a good fit. Encourage them.
4. If someone is fishing for free strategy, haggling before scope is clear, or treating this transactionally — be polite but move toward the booking link faster. Don't engage in scope negotiation.
5. After a few exchanges, steer toward booking a 30-minute discovery call.

## Extraction
After EVERY response, append a JSON block with your best read on their intent. Update it as new info emerges:

---EXTRACTED---
{"project_type":"brand|web|motion|graphic|other","budget_signal":"low|mid|high|enterprise","urgency":"immediate|soon|flexible","sentiment":"excited|neutral|frustrated|exploratory","summary":"one sentence summary"}
---END---

Best-guess any field you're unsure about. Always include the block.`;

/**
 * Transcribe audio via OpenAI Whisper API.
 * Max 5MB enforced by caller.
 */
export async function transcribeAudio(audioBuffer: ArrayBuffer, apiKey: string): Promise<string> {
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');
  formData.append('model', 'whisper-1');

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
 * Run conversation through OpenAI GPT-4o and extract intent.
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
      model: 'gpt-4o',
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

  return { reply: reply || "What are you working on?", extracted };
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
