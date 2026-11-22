import { S, commit, minutesOn, lastNDays, minutesInRange, minutesByDay, studyStreak, bestStreak } from '../store.js';
import { icon } from '../icons.js';
import { esc, dateKey, fmtMin, fmtHours, fmtClock, parseKey, addDays, startOfWeek, fmtDate } from '../utils.js';
import { SUBJECTS, subjectById } from '../data.js';
import { barChart, hbars, emptyState, toast, confirmDialog } from '../ui.js';
import * as T from '../timer.js';

let breakdownRange = 'month';

export function mount(el, params) {
  const st = S();
  let mode = st.timer?.mode || st.settings.lastMode || 'pomodoro';
  let subject = params.subject || st.timer?.subject || st.settings.lastSubject || 'physics';

  if (params.start && !st.timer) {
    T.start(subject, mode);
    st.settings.lastSubject = subject;
    commit();
  }

  const R = 118;
  const C = 2 * Math.PI * R;

  function faceProgress(t) {
    if (!t) return 0;
    if (t.mode === 'pomodoro') return T.elapsed(t) / T.phaseLength(t);
    return (T.elapsed(t) % 3600000) / 3600000;
  }
  function faceTime(t) {
    if (!t) return mode === 'pomodoro' ? fmtClock(st.settings.pomoFocus * 60000) : '00:00';
    return fmtClock(t.mode === 'pomodoro' ? T.phaseLength(t) - T.elapsed(t) : T.elapsed(t));
  }

  function timerCard() {
    const t = S().timer;
    const running = t?.running;
    const phase = t ? (t.phase === 'break' ? 'Break time' : t.running ? 'Focusing' : 'Paused') : 'Ready';
    const color = t?.phase === 'break' ? '#5fd4b0' : '#2fc79e';
    return `
      <div class="seg" role="tablist">
        <button class="${mode === 'pomodoro' ? 'on' : ''}" data-mode="pomodoro" ${t ? 'disabled' : ''}>Pomodoro</button>
        <button class="${mode === 'stopwatch' ? 'on' : ''}" data-mode="stopwatch" ${t ? 'disabled' : ''}>Stopwatch</button>
      </div>
      <div class="timer-face">
        <svg width="260" height="260" viewBox="0 0 260 260"><circle cx="130" cy="130" r="${R}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="8"/>
          <circle id="faceArc" cx="130" cy="130" r="${R}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - faceProgress(t))}"/></svg>
        <div>
          <div class="ph">${phase}${t?.mode === 'pomodoro' && t.cycles ? ` · #${t.cycles + (t.phase === 'focus' ? 1 : 0)}` : ''}</div>
          <div class="t" id="faceTime">${faceTime(t)}</div>
          <div class="subj">${esc(subjectById(t?.subject || subject).name)}</div>
        </div>
      </div>
      <div class="field" style="width:100%;max-width:320px">
        <select class="select" id="tSubject" aria-label="Subject">${SUBJECTS.map((s) => `<option value="${s.id}" ${s.id === (t?.subject || subject) ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      </div>
      <div class="row">
        ${!t ? `<button class="btn accent lg" data-act="start">${icon('play', 16)} Start</button>`
          : running ? `<button class="btn lg" data-act="pause">${icon('pause', 16)} Pause</button>`
          : `<button class="btn accent lg" data-act="resume">${icon('play', 16)} ${t.phase === 'focus' && T.elapsed(t) === 0 ? 'Start focus' : 'Resume'}</button>`}
        ${t ? `<button class="btn lg" data-act="stop" title="Stop & save">${icon('stop', 14)} ${t.phase === 'break' ? 'End' : 'Finish'}</button>
               <button class="icon-btn" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);color:#9c9a92" data-act="discard" title="Discard session" aria-label="Discard">${icon('trash', 16)}</button>` : ''}
      </div>
      ${mode === 'pomodoro' && !t ? `<div class="row hint">Focus <input class="input" style="width:64px;padding:6px 8px" type="number" min="5" max="180" id="pFocus" value="${st.settings.pomoFocus}"> min · Break <input class="input" style="width:58px;padding:6px 8px" type="number" min="1" max="60" id="pBreak" value="${st.settings.pomoBreak}"> min</div>`
        : `<p class="hint">${t?.mode === 'pomodoro' ? 'Each completed focus block is logged automatically.' : 'Press Finish to log your time.'}</p>`}`;
  }

  function yearHeat() {
    const by = minutesByDay();
    const weeks = 26;
    const start = addDays(startOfWeek(new Date()), -(weeks - 1) * 7);
    const today = dateKey();
    const tgt = S().profile.dailyTarget * 60;
    let html = '';
    for (let w = 0; w < weeks; w++) {
      html += '<div class="col">';
      for (let d = 0; d < 7; d++) {
        const k = dateKey(addDays(start, w * 7 + d));
        if (k > today) { html += '<div class="cell fut"></div>'; continue; }
        const m = by[k] || 0;
        const r = m / tgt;
        const l = !m ? '' : r < 0.25 ? 'l1' : r < 0.5 ? 'l2' : r < 0.9 ? 'l3' : 'l4';
        html += `<div class="cell ${l}" title="${fmtDate(k)} · ${fmtMin(m)}"></div>`;
      }
      html += '</div>';
    }
    return html;
  }

  function draw() {
    const s = S();
    const today = dateKey();
    const todayM = minutesOn(today);
    const wk = minutesInRange(dateKey(startOfWeek(new Date())), today);
    const mStart = dateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const mon = minutesInRange(mStart, today);
    const total = s.sessions.reduce((a, x) => a + x.minutes, 0);
    const activeDays = new Set(s.sessions.map((x) => x.date)).size;
    const days14 = lastNDays(14).map((k) => ({ label: parseKey(k).getDate() + '', value: minutesOn(k), today: k === today, title: `${fmtDate(k)} · ${fmtMin(minutesOn(k))}` }));
    const fromKey = breakdownRange === 'week' ? dateKey(startOfWeek(new Date())) : breakdownRange === 'month' ? mStart : '0000';
    const bySub = {};
    s.sessions.filter((x) => x.date >= fromKey).forEach((x) => (bySub[x.subject] = (bySub[x.subject] || 0) + x.minutes));
    const subItems = Object.entries(bySub).sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ label: subjectById(id).short, value: v, color: subjectById(id).color }));
    const recent = [...s.sessions].sort((a, b) => b.at - a.at).slice(0, 7);

    el.innerHTML = `
    <div class="grid g-2" id="studyTop">
      <div class="timer-card" id="timerCard">${timerCard()}</div>
      <div class="stack" style="gap:18px">
        <div class="grid g-2" style="gap:12px">
          ${[
            ['Today', fmtHours(todayM) + 'h', `${Math.round((todayM / (s.profile.dailyTarget * 60)) * 100)}% of target`],
            ['This week', fmtHours(wk) + 'h', `avg ${fmtHours(wk / (((new Date().getDay() + 6) % 7) + 1))}h / day`],
            ['This month', fmtHours(mon) + 'h', `${new Date().toLocaleDateString('en-IN', { month: 'long' })}`],
            ['All time', fmtHours(total) + 'h', `${activeDays} active day${activeDays === 1 ? '' : 's'} · best streak ${bestStreak()}d`],
          ].map(([l, v, h]) => `<div class="card"><div class="stat"><span class="eyebrow">${l}</span><span class="v">${v}</span><span class="hint">${h}</span></div></div>`).join('')}
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('plus', 17)} Log time manually</h3></div>
          <form id="manual" class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
            <select class="select" name="subject" aria-label="Subject">${SUBJECTS.map((x) => `<option value="${x.id}">${esc(x.short)}</option>`).join('')}</select>
            <input class="input" type="date" name="date" value="${today}" max="${today}" aria-label="Date">
            <div class="row" style="gap:6px"><input class="input" type="number" name="h" min="0" max="16" placeholder="Hours" aria-label="Hours"><input class="input" type="number" name="m" min="0" max="59" placeholder="Min" aria-label="Minutes"></div>
            <input class="input" name="note" placeholder="What did you study? (optional)" aria-label="Note">
            <button class="btn primary" style="grid-column:1/-1">Add session</button>
          </form>
        </div>
      </div>
    </div>

    <div class="grid g-3" style="margin-top:18px">
      <div class="card span-2">
        <div class="card-head"><h3>${icon('chart', 17)} Last 14 days</h3><span class="muted">Streak ${studyStreak()}d · target ${s.profile.dailyTarget}h</span></div>
        ${barChart(days14, { target: s.profile.dailyTarget * 60, fmt: fmtHours })}
      </div>
      <div class="card">
        <div class="card-head"><h3>By subject</h3>
          <div class="seg">${['week', 'month', 'all'].map((r) => `<button class="${breakdownRange === r ? 'on' : ''}" data-range="${r}">${r[0].toUpperCase() + r.slice(1)}</button>`).join('')}</div></div>
        ${subItems.length ? hbars(subItems, fmtMin) : emptyState('chart', 'No data yet', 'Your subject split appears after your first session.')}
      </div>
    </div>

    <div class="grid g-2" style="margin-top:18px">
      <div class="card">
        <div class="card-head"><h3>Study heatmap</h3><span class="muted">last 6 months</span></div>
        <div class="heatmap">${yearHeat()}</div>
        <div class="legend" style="margin-top:10px">0h <span class="cell" style="background:var(--bg-2)"></span><span class="cell" style="background:color-mix(in srgb,var(--accent) 25%,var(--bg-2))"></span><span class="cell" style="background:color-mix(in srgb,var(--accent) 50%,var(--bg-2))"></span><span class="cell" style="background:color-mix(in srgb,var(--accent) 75%,var(--bg-2))"></span><span class="cell" style="background:var(--accent)"></span> target</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Recent sessions</h3></div>
        ${recent.length ? `<div class="list">${recent.map((x) => `
          <div class="li"><span class="dot" style="background:${subjectById(x.subject).color}"></span>
            <div class="li-main"><div class="li-title">${esc(subjectById(x.subject).short)} · ${fmtMin(x.minutes)}</div>
            <div class="li-sub">${fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}${x.note ? ' · ' + esc(x.note) : ''} · ${x.source === 'manual' ? 'manual' : 'timer'}</div></div>
            <div class="li-actions"><button class="icon-btn sm bare" data-del="${x.id}" aria-label="Delete session">${icon('trash', 15)}</button></div></div>`).join('')}</div>`
          : emptyState('timer', 'No sessions yet', 'Start the timer or log time manually.')}
      </div>
    </div>`;
  }

  function redrawTimer() {
    const c = el.querySelector('#timerCard');
    if (c) c.innerHTML = timerCard();
  }

  // Live updates without a full redraw.
  let lastSig = '';
  const onTick = () => {
    const t = S().timer;
    const sig = t ? `${t.phase}|${t.running}|${t.cycles}` : 'none';
    if (sig !== lastSig) {
      const first = lastSig === '';
      lastSig = sig;
      if (!first) return draw(); // phase change (e.g. pomodoro auto-logged) → refresh stats too
    }
    const ft = el.querySelector('#faceTime');
    const arc = el.querySelector('#faceArc');
    if (ft) ft.textContent = faceTime(t);
    if (arc) arc.setAttribute('stroke-dashoffset', C * (1 - faceProgress(t)));
  };
  window.addEventListener('ynb:tick', onTick);

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.mode) { mode = d.mode; S().settings.lastMode = mode; commit(); redrawTimer(); }
    else if (d.range) { breakdownRange = d.range; draw(); }
    else if (d.act === 'start') {
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
      T.start(subject, mode);
      S().settings.lastSubject = subject;
      commit();
      redrawTimer();
    } else if (d.act === 'pause') { T.pause(); redrawTimer(); }
    else if (d.act === 'resume') { T.resume(); redrawTimer(); }
    else if (d.act === 'stop') { T.stop(true); draw(); }
    else if (d.act === 'discard') {
      if (await confirmDialog('Discard the current session without logging it?', 'Discard')) { T.stop(false); draw(); }
    } else if (d.del) {
      S().sessions = S().sessions.filter((x) => x.id !== d.del);
      commit();
      draw();
    }
  });
  el.addEventListener('change', (e) => {
    if (e.target.id === 'tSubject') {
      subject = e.target.value;
      S().settings.lastSubject = subject;
      if (S().timer) T.setSubject(subject);
      else commit();
      redrawTimer();
    }
    if (e.target.id === 'pFocus' || e.target.id === 'pBreak') {
      S().settings.pomoFocus = Math.max(5, Math.min(180, Number(el.querySelector('#pFocus').value) || 25));
      S().settings.pomoBreak = Math.max(1, Math.min(60, Number(el.querySelector('#pBreak').value) || 5));
      commit();
      redrawTimer();
    }
  });
  el.addEventListener('submit', (e) => {
    if (e.target.id !== 'manual') return;
    e.preventDefault();
    const f = e.target;
    const mins = (Number(f.h.value) || 0) * 60 + (Number(f.m.value) || 0);
    if (mins < 1) return toast('Enter hours or minutes', 'bad');
    if (mins > 16 * 60) return toast('That is more than 16 hours — split it into sessions', 'bad');
    T.logSession(f.subject.value, mins, f.note.value.trim(), 'manual', f.date.value || dateKey());
    commit();
    toast(`Logged ${fmtMin(mins)}`, 'good');
    draw();
  });

  draw();
  return () => window.removeEventListener('ynb:tick', onTick);
}
