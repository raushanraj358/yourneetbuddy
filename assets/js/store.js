// Local-first persistent store (localStorage). All app data lives on the user's device.
import { HABITS, EXAM, SUBJECTS, chaptersOf } from './data.js';
import { dateKey, addDays, parseKey, startOfDay, daysBetween } from './utils.js';

const KEY = 'ynb:v1';

function defaults() {
  return {
    v: 1,
    profile: { name: '', examDate: EXAM.date, startDate: dateKey(), dailyTarget: 8, targetScore: 650, onboarded: false },
    settings: { theme: 'system', provider: 'gemini', geminiKey: '', geminiModel: 'auto', apiKey: '', model: 'gpt-4o-mini', pomoFocus: 25, pomoBreak: 5, sound: true },
    tasks: {}, // { 'YYYY-MM-DD': [{id,title,subject,mins,done,priority}] }
    journal: {}, // { 'YYYY-MM-DD': 'text' }
    habits: { defs: HABITS.map((h) => ({ ...h })), log: {} }, // log: { date: [habitIds] }
    sessions: [], // {id,date,subject,minutes,note,source,at}
    timer: null,
    reminders: [],
    notes: [],
    resources: [], // user-added
    library: {}, // curated id -> 'todo' | 'doing' | 'done'
    quizzes: [],
    syllabus: { status: {}, topics: {}, material: {}, doneAt: {}, noteIds: {} }, // status/material/doneAt: 'subject::chapterId'; topics: 'subject::chapterId::topic' → true
    goals: { weekly: { hours: 42, chapters: 4, questions: 300 }, items: [] }, // items: {id,title,target,progress,unit,deadline,subject,done,createdAt}
  };
}

const MERGE_KEYS = ['profile', 'settings', 'habits', 'syllabus', 'goals'];
function load() {
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    for (const k of Object.keys(s)) {
      if (MERGE_KEYS.includes(k) && s[k] && typeof s[k] === 'object') d[k] = { ...d[k], ...s[k] };
      else d[k] = s[k];
    }
    // Google retired the 2.5 models; move anyone who picked one back to Auto.
    if (/^gemini-2\./.test(d.settings.geminiModel || '')) d.settings.geminiModel = 'auto';
    return d;
  } catch {
    return d;
  }
}

let state = load();
const subs = new Set();

export const S = () => state;
export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
export function commit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error(e);
    window.dispatchEvent(new CustomEvent('ynb:toast', { detail: { msg: 'Storage is full — export a backup and delete old data.', type: 'bad' } }));
  }
  subs.forEach((fn) => fn(state));
}
export function replaceAll(next) {
  const d = defaults();
  state = { ...d, ...next, profile: { ...d.profile, ...(next.profile || {}) }, settings: { ...d.settings, ...(next.settings || {}) }, syllabus: { ...d.syllabus, ...(next.syllabus || {}) }, goals: { ...d.goals, ...(next.goals || {}) } };
  commit();
}
export function resetAll() {
  state = defaults();
  commit();
}
/** A copy of all data without secrets (API keys never leave this device). */
export function snapshot() {
  const copy = JSON.parse(JSON.stringify(state));
  copy.settings.apiKey = '';
  copy.settings.geminiKey = '';
  return copy;
}
export function exportJSON() {
  const copy = snapshot();
  copy.exportedAt = new Date().toISOString();
  return JSON.stringify(copy, null, 2);
}
/** True when this device holds no meaningful study data yet. */
export function isBlank(st = state) {
  const tasks = Object.values(st.tasks || {}).some((l) => l && l.length);
  return !tasks && !(st.sessions || []).length && !(st.notes || []).length && !(st.quizzes || []).length && !(st.reminders || []).length && !(st.resources || []).length && !Object.keys(st.library || {}).length && !Object.keys(st.syllabus?.status || {}).length && !Object.keys(st.syllabus?.material || {}).length && !(st.goals?.items || []).length;
}
export function dataSummary(st = state) {
  const mins = (st.sessions || []).reduce((a, s) => a + (s.minutes || 0), 0);
  return `${(mins / 60).toFixed(1).replace(/\.0$/, '')}h studied · ${(st.sessions || []).length} sessions · ${(st.notes || []).length} notes · ${(st.quizzes || []).length} quizzes · ${Object.values(st.syllabus?.status || {}).filter((v) => v === 'done' || v === 'revised').length} chapters done`;
}

