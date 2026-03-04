const MAX_MESSAGE_LENGTH = 4096;

/**
 * Send a message to a Telegram chat, chunking if over 4096 chars.
 * Converts GPT markdown output to Telegram MarkdownV2 format.
 */
export async function sendMessage(
  botToken: string,
  chatId: string,
  text: string,
  useMarkdown = true,
): Promise<void> {
  const formatted = useMarkdown ? toTelegramMarkdown(text) : text;
  const chunks = chunkText(formatted, MAX_MESSAGE_LENGTH);

  for (const chunk of chunks) {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: chunk,
      disable_web_page_preview: true,
    };
    if (useMarkdown) {
      body.parse_mode = 'MarkdownV2';
    } else {
      body.parse_mode = 'HTML';
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
}

/**
 * Convert standard markdown (from GPT) to Telegram MarkdownV2.
 * Telegram MarkdownV2 requires escaping special chars outside of formatting.
 */
function toTelegramMarkdown(text: string): string {
  // Characters that must be escaped in MarkdownV2
  // (except when used as formatting markers)
  const SPECIAL = /([_[\]()~`>#+\-=|{}.!\\])/g;

  const lines = text.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    // Headers: ### Title → *Title* (bold)
    const headerMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headerMatch) {
      result.push(`*${escapeV2(headerMatch[1])}*`);
      continue;
    }

    // Process inline formatting
    let processed = line;

    // Bold: **text** → *text*
    // Extract bold segments before escaping
    const boldSegments: Array<{ placeholder: string; content: string }> = [];
    let boldIndex = 0;
    processed = processed.replace(/\*\*(.+?)\*\*/g, (_, content) => {
      const placeholder = `__BOLD${boldIndex}__`;
      boldSegments.push({ placeholder, content });
      boldIndex++;
      return placeholder;
    });

    // Italic: *text* (single) or _text_ → _text_
    const italicSegments: Array<{ placeholder: string; content: string }> = [];
    let italicIndex = 0;
    processed = processed.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, content) => {
      const placeholder = `__ITALIC${italicIndex}__`;
      italicSegments.push({ placeholder, content });
      italicIndex++;
      return placeholder;
    });

    // Code: `text` stays as `text`
    const codeSegments: Array<{ placeholder: string; content: string }> = [];
    let codeIndex = 0;
    processed = processed.replace(/`([^`]+)`/g, (_, content) => {
      const placeholder = `__CODE${codeIndex}__`;
      codeSegments.push({ placeholder, content });
      codeIndex++;
      return placeholder;
    });

    // Escape remaining special characters
    processed = processed.replace(SPECIAL, '\\$1');

    // Restore formatted segments (unescaped markers)
    for (const { placeholder, content } of boldSegments) {
      processed = processed.replace(placeholder, `*${escapeV2(content)}*`);
    }
    for (const { placeholder, content } of italicSegments) {
      processed = processed.replace(placeholder, `_${escapeV2(content)}_`);
    }
    for (const { placeholder, content } of codeSegments) {
      processed = processed.replace(placeholder, `\`${content}\``);
    }

    result.push(processed);
  }

  return result.join('\n');
}

/** Escape special chars for MarkdownV2 */
function escapeV2(text: string): string {
  return text.replace(/([_[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/** Split text into chunks at line boundaries, respecting max length */
function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Find last newline within limit
    let splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt <= 0) splitAt = maxLen;

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}
