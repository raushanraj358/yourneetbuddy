// AI provider adapters (Google Gemini + OpenAI). Pure fetch, no DOM; runs in the browser and in the Supabase Edge Function.
// Errors shown to people always use the standard messages below. Providers' raw error text only goes to the console.

export class ProviderError extends Error {
  constructor(msg, code, status) {
    super(msg);
    this.code = code; // AUTH | RATE | MODEL | API | BLOCKED | EMPTY | TIMEOUT | LENGTH
    this.status = status;
  }
}

export const AI_MESSAGES = {
  AUTH: 'Your API key was rejected. Please re-copy it into Settings.',
  RATE: 'The AI is busy right now. Please wait a minute and try again.',
  MODEL: 'The selected AI model is not available. Choose "Auto" in Settings and try again.',
  BLOCKED: "The AI couldn't answer this request. Please try rephrasing the topic.",
  API: 'The AI service is temporarily unavailable. Please try again in a few minutes.',
  TIMEOUT: 'The AI is taking too long right now. Please try again, or ask for fewer questions.',
  LENGTH: 'The answer was too long for the AI to finish. Please ask for fewer questions.',
};

// Generation limits. Thinking is kept small: it makes long JSON answers (10–20 MCQs) several times slower.
const THINKING_BUDGET = 512;
const MAX_OUTPUT_TOKENS = 24576;
// Per-model attempt and whole-chain time limits (the Supabase Edge Function itself is stopped after ~150 s).
const ATTEMPT_MS = 60e3;
const CHAIN_MS = 120e3;

/** An AbortSignal that fires when `outer` aborts or after `ms`; `timedOut()` tells the two apart. */
function timeoutSignal(outer, ms) {
  const ctrl = new AbortController();
  let fired = false;
  const t = setTimeout(() => { fired = true; ctrl.abort(); }, ms);
  const onAbort = () => ctrl.abort();
  if (outer) outer.aborted ? ctrl.abort() : outer.addEventListener('abort', onAbort, { once: true });
  return {
    signal: ctrl.signal,
    timedOut: () => fired,
    done: () => { clearTimeout(t); outer?.removeEventListener('abort', onAbort); },
  };
}

function fail(code, status, raw) {
  if (raw) console.warn(`[AI ${code} ${status}]`, raw);
  return new ProviderError(AI_MESSAGES[code] || AI_MESSAGES.API, code, status);
}

/** True when an error says the model is missing, retired or unsupported (so Auto should try the next one). */
export function isModelUnavailable(status, msg = '') {
  return status === 404 || /no longer available|not found|not supported|unsupported|deprecated|is not available|decommission|retired/i.test(msg);
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// "Auto" tries these in order and moves on when a model is missing, retired or out of free quota.
// The -latest aliases track Google's current Flash models; the named 3.5 models are a safety net.
export const GEMINI_AUTO_CHAIN = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];

function split(messages) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const user = messages.filter((m) => m.role !== 'system').map((m) => m.content).join('\n\n');
  return { system, user };
}

async function geminiRequest({ key, model, messages, signal, thinking }) {
  const { system, user } = split(messages);
  const generationConfig = { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: MAX_OUTPUT_TOKENS };
  if (thinking) generationConfig.thinkingConfig = { thinkingBudget: THINKING_BUDGET };
  const res = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig,
    }),
  });
  return { res, data: await res.json().catch(() => ({})) };
}

async function geminiOnce({ key, model, messages, signal, ms = ATTEMPT_MS }) {
  const t = timeoutSignal(signal, ms);
  let res, data;
  try {
    ({ res, data } = await geminiRequest({ key, model, messages, signal: t.signal, thinking: true }));
    // A model that doesn't accept a thinking budget: ask again without one.
    if (res.status === 400 && /thinking/i.test(data?.error?.message || '')) {
      ({ res, data } = await geminiRequest({ key, model, messages, signal: t.signal, thinking: false }));
    }
  } catch (e) {
    if (e.name === 'AbortError' && t.timedOut()) throw fail('TIMEOUT', 504, `${model}: no answer in ${Math.round(ms / 1000)} s`);
    throw e;
  } finally {
    t.done();
  }
  if (res.ok) {
    const cand = data?.candidates?.[0];
    const text = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
    if (cand?.finishReason === 'MAX_TOKENS') throw fail('LENGTH', 200, `${model}: output hit the token limit`);
    if (!text) throw fail('BLOCKED', 200, `no text: ${data?.promptFeedback?.blockReason || cand?.finishReason || 'unknown'}`);
    return text;
  }
  const msg = data?.error?.message || '';
  if (isModelUnavailable(res.status, msg)) throw fail('MODEL', res.status, `${model}: ${msg}`);
  if (res.status === 401 || res.status === 403 || (res.status === 400 && /api key/i.test(msg))) throw fail('AUTH', res.status, msg);
  if (res.status === 429) throw fail('RATE', 429, msg);
  throw fail('API', res.status, msg);
}

export async function callGemini({ key, model, messages, signal }) {
  const chain = !model || model === 'auto' ? GEMINI_AUTO_CHAIN : [model];
  const deadline = Date.now() + CHAIN_MS;
  let last;
  for (const m of chain) {
    const left = deadline - Date.now();
    if (left < 15e3) break; // not enough time for another model to answer
    try {
      return await geminiOnce({ key, model: m, messages, signal, ms: Math.min(ATTEMPT_MS, left) });
    } catch (e) {
      if (e.name === 'AbortError' || ['AUTH', 'BLOCKED', 'LENGTH'].includes(e.code)) throw e;
      last = e;
      // Fall through to the next model on missing model / quota / timeout / transient server errors.
      if (!['MODEL', 'RATE', 'TIMEOUT'].includes(e.code) && !(e.status >= 500)) throw e;
    }
  }
  // Every model failed: say "busy" for quota limits, "too slow" for timeouts, otherwise a general "unavailable".
  if (last && ['RATE', 'TIMEOUT'].includes(last.code)) throw last;
  if (chain.length > 1 || !last) throw new ProviderError(AI_MESSAGES.API, 'API', last?.status);
  throw last;
}

export async function listGeminiModels(key) {
  const res = await fetch(`${GEMINI_BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if ([400, 401, 403].includes(res.status)) throw fail('AUTH', res.status, data?.error?.message);
    throw fail('API', res.status, data?.error?.message);
  }
  return (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /^gemini/.test(n) && !/(embed|image|tts|audio|live|vision|computer|robotics|aqa)/i.test(n))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}

export async function callOpenAI({ key, model, messages, signal }) {
  const t = timeoutSignal(signal, CHAIN_MS);
  let res, data;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: t.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: model || 'gpt-4o-mini', messages, response_format: { type: 'json_object' } }),
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    if (e.name === 'AbortError' && t.timedOut()) throw fail('TIMEOUT', 504, 'OpenAI: no answer in time');
    throw e;
  } finally {
    t.done();
  }
  if (!res.ok) {
    const msg = data?.error?.message || '';
    if (res.status === 401) throw fail('AUTH', 401, msg);
    if (res.status === 429) throw fail('RATE', 429, msg);
    if (isModelUnavailable(res.status, msg)) throw fail('MODEL', res.status, msg);
    throw fail('API', res.status, msg);
  }
  if (data?.choices?.[0]?.finish_reason === 'length') throw fail('LENGTH', 200, 'OpenAI: output hit the token limit');
  return data?.choices?.[0]?.message?.content || '';
}

export function callAI({ provider, ...rest }) {
  return provider === 'openai' ? callOpenAI(rest) : callGemini(rest);
}
