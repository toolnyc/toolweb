/**
 * AI Inquiry Modal — client-side state machine.
 * States: IDLE → RECORDING → PROCESSING → CONVERSATION → CONTACT → DONE
 */
export {};

type State = 'IDLE' | 'RECORDING' | 'PROCESSING' | 'CONVERSATION' | 'CONTACT' | 'DONE';
interface ChatMessage { role: 'user' | 'assistant'; content: string; }
interface AIExtracted {
  project_type: string;
  budget_signal: string;
  urgency: string;
  sentiment: string;
  summary: string;
}

let state: State = 'IDLE';
let messages: ChatMessage[] = [];
let extracted: AIExtracted | null = null;
let source: 'ai_voice' | 'ai_text' = 'ai_text';
let userMessageCount = 0;
const MAX_USER_MESSAGES = 3;

// MediaRecorder state
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingTimeout: ReturnType<typeof setTimeout> | null = null;

// DOM refs
const overlay = document.getElementById('ai-overlay');
const modal = document.getElementById('ai-modal');
const closeBtn = document.getElementById('ai-close');
const conversation = document.getElementById('ai-conversation');
const promptEl = document.getElementById('ai-prompt');
const extractedCard = document.getElementById('ai-extracted');
const inputArea = document.getElementById('ai-input-area');
const contactArea = document.getElementById('ai-contact');
const doneArea = document.getElementById('ai-done');
const micBtn = document.getElementById('ai-mic');
const micIcon = document.getElementById('ai-mic-icon');
const micStop = document.getElementById('ai-mic-stop');
const micPulse = document.getElementById('ai-mic-pulse');
const textInput = document.getElementById('ai-text-input') as HTMLInputElement | null;
const sendBtn = document.getElementById('ai-send');
const inputHint = document.getElementById('ai-input-hint');
const nameInput = document.getElementById('ai-name') as HTMLInputElement | null;
const emailInput = document.getElementById('ai-email') as HTMLInputElement | null;
const submitBtn = document.getElementById('ai-submit');
const contactError = document.getElementById('ai-contact-error');

// Extracted display refs
const exType = document.getElementById('ai-ex-type');
const exBudget = document.getElementById('ai-ex-budget');
const exUrgency = document.getElementById('ai-ex-urgency');
const exSentiment = document.getElementById('ai-ex-sentiment');

// ── Open / Close ──────────────────────────────────────────────
function openModal() {
  if (!overlay || !modal) return;
  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    overlay.classList.add('opacity-100');
    overlay.classList.remove('opacity-0');
    modal.classList.add('opacity-100', 'scale-100');
    modal.classList.remove('opacity-0', 'scale-95');
  });
  state = 'IDLE';
  textInput?.focus();
}

function closeModal() {
  if (!overlay || !modal) return;
  overlay.classList.remove('opacity-100');
  overlay.classList.add('opacity-0');
  modal.classList.remove('opacity-100', 'scale-100');
  modal.classList.add('opacity-0', 'scale-95');
  setTimeout(() => {
    overlay.classList.add('hidden');
    modal.classList.add('hidden');
    resetState();
  }, 200);
}

function resetState() {
  state = 'IDLE';
  messages = [];
  extracted = null;
  source = 'ai_text';
  userMessageCount = 0;
  stopRecording();

  // Clear conversation
  if (conversation) {
    conversation.querySelectorAll('.ai-msg').forEach((el) => el.remove());
  }
  if (promptEl) promptEl.classList.remove('hidden');
  if (extractedCard) extractedCard.classList.add('hidden');
  if (inputArea) inputArea.classList.remove('hidden');
  if (contactArea) contactArea.classList.add('hidden');
  if (doneArea) doneArea.classList.add('hidden');
  if (inputHint) inputHint.classList.add('hidden');
  if (textInput) textInput.value = '';
  if (nameInput) nameInput.value = '';
  if (emailInput) emailInput.value = '';
  if (contactError) contactError.classList.add('hidden');
}

