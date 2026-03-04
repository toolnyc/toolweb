import { STRATEGY_SYSTEM_PROMPT } from './context';
import { braveSearch, type SearchResult } from './search';
import { sendMessage } from './send';

interface CommandEnv {
  botToken: string;
  chatId: string;
  openaiKey: string;
  braveKey: string;
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
      // Ignore non-command messages silently
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

  // Search for context on the topic
  let searchContext = '';
  if (env.braveKey) {
    try {
      const results = await braveSearch(env.braveKey, `${topic} content marketing trends 2025 2026`, 5);
      searchContext = formatSearchResults(results);
    } catch {
      // Continue without search context
    }
  }

  const userPrompt = searchContext
    ? `Generate 3-5 content ideas for the topic: "${topic}"\n\nHere's some current context from the web:\n${searchContext}\n\nMap each idea to a content pillar, suggest the best platform, write a draft hook, and describe the angle.`
    : `Generate 3-5 content ideas for the topic: "${topic}"\n\nMap each idea to a content pillar, suggest the best platform, write a draft hook, and describe the angle.`;

  const reply = await callOpenAI(env.openaiKey, userPrompt);
  await sendMessage(env.botToken, env.chatId, reply);
}

async function handleTrends(env: CommandEnv): Promise<void> {
  await sendMessage(env.botToken, env.chatId, 'Searching trends...');

  const queries = [
    'trending design topics this week',
    'small business consulting trends 2026',
    'viral creative content ideas',
  ];

  let allResults: SearchResult[] = [];
  if (env.braveKey) {
    const batches = await Promise.all(queries.map((q) => braveSearch(env.braveKey, q, 3).catch(() => [])));
    allResults = batches.flat();
  }

  const searchContext = formatSearchResults(allResults);

  const userPrompt = searchContext
    ? `Based on these trending topics and articles:\n${searchContext}\n\nIdentify 3-5 trending topics relevant to a solo creative consultant (design, web dev, branding, small business). For each trend, suggest a specific content angle Pete could take, mapped to a content pillar, with a draft hook.`
    : `What are 3-5 trending topics this week relevant to a solo creative consultant (design, web dev, branding, small business)? For each trend, suggest a specific content angle, mapped to a content pillar, with a draft hook.`;

  const reply = await callOpenAI(env.openaiKey, userPrompt);
  await sendMessage(env.botToken, env.chatId, reply);
}

async function handleNews(env: CommandEnv): Promise<void> {
  await sendMessage(env.botToken, env.chatId, 'Pulling news...');

  const queries = [
    'tech design news this week',
    'freelance consulting industry news',
    'web development news this week',
  ];

  let allResults: SearchResult[] = [];
  if (env.braveKey) {
    const batches = await Promise.all(queries.map((q) => braveSearch(env.braveKey, q, 3).catch(() => [])));
    allResults = batches.flat();
  }

  const searchContext = formatSearchResults(allResults);

  const userPrompt = searchContext
    ? `Here's a news digest:\n${searchContext}\n\nPick the 3-5 most relevant stories for a solo creative consultant. For each, write a one-line summary and suggest a content angle Pete could use (LinkedIn post, Reel idea, etc.), with a draft hook.`
    : `What are the top 3-5 tech, design, or consulting news stories this week? For each, write a one-line summary and suggest a content angle for a solo creative consultant, with a draft hook.`;

  const reply = await callOpenAI(env.openaiKey, userPrompt);
  await sendMessage(env.botToken, env.chatId, reply);
}

async function callOpenAI(apiKey: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: STRATEGY_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content ?? 'No response generated.';
}

function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return '';
  return results
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.description}`)
    .join('\n\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
