import { STRATEGY_SYSTEM_PROMPT } from './context';
import { sendMessage } from './send';

interface CommandEnv {
  botToken: string;
  chatId: string;
  openaiKey: string;
}

/** Route a message to the appropriate command handler */
export async function handleCommand(text: string, env: CommandEnv): Promise<void> {
  const trimmed = text.trim();
  const [rawCmd, ...rest] = trimmed.split(/\s+/);
  const cmd = rawCmd.toLowerCase();
  const args = rest.join(' ').trim();

  switch (cmd) {
    case '/content':
      await handleContent(args, env);
      break;
    case '/trends':
      await handleTrends(env);
      break;
    case '/news':
      await handleNews(env);
      break;
    case '/help':
    case '/start':
      await handleHelp(env);
      break;
    default:
      break;
  }
}

async function handleHelp(env: CommandEnv): Promise<void> {
  const text = [
    '<b>Tool.NYC Content Bot</b>',
    '',
    '/content [topic] — Generate 3-5 content ideas with hooks',
    '/trends — Trending topics + content angles',
    '/news — Tech/design/consulting news digest',
    '/help — This message',
  ].join('\n');

  await sendMessage(env.botToken, env.chatId, text);
}

async function handleContent(topic: string, env: CommandEnv): Promise<void> {
  if (!topic) {
    await sendMessage(env.botToken, env.chatId, 'Usage: /content [topic]\n\nExample: /content website redesign');
    return;
  }

  await sendMessage(env.botToken, env.chatId, `Generating content ideas for "${escapeHtml(topic)}"...`);

  const reply = await callOpenAI(env.openaiKey, [
    `Generate 3-5 content ideas for the topic: "${topic}"`,
    `Map each idea to a content pillar, suggest the best platform, write a draft hook, and describe the angle.`,
  ].join('\n'), false);

  await sendMessage(env.botToken, env.chatId, reply);
}

async function handleTrends(env: CommandEnv): Promise<void> {
  await sendMessage(env.botToken, env.chatId, 'Searching trends...');

  const reply = await callOpenAI(env.openaiKey, [
    `Search the web for what's trending right now in design, tech, small business, and creative consulting.`,
    `Identify 3-5 trending topics relevant to a solo creative consultant.`,
    `For each trend, suggest a specific content angle Pete could take, mapped to a content pillar, with a draft hook.`,
  ].join('\n'));

  await sendMessage(env.botToken, env.chatId, reply);
}

async function handleNews(env: CommandEnv): Promise<void> {
  await sendMessage(env.botToken, env.chatId, 'Pulling news...');

  const reply = await callOpenAI(env.openaiKey, [
    `Search the web for the latest news in tech, design, web development, and freelance/consulting this week.`,
    `Pick the 3-5 most relevant stories for a solo creative consultant.`,
    `For each, write a one-line summary and suggest a content angle Pete could use (LinkedIn post, Reel idea, etc.), with a draft hook.`,
  ].join('\n'));

  await sendMessage(env.botToken, env.chatId, reply);
}

async function callOpenAI(apiKey: string, userPrompt: string, useSearch = true): Promise<string> {
  const body: Record<string, unknown> = {
    model: 'gpt-4o-mini',
    instructions: STRATEGY_SYSTEM_PROMPT,
    input: userPrompt,
    temperature: 0.8,
  };
  if (useSearch) {
    body.tools = [{ type: 'web_search' }];
  }

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    output: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
  };

  // Extract text from the response output
  for (const item of data.output) {
    if (item.type === 'message' && item.content) {
      const textParts = item.content
        .filter((c) => c.type === 'output_text' && c.text)
        .map((c) => c.text!);
      if (textParts.length > 0) return textParts.join('\n');
    }
  }

  return 'No response generated.';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
