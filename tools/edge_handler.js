/* ---------------- Edge Function handler (Deno) ---------------- */
// Secrets (Supabase → Edge Functions → Secrets):
//   GEMINI_API_KEY        required (or OPENAI_API_KEY)
//   ALLOWED_ORIGINS       optional, comma-separated; default: yourneetbuddy.com (+www), GitHub Pages URL, localhost
//   AI_DAILY_LIMIT        optional, requests/day for signed-in users (default 25)
//   AI_GUEST_DAILY_LIMIT  optional, requests/day per IP for guests (default 5)
//   GEMINI_MODEL          optional (default "auto")
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const env = (k, d = '') => Deno.env.get(k) || d;
const ALLOWED = env('ALLOWED_ORIGINS', 'https://yourneetbuddy.com,https://www.yourneetbuddy.com,https://raushanraj358.github.io,http://localhost:5173')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const USER_LIMIT = Number(env('AI_DAILY_LIMIT', '25'));
const GUEST_LIMIT = Number(env('AI_GUEST_DAILY_LIMIT', '5'));

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0] || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

Deno.serve(async (req) => {
  const origin = (req.headers.get('origin') || '').replace(/\/+$/, '');
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!ALLOWED.includes(origin)) return reply(403, { error: 'Forbidden' });

  const provider = env('GEMINI_API_KEY') ? 'gemini' : env('OPENAI_API_KEY') ? 'openai' : null;
  if (!provider) return reply(501, { error: 'Server AI is not configured' });
  const key = provider === 'gemini' ? env('GEMINI_API_KEY') : env('OPENAI_API_KEY');
  const model = provider === 'gemini' ? env('GEMINI_MODEL', 'auto') : env('OPENAI_MODEL', 'gpt-4o-mini');

  let body = {};
  try { body = await req.json(); } catch {}
  let messages;
  try {
    messages = buildMessages(body?.task, body?.params || {});
  } catch (e) {
    return reply(400, { error: e.message });
  }

  // Who is asking: a signed-in user (by id) or a guest (by IP).
  let userId = null;
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (token && token.split('.').length === 3) {
    try {
      const { data } = await admin.auth.getUser(token);
      userId = data?.user?.id || null;
    } catch {}
  }
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const limit = userId ? USER_LIMIT : GUEST_LIMIT;
  let used = 0;
  const usageKey = userId ? `u:${userId}` : `ip:${ip}`;
  const { data: n, error } = await admin.rpc('bump_neet_ai_usage', { p_key: usageKey });
  if (error) console.error('bump_neet_ai_usage failed (did you run supabase/schema.sql?)', error.message);
  else used = n;
  if (used > limit) {
    return reply(429, {
      used: limit,
      limit,
      error: userId
        ? `You've used today's ${limit} free AI requests. They reset at midnight (IST), or add your own free Gemini key in Settings for unlimited use.`
        : `Guests get ${limit} free AI requests a day. Sign in with Google (Profile page) to get ${USER_LIMIT} a day.`,
    });
  }

  try {
    const content = await callAI({ provider, key, model, messages });
    return reply(200, { content, used, limit });
  } catch (e) {
    // A failed request doesn't count towards the daily allowance.
    if (used > 0) {
      const { error: re } = await admin.rpc('refund_neet_ai_usage', { p_key: usageKey });
      if (re) console.error('refund_neet_ai_usage failed (did you run supabase/schema.sql?)', re.message);
      else used -= 1;
    }
    if (e.code === 'RATE') return reply(429, { used, limit, error: 'The free AI is busy right now. Please try again in a few minutes, or add your own free Gemini key in Settings.' });
    if (e.code === 'BLOCKED') return reply(422, { used, limit, error: AI_MESSAGES.BLOCKED });
    if (e.code === 'TIMEOUT' || e.code === 'LENGTH') return reply(504, { used, limit, error: AI_MESSAGES[e.code] });
    console.error('AI call failed', e.code, e.message);
    return reply(502, { used, limit, error: AI_MESSAGES.API });
  }
});