// Listen for open event
document.addEventListener('open-ai-inquiry', openModal);
overlay?.addEventListener('click', closeModal);
closeBtn?.addEventListener('click', closeModal);

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal?.classList.contains('hidden')) {
    closeModal();
  }
});

// ── Send text message ─────────────────────────────────────────
async function sendTextMessage() {
  if (!textInput || !textInput.value.trim()) return;
  const text = textInput.value.trim();
  textInput.value = '';
  await sendMessage(text);
}

sendBtn?.addEventListener('click', sendTextMessage);
textInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendTextMessage();
  }
});

// ── Voice recording ───────────────────────────────────────────
micBtn?.addEventListener('click', async () => {
  if (state === 'RECORDING') {
    stopRecording();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    source = 'ai_voice';

    // Detect supported mime type
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/mp4';

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (audioChunks.length === 0) return;

      const blob = new Blob(audioChunks, { type: mimeType });
      const base64 = await blobToBase64(blob);
      await sendMessage('', base64);
    };

    mediaRecorder.start();
    state = 'RECORDING';
    updateRecordingUI(true);

    // Auto-stop at 60 seconds
    recordingTimeout = setTimeout(() => stopRecording(), 60000);
  } catch {
    // Mic unavailable — show hint
    if (inputHint) {
      inputHint.textContent = 'Microphone unavailable. Use text instead.';
      inputHint.classList.remove('hidden');
    }
  }
});

function stopRecording() {
  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  mediaRecorder = null;
  updateRecordingUI(false);
}

function updateRecordingUI(recording: boolean) {
  if (micIcon) micIcon.classList.toggle('hidden', recording);
  if (micStop) micStop.classList.toggle('hidden', !recording);
  if (micPulse) micPulse.classList.toggle('hidden', !recording);
}

// ── Core send logic ───────────────────────────────────────────
async function sendMessage(text: string, audio?: string) {
  if (state === 'PROCESSING') return;
  state = 'PROCESSING';
  setInputEnabled(false);

  // Add user message to UI
  if (text) {
    messages.push({ role: 'user', content: text });
    appendMessage('user', text);
  } else if (audio) {
    // Placeholder while transcribing
    appendMessage('user', 'Transcribing...');
    messages.push({ role: 'user', content: '' }); // placeholder
  }

  userMessageCount++;
  if (promptEl) promptEl.classList.add('hidden');

  // Show processing indicator
  const loadingEl = appendMessage('assistant', '...');
  loadingEl.classList.add('animate-pulse');

  try {
    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        messages: messages.filter((m) => m.content !== ''),
        audio: audio ?? undefined,
      }),
    });

    const data = await res.json() as {
      reply?: string;
      extracted?: AIExtracted | null;
      transcript?: string;
      error?: string;
    };

    // Remove loading indicator
    loadingEl.remove();

    if (!res.ok) {
      appendMessage('assistant', data.error ?? 'Something went wrong. Try again.');
      state = 'CONVERSATION';
      setInputEnabled(true);
      return;
    }

    // Update transcript in messages if audio was used
    if (data.transcript && audio) {
      const lastUser = messages[messages.length - 1];
      if (lastUser?.role === 'user') {
        lastUser.content = data.transcript;
        // Update the placeholder in UI
        const userMsgs = conversation?.querySelectorAll('.ai-msg-user');
        const lastUserEl = userMsgs?.[userMsgs.length - 1];
        if (lastUserEl) {
          const pEl = lastUserEl.querySelector('p');
          if (pEl) pEl.textContent = data.transcript;
        }
      }
    }

    // Add AI reply
    if (data.reply) {
      messages.push({ role: 'assistant', content: data.reply });
      appendMessage('assistant', data.reply);
    }

    // Update extracted intent
    if (data.extracted) {
      extracted = data.extracted;
      updateExtractedCard(data.extracted);
    }

    // Check if conversation limit reached
    if (userMessageCount >= MAX_USER_MESSAGES) {
      state = 'CONTACT';
      showContactForm();
    } else {
      state = 'CONVERSATION';
      setInputEnabled(true);
    }
  } catch {
    loadingEl.remove();
    appendMessage('assistant', 'Connection error. Please try again.');
    state = 'CONVERSATION';
    setInputEnabled(true);
  }
}

