// Optional accounts (Supabase). Signed-in users get their whole study data saved to one row in the cloud,
// so their profile and progress follow them across devices. Guests keep using the app locally, exactly as before.
import { S, subscribe, snapshot, replaceAll, resetAll, isBlank, dataSummary, commit } from './store.js';
import { config, loadConfig, cloudConfigured } from './config.js';
import { openModal, toast, confirmDialog } from './ui.js';
import { esc } from './utils.js';

const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';
const META_KEY = 'ynb:sync';
const TABLE = 'neet_user_data'; // prefixed so this site can share a Supabase project with YourIASBuddy
const PUSH_DELAY = 2500;

let sb = null;
let user = null;
let status = 'off'; // off | signed-out | pending | syncing | synced | paused | offline | error
let lastSyncAt = 0;
let suppress = false; // true while we replace local data with cloud data (don't echo it back)
let prompting = false;
let pushTimer = null;
let chain = Promise.resolve();
const listeners = new Set();

function readMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch { return {}; }
}
let meta = readMeta(); // { uid, rev, dirty } — which account this device's data belongs to and the last cloud revision seen
function saveMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {}
}

function setStatus(s) {
  status = s;
  if (s === 'synced') lastSyncAt = Date.now();
  listeners.forEach((fn) => fn());
}
function fail(e) {
  console.warn('Cloud sync failed:', e);
  setStatus(navigator.onLine ? 'error' : 'offline');
}
/** Run sync steps one at a time. */
const queue = (fn) => (chain = chain.then(fn, fn).catch(fail));

export const onCloudChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const cloud = () => ({ configured: cloudConfigured(), ready: Boolean(sb), user, status, lastSyncAt, googleAuth: Boolean(config().googleAuth), emailAuth: Boolean(config().emailAuth) });

/* ---------------- Boot ---------------- */

export async function initCloud() {
  await loadConfig();
  if (!cloudConfigured()) return setStatus('off');
  try {
    const { createClient } = await import(SUPABASE_ESM);
    sb = createClient(config().supabaseUrl, config().supabaseAnonKey, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, storageKey: 'ynb:auth' },
    });
  } catch (e) {
    sb = null;
    return fail(e);
  }

  const url = new URL(location.href);
  const fromRedirect = url.searchParams.has('code');
  const err = url.searchParams.get('error_description');
  const { data } = await sb.auth.getSession(); // also finishes a sign-in redirect (?code=…)
  if (fromRedirect || err) history.replaceState(null, '', location.pathname + location.hash);
  if (err) toast('Sign-in failed', 'bad', authErrorMessage(err));

  user = data?.session?.user || null;
  setStatus(user ? 'syncing' : 'signed-out');
  if (user && fromRedirect) toast('Signed in', 'good', user.email || '');

  sb.auth.onAuthStateChange((_event, session) => {
    const next = session?.user || null;
    const changed = next?.id !== user?.id;
    user = next;
    if (!changed) return; // token refresh etc.
    // Supabase advises not to await its own calls inside this callback.
    setTimeout(() => {
      if (user) {
        toast('Signed in', 'good', user.email || '');
        sync();
      } else setStatus('signed-out');
    }, 0);
  });

  subscribe(() => {
    if (suppress || !user || meta.uid !== user.id) return;
    meta.dirty = true;
    saveMeta();
    schedulePush();
  });
  document.addEventListener('visibilitychange', () => {
    if (!user || prompting) return;
    if (document.visibilityState === 'visible') sync();
    else if (meta.dirty) { clearTimeout(pushTimer); queue(doPush); }
  });
  window.addEventListener('online', () => user && sync());

  if (user) await sync();
}

/* ---------------- Sync ---------------- */

export const sync = () => queue(doSync);

function schedulePush() {
  clearTimeout(pushTimer);
  setStatus('pending');
  pushTimer = setTimeout(() => queue(doPush), PUSH_DELAY);
}

async function fetchRow() {
  const { data, error } = await sb.from(TABLE).select('data, rev, updated_at').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data;
}

async function doSync() {
  if (!sb || !user || prompting) return;
  setStatus('syncing');
  const row = await fetchRow();
  if (meta.uid !== user.id) return link(row); // first sign-in on this device
  if (!row) {
    meta.rev = 0;
    meta.dirty = true;
    saveMeta();
    return doPush();
  }
  if (row.rev === meta.rev) return meta.dirty ? doPush() : setStatus('synced');
  if (row.rev > meta.rev && !meta.dirty) return adopt(row);
  return choose(row, 'conflict');
}

async function link(row) {
  if (!row) {
    meta = { uid: user.id, rev: 0, dirty: true };
    saveMeta();
    return doPush();
  }
  if (isBlank()) return adopt(row);
  return choose(row, 'link');
}

