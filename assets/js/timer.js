// Study timer engine (stopwatch + pomodoro). State persists in the store so it survives reloads.
import { S, commit } from './store.js';
import { dateKey, uid, fmtMin } from './utils.js';
import { notify, toast } from './ui.js';

export function elapsed(t = S().timer) {
  if (!t) return 0;
  return t.elapsed + (t.running ? Date.now() - t.startedAt : 0);
}
export function phaseLength(t = S().timer) {
  if (!t || t.mode !== 'pomodoro') return 0;
  return (t.phase === 'break' ? t.breakMin : t.focusMin) * 60000;
}

export function start(subject, mode = 'stopwatch') {
  const s = S().settings;
  S().timer = {
    subject, mode, phase: 'focus', running: true, startedAt: Date.now(), elapsed: 0,
    focusMin: Number(s.pomoFocus) || 25, breakMin: Number(s.pomoBreak) || 5, cycles: 0,
  };
  commit();
}
export function pause() {
  const t = S().timer;
  if (!t || !t.running) return;
  t.elapsed = elapsed(t);
  t.running = false;
  commit();
}
export function resume() {
  const t = S().timer;
  if (!t || t.running) return;
  t.startedAt = Date.now();
  t.running = true;
  commit();
}
export function setSubject(subject) {
  if (S().timer) {
    S().timer.subject = subject;
    commit();
  }
}

export function logSession(subject, minutes, note = '', source = 'timer', date = dateKey()) {
  minutes = Math.round(minutes);
  if (minutes < 1) return false;
  S().sessions.push({ id: uid(), date, subject, minutes, note, source, at: Date.now() });
  return true;
}

/** Stop and (optionally) save the focus time. */
export function stop(save = true) {
  const t = S().timer;
  if (!t) return;
  const mins = elapsed(t) / 60000;
  let saved = false;
  if (save && t.phase === 'focus') saved = logSession(t.subject, mins);
  S().timer = null;
  commit();
  if (save) {
    if (saved) toast(`Logged ${fmtMin(mins)} of study`, 'good');
    else if (t.phase === 'focus') toast('Session under a minute — not logged', 'info');
  }
}

/** Called every second by the app shell. Handles pomodoro phase transitions. */
export function tick() {
  const t = S().timer;
  if (!t || !t.running || t.mode !== 'pomodoro') return;
  if (elapsed(t) < phaseLength(t)) return;
  if (t.phase === 'focus') {
    logSession(t.subject, t.focusMin);
    t.cycles++;
    t.phase = 'break';
    t.elapsed = 0;
    t.startedAt = Date.now();
    commit();
    notify('Focus block complete 🎉', `${t.focusMin} min logged. Take a ${t.breakMin}-min break.`);
  } else {
    t.phase = 'focus';
    t.elapsed = 0;
    t.running = false;
    commit();
    notify('Break over', 'Press play when you are ready for the next focus block.');
  }
}