// ── UI helpers ────────────────────────────────────────────────
function appendMessage(role: 'user' | 'assistant', text: string): HTMLElement {
  const div = document.createElement('div');
  div.className = `ai-msg ai-msg-${role} ${role === 'user' ? 'text-right' : 'text-left'}`;

  const bubble = document.createElement('p');
  bubble.className = role === 'user'
    ? 'inline-block text-body bg-neutral-100 px-3 py-2 text-left max-w-[85%]'
    : 'inline-block text-body text-neutral-900 px-3 py-2 max-w-[85%]';
  bubble.textContent = text;

  div.appendChild(bubble);
  conversation?.appendChild(div);

  // Scroll to bottom
  if (conversation) {
    conversation.scrollTop = conversation.scrollHeight;
  }

  return div;
}

function updateExtractedCard(ex: AIExtracted) {
  if (!extractedCard) return;
  extractedCard.classList.remove('hidden');
  if (exType) exType.textContent = ex.project_type;
  if (exBudget) exBudget.textContent = ex.budget_signal;
  if (exUrgency) exUrgency.textContent = ex.urgency;
  if (exSentiment) exSentiment.textContent = ex.sentiment;
}

function setInputEnabled(enabled: boolean) {
  if (textInput) textInput.disabled = !enabled;
  if (sendBtn) (sendBtn as HTMLButtonElement).disabled = !enabled;
  if (micBtn) (micBtn as HTMLButtonElement).disabled = !enabled;
}

function showContactForm() {
  if (inputArea) inputArea.classList.add('hidden');
  if (contactArea) contactArea.classList.remove('hidden');
  nameInput?.focus();

  // Show remaining messages hint
  if (inputHint) {
    inputHint.textContent = '';
    inputHint.classList.add('hidden');
  }
}

// ── Contact form submission ───────────────────────────────────
submitBtn?.addEventListener('click', async () => {
  if (state === 'DONE') return;

  const name = nameInput?.value.trim();
  const email = emailInput?.value.trim();

  if (!name || !email) {
    showContactError('Name and email are required.');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showContactError('Please enter a valid email.');
    return;
  }

  if (contactError) contactError.classList.add('hidden');
  (submitBtn as HTMLButtonElement).disabled = true;
  (submitBtn as HTMLButtonElement).textContent = 'Saving...';

  try {
    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        name,
        email,
        source,
        messages,
        extracted,
      }),
    });

    const data = await res.json() as {
      success?: boolean;
      calPrefill?: { name: string; email: string; notes: string };
      error?: string;
    };

    if (!res.ok) {
      showContactError(data.error ?? 'Failed to save. Try again.');
      (submitBtn as HTMLButtonElement).disabled = false;
      (submitBtn as HTMLButtonElement).textContent = 'Book a Call';
      return;
    }

    state = 'DONE';
    if (contactArea) contactArea.classList.add('hidden');
    if (doneArea) doneArea.classList.remove('hidden');

    // Trigger Cal.com popup with prefilled data
    if (data.calPrefill && typeof window.Cal === 'function') {
      setTimeout(() => {
        window.Cal!('openModal', {
          calLink: 'toolnyc/30min',
          config: {
            layout: 'month_view',
            name: data.calPrefill!.name,
            email: data.calPrefill!.email,
            notes: data.calPrefill!.notes,
          },
        });
      }, 800);
    }
  } catch {
    showContactError('Connection error. Try again.');
    (submitBtn as HTMLButtonElement).disabled = false;
    (submitBtn as HTMLButtonElement).textContent = 'Book a Call';
  }
});

function showContactError(msg: string) {
  if (contactError) {
    contactError.textContent = msg;
    contactError.classList.remove('hidden');
  }
}

// ── Utilities ─────────────────────────────────────────────────
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Declare Cal on window ─────────────────────────────────────
declare global {
  interface Window {
    Cal?: (...args: unknown[]) => void;
  }
}