async function doPush() {
  if (!sb || !user || meta.uid !== user.id || prompting) return;
  clearTimeout(pushTimer);
  setStatus('syncing');
  const data = snapshot();
  const next = (meta.rev || 0) + 1;
  meta.dirty = false; // edits made while this request is in flight mark it dirty again
  saveMeta();
  try {
    let ok;
    if (!meta.rev) {
      const { error } = await sb.from(TABLE).insert({ user_id: user.id, data, rev: next });
      if (error && error.code !== '23505') throw error; // 23505 = a row already exists → conflict
      ok = !error;
    } else {
      const { data: rows, error } = await sb
        .from(TABLE)
        .update({ data, rev: next, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('rev', meta.rev)
        .select('rev');
      if (error) throw error;
      ok = rows.length > 0;
    }
    if (!ok) {
      meta.dirty = true;
      saveMeta();
      const row = await fetchRow();
      if (!row) {
        meta.rev = 0;
        saveMeta();
        return doPush();
      }
      return choose(row, 'conflict');
    }
    meta.rev = next;
    saveMeta();
    if (meta.dirty) schedulePush();
    else setStatus('synced');
  } catch (e) {
    meta.dirty = true;
    saveMeta();
    throw e;
  }
}

function adopt(row) {
  const { apiKey, geminiKey } = S().settings; // keys never leave the device; keep this device's
  suppress = true;
  try {
    replaceAll(row.data || {});
    Object.assign(S().settings, { apiKey, geminiKey });
    commit();
  } finally {
    suppress = false;
  }
  meta = { uid: user.id, rev: row.rev, dirty: false };
  saveMeta();
  setStatus('synced');
  window.dispatchEvent(new Event('ynb:datareplaced'));
}

/** Both this device and the account have different data: let the user pick which survives. */
function choose(row, kind) {
  // Same content on both sides (e.g. two tabs syncing at once): nothing to ask.
  if (JSON.stringify(row.data) === JSON.stringify(snapshot())) {
    meta = { uid: user.id, rev: row.rev, dirty: false };
    saveMeta();
    return setStatus('synced');
  }
  prompting = true;
  setStatus('paused');
  return new Promise((resolve) => {
    let decided = false;
    const close = openModal({
      title: kind === 'link' ? 'Which progress should we keep?' : 'Changes on two devices',
      body: `
        <p class="muted">${kind === 'link'
          ? 'This device already has study data, and so does your account.'
          : 'Your account was updated from another device while this device also had unsaved changes.'} Choose which one to keep. The other will be replaced.</p>
        <div class="stack" style="margin-top:14px">
          <div class="notice info"><div><b>Your account</b><br><span class="hint">${esc(dataSummary(row.data || {}))}</span></div></div>
          <div class="notice"><div><b>This device</b><br><span class="hint">${esc(dataSummary())}</span></div></div>
        </div>
        <p class="hint" style="margin-top:12px">Unsure? Close this, export a backup in Settings first, then press "Sync now" on your Profile.</p>`,
      foot: `<button class="btn" data-k="device">Keep this device's</button><button class="btn primary" data-k="cloud">Use my account's</button>`,
      onMount(m) {
        m.querySelectorAll('[data-k]').forEach((b) =>
          b.addEventListener('click', async () => {
            decided = true;
            prompting = false;
            close();
            try {
              if (b.dataset.k === 'cloud') adopt(row);
              else {
                meta = { uid: user.id, rev: row.rev, dirty: true };
                saveMeta();
                await doPush();
              }
            } catch (e) {
              fail(e);
            }
            resolve();
          })
        );
        new MutationObserver((_, obs) => {
          if (document.body.contains(m)) return;
          obs.disconnect();
          if (!decided) {
            prompting = false;
            setStatus('paused');
            resolve();
          }
        }).observe(document.getElementById('modalRoot'), { childList: true });
      },
    });
  });
}

/* ---------------- Account actions ---------------- */

/** Standard wording for sign-in/account errors (raw Supabase text goes to the console only). */
export function authErrorMessage(e) {
  const raw = String(e?.message || e || '');
  if (raw) console.warn('[auth]', raw);
  if (/rate limit|too many|security purposes/i.test(raw)) return 'Too many attempts. Please wait a few minutes and try again.';
  if (/invalid.*email|email.*invalid|unable to validate email/i.test(raw)) return 'Please enter a valid email address.';
  if (/fetch|network|load failed/i.test(raw)) return 'Could not connect. Check your internet connection and try again.';
  return 'Something went wrong. Please try again.';
}

/** The signed-in user's access token (refreshed if needed), or null for guests. */
export async function accessToken() {
  if (!sb || !user) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

const redirectURL = () => location.origin + location.pathname;

export async function signInWithEmail(email) {
  if (!sb) throw new Error('Accounts are not available right now.');
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectURL(), shouldCreateUser: true } });
  if (error) throw error;
}

export async function signInWithGoogle() {
  if (!sb) throw new Error('Accounts are not available right now.');
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectURL() } });
  if (error) throw error;
}

function clearDevice() {
  const theme = S().settings.theme;
  suppress = true;
  try {
    resetAll();
    S().settings.theme = theme;
    S().profile.onboarded = true;
    commit();
  } finally {
    suppress = false;
  }
  meta = {};
  saveMeta();
  window.dispatchEvent(new Event('ynb:datareplaced'));
}

/** Saves pending changes, signs out and clears this device (the data stays safe in the account). */
export async function signOut() {
  if (!sb || !user) return false;
  if (meta.dirty && meta.uid === user.id) await queue(doPush);
  if (meta.dirty && !(await confirmDialog('Some recent changes have not reached your account yet (are you offline?). Sign out anyway and lose them?', 'Sign out'))) return false;
  await sb.auth.signOut();
  user = null;
  clearDevice();
  setStatus('signed-out');
  return true;
}

/** Deletes the cloud copy of this user's data and signs out. Data on this device is kept. */
export async function deleteCloudData() {
  if (!sb || !user) return;
  const { error } = await sb.from(TABLE).delete().eq('user_id', user.id);
  if (error) throw error;
  meta = {};
  saveMeta();
  await sb.auth.signOut();
  user = null;
  setStatus('signed-out');
}
