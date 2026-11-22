import { S, commit, minutesOn, lastNDays, studyStreak, tasksFor, daysToExam, journeyProgress, quizAccuracy, notesDue, minutesInRange, syllabusStats } from '../store.js';
import { goalProgress } from './goals.js';
import { icon } from '../icons.js';
import { esc, dateKey, fmtMin, fmtHours, greeting, parseKey, fmtDate, uid, fmtTime12 } from '../utils.js';
import { ring, barChart, emptyState } from '../ui.js';
import { TIPS, subjectById, SUBJECTS } from '../data.js';
import { upcoming } from '../reminders-engine.js';
import { plain } from '../md.js';
import { cloud, onCloudChange } from '../cloud.js';

export function mount(el, _p, { setSub }) {
  const today = dateKey();
  setSub(new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

  function draw() {
    const st = S();
    const p = st.profile;
    // First name: from the profile, else from the signed-in Google account, else a friendly default.
    const meta = cloud().user?.user_metadata || {};
    const name = (p.name || meta.given_name || meta.full_name || meta.name || '').trim().split(/\s+/)[0] || 'Future Doctor';
    const target = p.dailyTarget * 60;
    const todayMin = minutesOn(today);
    const streak = studyStreak();
    const tasks = tasksFor(today);
    const done = tasks.filter((t) => t.done).length;
    const acc = quizAccuracy(30);
    const days = daysToExam();
    const prog = journeyProgress();
    const tip = TIPS[new Date().getDate() % TIPS.length];
    const week = lastNDays(7).map((k) => ({ label: parseKey(k).toLocaleDateString('en-IN', { weekday: 'short' }), value: minutesOn(k), today: k === today, title: fmtMin(minutesOn(k)) }));
    const weekTotal = week.reduce((a, b) => a + b.value, 0);
    const prevWeek = minutesInRange(lastNDays(14)[0], lastNDays(14)[6]);
    const delta = prevWeek ? Math.round(((weekTotal - prevWeek) / prevWeek) * 100) : null;
    const rems = upcoming(4);
    const due = notesDue();
    const recentNotes = [...st.notes].sort((a, b) => (b.openedAt || b.updatedAt) - (a.openedAt || a.updatedAt)).slice(0, 3);
    const syl = syllabusStats();
    const goals = st.goals.items.filter((g) => !g.done && goalProgress(g).value < goalProgress(g).target).slice(0, 4);
    const segs = 12;
    const doneSegs = prog * segs;

    el.innerHTML = `
    <section class="hero">
      <div>
        <div class="eyebrow" style="color:#8fa09b">${esc(greeting())}, <span style="color:#9fe6cf">${esc(name)}</span></div>
        <h2>Every hour today<br>is a mark out of <em>720.</em></h2>
        <p class="lead">${todayMin ? `You've studied <b style="color:#fff">${fmtMin(todayMin)}</b> today — ${todayMin >= target ? 'target achieved. Brilliant work.' : `${fmtMin(target - todayMin)} to go for your ${p.dailyTarget}h target.`}` : `Your ${p.dailyTarget}-hour target is waiting. Start with one focused block.`}</p>
        <div class="row wrap" style="margin-top:18px">
          <a class="btn accent" href="#/study?start=1">${icon('play', 16)} Start focus session</a>
          <a class="btn" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14);color:#eef4f2" href="#/syllabus">${icon('book', 16)} Study a chapter</a>
        </div>
        <div class="tip">${icon('bulb', 18)}<span>${esc(tip)}</span></div>
      </div>
      <div class="hero-count">
        <div class="l">Days to NEET (UG)</div>
        <div class="n">${days}</div>
        <div class="d">${fmtDate(p.examDate, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div class="phase-track" title="${Math.round(prog * 100)}% of your preparation window elapsed">
          ${Array.from({ length: segs }, (_, i) => `<i class="${i + 1 <= doneSegs ? 'done' : i < doneSegs ? 'now' : ''}"></i>`).join('')}
        </div>
        <div class="d">${Math.round(prog * 100)}% of the journey · ${Math.round(days / 7)} weeks left</div>
      </div>
    </section>

    <section class="grid g-4" style="margin-top:18px">
      <div class="card stat-card">
        <div class="stat"><span class="eyebrow">Today</span><span class="v">${fmtHours(todayMin)}<small>/ ${p.dailyTarget}h</small></span><span class="hint">study hours</span></div>
        ${ring(todayMin / target, 64, 7, 'var(--accent)', `${Math.min(100, Math.round((todayMin / target) * 100))}%`)}
      </div>
      <div class="card stat-card">
        <div class="stat"><span class="eyebrow">Streak</span><span class="v">${streak}<small>day${streak === 1 ? '' : 's'}</small></span><span class="hint">30+ min daily</span></div>
        <div class="stat-ico" style="color:var(--accent);background:var(--accent-soft);border:0">${icon('flame', 20)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat"><span class="eyebrow">Tasks</span><span class="v">${done}<small>/ ${tasks.length}</small></span><span class="hint">completed today</span></div>
        ${ring(tasks.length ? done / tasks.length : 0, 64, 7, 'var(--good)', tasks.length ? `${Math.round((done / tasks.length) * 100)}%` : '—')}
      </div>
      <div class="card stat-card">
        <div class="stat"><span class="eyebrow">Quiz accuracy</span><span class="v">${acc === null ? '—' : acc}<small>${acc === null ? '' : '%'}</small></span><span class="hint">last 30 days</span></div>
        <div class="stat-ico" style="color:var(--info);background:var(--info-soft);border:0">${icon('target', 20)}</div>
      </div>
    </section>

    <section class="grid g-3" style="margin-top:18px">
      <div class="card span-2">
        <div class="card-head"><h3>${icon('book', 17)} Syllabus covered</h3><a class="btn sm ghost" href="#/syllabus">Study ${icon('right', 14)}</a></div>
        <div class="cover-subjects">${SUBJECTS.map((s) => { const x = syl[s.id]; return `<a class="cover-subj" href="#/syllabus?subject=${s.id}">
          <span class="row between"><span class="subj-ico sm" style="--c:${s.color}">${icon(s.icon, 15)}</span><span class="hint">${x.total ? Math.round((x.done / x.total) * 100) : 0}%</span></span>
          <span><b>${x.done}</b><span class="muted"> / ${x.total}</span></span><span class="hint">${esc(s.short)} chapters</span>
          <div class="progress"><i style="width:${x.total ? (x.done / x.total) * 100 : 0}%;background:${s.color}"></i></div></a>`; }).join('')}</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>${icon('flag', 17)} Goals</h3><a class="btn sm ghost" href="#/goals">Open ${icon('right', 14)}</a></div>
        ${goals.length ? `<div class="list">${goals.map((g) => { const gp = goalProgress(g); return `<a class="li" href="#/goals" style="text-decoration:none;flex-direction:column;align-items:stretch;gap:6px">
          <div class="row between"><span class="li-title">${esc(g.title)}</span><span class="hint">${gp.value}/${gp.target}</span></div>
          <div class="progress"><i style="width:${Math.min(100, (gp.value / (gp.target || 1)) * 100)}%"></i></div></a>`; }).join('')}</div>`
          : emptyState('flag', 'No goals yet', 'Set weekly targets and goals with deadlines.', '<a class="btn sm" href="#/goals">Set a goal</a>')}
      </div>
    </section>

    <section class="grid g-3" style="margin-top:18px">
      <div class="card span-2">
        <div class="card-head"><h3>${icon('chart', 17)} This week</h3>
          <span class="muted">${fmtMin(weekTotal)} total${delta !== null ? ` · <b style="color:${delta >= 0 ? 'var(--good)' : 'var(--bad)'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%</b> vs last week` : ''}</span></div>
        ${barChart(week, { target, fmt: fmtHours })}
      </div>
      <div class="card">
        <div class="card-head"><h3>${icon('tracker', 17)} Today's plan</h3><a class="btn sm ghost" href="#/tracker">Open ${icon('right', 14)}</a></div>
        <form class="row" id="qAdd" style="margin-bottom:6px">
          <input class="input" name="t" placeholder="Add a task for today…" autocomplete="off" aria-label="New task">
          <button class="icon-btn" aria-label="Add task">${icon('plus')}</button>
        </form>
        <div class="list">
          ${tasks.length ? tasks.slice(0, 6).map((t) => `
            <div class="li ${t.done ? 'done' : ''}">
              <button class="check ${t.done ? 'on' : ''}" data-toggle="${t.id}" aria-label="Toggle task">${icon('check', 14)}</button>
              <div class="li-main"><div class="li-title">${esc(t.title)}</div>
              ${t.subject ? `<div class="li-sub"><span class="dot" style="background:${subjectById(t.subject).color}"></span>${esc(subjectById(t.subject).short)}${t.mins ? ` · ${fmtMin(t.mins)}` : ''}</div>` : ''}</div>
            </div>`).join('') + (tasks.length > 6 ? `<a class="hint" href="#/tracker" style="padding-top:8px">+${tasks.length - 6} more</a>` : '') : `<p class="hint" style="padding:12px 0">No tasks yet. What's the one thing that would make today a win?</p>`}
        </div>
      </div>
    </section>

    <section class="grid g-3" style="margin-top:18px">
      <div class="card">
        <div class="card-head"><h3>${icon('bell', 17)} Up next</h3><a class="btn sm ghost" href="#/reminders">Manage</a></div>
        ${rems.length ? `<div class="list">${rems.map(({ r, next }) => `
          <div class="li"><div class="stat-ico" style="font-size:17px">${esc(r.emoji || '⏰')}</div>
          <div class="li-main"><div class="li-title">${esc(r.title)}</div><div class="li-sub">${next.toDateString() === new Date().toDateString() ? 'Today' : next.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtTime12(r.time)}</div></div></div>`).join('')}</div>`
          : emptyState('bell', 'No reminders', 'Set reminders for NCERT reading, revision and mock tests.', '<a class="btn sm" href="#/reminders">Add reminder</a>')}
      </div>
      <div class="card">
        <div class="card-head"><h3>${icon('revise', 17)} Revision queue</h3><a class="btn sm ghost" href="#/notes${due.length ? '?filter=due' : ''}">Notes</a></div>
        ${due.length ? `<div class="list">${due.slice(0, 4).map((n) => `
          <a class="li" href="#/notes?id=${n.id}" style="text-decoration:none"><span class="dot" style="background:${subjectById(n.subject).color}"></span>
          <div class="li-main"><div class="li-title">${esc(n.title || 'Untitled')}</div><div class="li-sub">Revision #${(n.revisions || 0) + 1} due</div></div>${icon('right', 16)}</a>`).join('')}</div>`
          : recentNotes.length ? `<p class="hint" style="margin-bottom:6px">Nothing due. Recently visited:</p><div class="list">${recentNotes.map((n) => `
          <a class="li" href="#/notes?id=${n.id}" style="text-decoration:none"><span class="dot" style="background:${subjectById(n.subject).color}"></span>
          <div class="li-main"><div class="li-title">${esc(n.title || 'Untitled')}</div><div class="li-sub">${esc(plain(n.body, 60))}</div></div></a>`).join('')}</div>`
          : emptyState('notes', 'No notes yet', 'Notes you mark for revision will appear here.', '<a class="btn sm" href="#/notes?new=1">Write a note</a>')}
      </div>
      <div class="card">
        <div class="card-head"><h3>${icon('sparkles', 17)} Quick start</h3></div>
        <div class="quick-links" style="grid-template-columns:1fr 1fr">
          ${[
            ['study?start=1', 'timer', 'Focus', 'Pomodoro / stopwatch', 'var(--accent-soft)', 'var(--accent)'],
            ['quiz?mode=chapter', 'check', 'Chapter test', 'Offline, instant', 'var(--good-soft)', 'var(--good)'],
            ['quiz?mode=ai', 'sparkles', 'AI Quiz', 'Any chapter, any topic', 'var(--info-soft)', 'var(--info)'],
            ['quiz?mode=mock', 'trophy', 'Mock test', 'Timed · +4 / −1', 'var(--warn-soft)', 'var(--warn)'],
          ].map(([h, i, b, s, bg, c]) => `<a class="ql" href="#/${h}"><span class="ql-ico" style="background:${bg};color:${c}">${icon(i, 19)}</span><b>${b}</b><span>${s}</span></a>`).join('')}
        </div>
      </div>
    </section>`;
  }

  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-toggle]');
    if (t) {
      const task = tasksFor(today).find((x) => x.id === t.dataset.toggle);
      if (task) task.done = !task.done;
      commit();
      draw();
    }
  });
  el.addEventListener('submit', (e) => {
    if (e.target.id !== 'qAdd') return;
    e.preventDefault();
    const v = e.target.t.value.trim();
    if (!v) return;
    tasksFor(today).push({ id: uid(), title: v, subject: guessSubject(v), mins: 0, done: false });
    commit();
    draw();
    el.querySelector('#qAdd input')?.focus();
  });

  draw();
  // Redraw when sign-in finishes so the account's name appears without a reload.
  let lastUser = cloud().user?.id;
  const off = onCloudChange(() => {
    if (!el.isConnected) return off();
    if (cloud().user?.id !== lastUser) { lastUser = cloud().user?.id; draw(); }
  });
  return off;
}

// Light heuristic: tag a quick task with a subject if its name appears in the text.
function guessSubject(text) {
  const t = text.toLowerCase();
  const hit = SUBJECTS.find((s) => t.includes(s.short.toLowerCase()) || t.includes(s.id));
  return hit ? hit.id : '';
}
