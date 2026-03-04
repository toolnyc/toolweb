const MAX_MESSAGE_LENGTH = 4096;

/**
 * Send a message to a Telegram chat, chunking if over 4096 chars.
 * Uses HTML parse mode for formatting.
 */
export async function sendMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<void> {
  const chunks = chunkText(text, MAX_MESSAGE_LENGTH);

  for (const chunk of chunks) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  }
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