/* ---------------- Derived metrics ---------------- */

export function minutesOn(key) {
  return state.sessions.reduce((a, s) => (s.date === key ? a + s.minutes : a), 0);
}
export function minutesByDay() {
  const m = {};
  for (const s of state.sessions) m[s.date] = (m[s.date] || 0) + s.minutes;
  return m;
}
export function lastNDays(n, end = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(dateKey(addDays(end, -i)));
  return out;
}
export function minutesInRange(fromKey, toKey) {
  return state.sessions.reduce((a, s) => (s.date >= fromKey && s.date <= toKey ? a + s.minutes : a), 0);
}
export function studyStreak(minMinutes = 30) {
  const by = minutesByDay();
  let d = new Date();
  // Today doesn't break the streak until it's over.
  if ((by[dateKey(d)] || 0) < minMinutes) d = addDays(d, -1);
  let n = 0;
  while ((by[dateKey(d)] || 0) >= minMinutes) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
export function bestStreak(minMinutes = 30) {
  const by = minutesByDay();
  const keys = Object.keys(by).filter((k) => by[k] >= minMinutes).sort();
  let best = 0, cur = 0, prev = null;
  for (const k of keys) {
    cur = prev && daysBetween(parseKey(prev), parseKey(k)) === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = k;
  }
  return best;
}
export function tasksFor(key) {
  return state.tasks[key] || (state.tasks[key] = []);
}
export function daysToExam() {
  return Math.max(0, daysBetween(new Date(), parseKey(state.profile.examDate)));
}
export function journeyProgress() {
  const start = parseKey(state.profile.startDate || dateKey());
  const end = parseKey(state.profile.examDate);
  const total = Math.max(1, daysBetween(start, end));
  return Math.min(1, Math.max(0, daysBetween(start, new Date()) / total));
}
export function quizAccuracy(days = 30) {
  const since = Date.now() - days * 864e5;
  let c = 0, t = 0;
  for (const q of state.quizzes) {
    if (q.at < since) continue;
    c += q.correct;
    t += q.correct + q.wrong;
  }
  return t ? Math.round((c / t) * 100) : null;
}
export function notesDue() {
  const today = dateKey();
  return state.notes.filter((n) => n.nextRevision && n.nextRevision <= today);
}
export function habitDoneCount(key) {
  return (state.habits.log[key] || []).length;
}
export { startOfDay };

/* ---------------- NEET syllabus progress ---------------- */
export const isDoneStatus = (st) => st === 'done' || st === 'revised';
export const chapterKey = (sub, id) => `${sub}::${id}`;
/** Per-subject chapter coverage: { physics: { total, done, reading, revised, topicsDone, topicsTotal }, … , all: {…} } */
export function syllabusStats() {
  const out = {};
  const all = { total: 0, done: 0, reading: 0, revised: 0, topicsDone: 0, topicsTotal: 0 };
  const st = state.syllabus.status || {};
  const tp = state.syllabus.topics || {};
  for (const s of SUBJECTS) {
    const o = { total: 0, done: 0, reading: 0, revised: 0, topicsDone: 0, topicsTotal: 0 };
    for (const c of chaptersOf(s.id)) {
      const k = chapterKey(s.id, c.id);
      o.total++;
      if (isDoneStatus(st[k])) o.done++;
      if (st[k] === 'reading') o.reading++;
      if (st[k] === 'revised') o.revised++;
      o.topicsTotal += c.topics.length;
      o.topicsDone += c.topics.filter((t) => tp[`${k}::${t}`]).length;
    }
    out[s.id] = o;
    for (const f of Object.keys(all)) all[f] += o[f];
  }
  out.all = all;
  return out;
}
/** Chapters marked done/revised since a date key (for weekly goals). */
export function chaptersDoneSince(fromKey) {
  const since = parseKey(fromKey).getTime();
  return Object.entries(state.syllabus.doneAt || {}).filter(([k, t]) => t >= since && isDoneStatus(state.syllabus.status[k])).length;
}
export function questionsSince(fromKey) {
  const since = parseKey(fromKey).getTime();
  return state.quizzes.reduce((a, q) => (q.at >= since ? a + q.correct + q.wrong : a), 0);
}
