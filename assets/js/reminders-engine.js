// Reminder scheduling. Fires in-app + browser notifications while the site is open.
import { S, commit } from './store.js';
import { addDays, parseKey, dateKey } from './utils.js';
import { notify } from './ui.js';

function occursOn(r, d) {
  const key = dateKey(d);
  if (r.date && key < r.date) return false; // not started yet
  switch (r.repeat) {
    case 'once': return key === r.date;
    case 'daily': return true;
    case 'weekdays': return d.getDay() >= 1 && d.getDay() <= 5;
    case 'weekly': return (r.days || []).includes(d.getDay());
    default: return false;
  }
}
function at(d, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
}

/** Next occurrence strictly after `from`. */
export function nextOccurrence(r, from = new Date()) {
  const base = r.repeat === 'once' && r.date ? parseKey(r.date) : from;
  for (let i = 0; i < 400; i++) {
    const d = addDays(r.repeat === 'once' ? base : from, i);
    if (!occursOn(r, d)) continue;
    const t = at(d, r.time);
    if (t > from) return t;
    if (r.repeat === 'once') return null;
  }
  return null;
}
/** Most recent occurrence at or before `now`. */
function lastOccurrence(r, now) {
  for (let i = 0; i < 8; i++) {
    const d = addDays(now, -i);
    if (!occursOn(r, d)) continue;
    const t = at(d, r.time);
    if (t <= now) return t;
  }
  return null;
}

export function checkReminders() {
  const now = new Date();
  let changed = false;
  for (const r of S().reminders) {
    if (!r.enabled) continue;
    const occ = lastOccurrence(r, now);
    if (!occ) continue;
    const since = Math.max(r.lastFired || 0, r.createdAt || 0);
    // Fire if this occurrence hasn't fired yet and isn't stale (>2h old).
    if (occ.getTime() > since && now - occ < 2 * 3600e3) {
      r.lastFired = now.getTime();
      if (r.repeat === 'once') r.enabled = false;
      changed = true;
      notify(`${r.emoji || '⏰'} ${r.title}`, r.note || 'YourNEETBuddy reminder');
    }
  }
  if (changed) commit();
}

export function upcoming(limit = 5) {
  const now = new Date();
  return S().reminders
    .filter((r) => r.enabled)
    .map((r) => ({ r, next: nextOccurrence(r, now) }))
    .filter((x) => x.next)
    .sort((a, b) => a.next - b.next)
    .slice(0, limit);
}
