// Goals: weekly targets (tracked automatically from study sessions, chapters and quizzes), the NEET target score,
// and personal goals with deadlines — either tracked automatically or updated by hand.
import { S, commit, minutesInRange, daysToExam, syllabusStats, chaptersDoneSince, questionsSince } from '../store.js';
import { icon } from '../icons.js';
import { esc, uid, dateKey, startOfWeek, addDays, fmtDate, fmtHours, parseKey, daysBetween } from '../utils.js';
import { SUBJECTS, subjectById } from '../data.js';
import { ring, toast, openModal, confirmDialog, emptyState } from '../ui.js';

const TYPES = {
  manual: { label: 'I\'ll update it myself', unit: '' },
  subject: { label: 'Chapters done in a subject', unit: 'chapters' },
  questions: { label: 'Questions solved', unit: 'questions' },
  hours: { label: 'Study hours', unit: 'hours' },
  mocks: { label: 'Mock tests taken', unit: 'mocks' },
};
const PRESETS = [
  { title: 'Finish Physics syllabus', type: 'subject', subject: 'physics', days: 120 },
  { title: 'Finish Chemistry syllabus', type: 'subject', subject: 'chemistry', days: 120 },
  { title: 'Finish Botany syllabus', type: 'subject', subject: 'botany', days: 90 },
  { title: 'Finish Zoology syllabus', type: 'subject', subject: 'zoology', days: 90 },
  { title: 'Solve 2,000 MCQs', type: 'questions', target: 2000, days: 60 },
  { title: 'Take 10 full mock tests', type: 'mocks', target: 10, days: 60 },
  { title: 'Study 200 hours this term', type: 'hours', target: 200, days: 45 },
];

/** Current value and target of a goal. */
export function goalProgress(g) {
  const sinceKey = dateKey(new Date(g.createdAt || Date.now()));
  const since = parseKey(sinceKey).getTime();
  if (g.type === 'subject') {
    const st = syllabusStats()[g.subject] || { done: 0, total: 1 };
    return { value: st.done, target: st.total };
  }
  if (g.type === 'questions') return { value: questionsSince(sinceKey), target: g.target };
  if (g.type === 'hours') return { value: Math.floor(minutesInRange(sinceKey, '9999-12-31') / 60), target: g.target };
  if (g.type === 'mocks') return { value: S().quizzes.filter((q) => q.mode === 'mock' && q.at >= since).length, target: g.target };
  return { value: g.progress || 0, target: g.target || 1 };
}

export function mount(el) {
  function weekly() {
    const w = S().goals.weekly;
    const from = dateKey(startOfWeek(new Date()));
    const to = dateKey(addDays(startOfWeek(new Date()), 6));
    const daysLeft = Math.max(1, daysBetween(new Date(), addDays(parseKey(to), 1)));
    const rows = [
      { k: 'hours', label: 'Study hours', ico: 'timer', value: minutesInRange(from, to) / 60, target: w.hours, fmt: (v) => fmtHours(v * 60) + 'h', link: '#/study' },
      { k: 'chapters', label: 'Chapters completed', ico: 'book', value: chaptersDoneSince(from), target: w.chapters, fmt: (v) => String(v), link: '#/syllabus' },
      { k: 'questions', label: 'Questions solved', ico: 'target', value: questionsSince(from), target: w.questions, fmt: (v) => String(v), link: '#/quiz' },
    ];
    return `<div class="card">
      <div class="card-head"><h3>${icon('calendar', 17)} This week</h3><span class="hint">${fmtDate(from)} – ${fmtDate(to)}</span><button class="btn sm ghost" data-edit-weekly>${icon('edit', 14)} Edit targets</button></div>
      <div class="goal-week">${rows.map((r) => {
        const pct = r.target ? Math.min(1, r.value / r.target) : 0;
        const left = Math.max(0, r.target - r.value);
        return `<a class="goal-tile" href="${r.link}">
          ${ring(pct, 76, 8, pct >= 1 ? 'var(--good)' : 'var(--accent)', `${Math.round(pct * 100)}%`)}
          <div><span class="eyebrow">${r.label}</span><div class="v">${r.fmt(r.value)}<small> / ${r.fmt(r.target)}</small></div>
          <span class="hint">${pct >= 1 ? 'Target reached 🎉' : `${r.fmt(r.k === 'hours' ? +(left / daysLeft).toFixed(1) : Math.ceil(left / daysLeft))} a day to finish`}</span></div></a>`;
      }).join('')}</div>
    </div>`;
  }

  function scoreCard() {
    const p = S().profile;
    const days = daysToExam();
    const st = syllabusStats().all;
    const left = st.total - st.done;
    const weeks = Math.max(1, Math.floor(days / 7));
    const mocks = S().quizzes.filter((q) => q.mode === 'mock');
    const last = mocks[0] ? Math.round((Math.max(0, mocks[0].score) / mocks[0].maxScore) * 720) : null;
    return `<div class="card goal-score">
      <div>
        <span class="eyebrow">Target score</span>
        <div class="serif big">${p.targetScore || 650}<small>/ 720</small></div>
        <p class="hint">${last !== null ? `Last mock ≈ <b>${last}</b>/720 · ${last >= (p.targetScore || 650) ? 'on target!' : `${(p.targetScore || 650) - last} marks to go`}` : 'Take a mock test to see where you stand.'}</p>
      </div>
      <div class="stack" style="gap:6px">
        <span><b>${days}</b> <span class="muted">days to NEET</span></span>
        <span><b>${left}</b> <span class="muted">chapters left of ${st.total}</span></span>
        <span><b>${left ? Math.ceil(left / weeks) : 0}</b> <span class="muted">chapters a week needed</span></span>
        <a class="hint" href="#/profile">Change target or exam date →</a>
      </div>
    </div>`;
  }

  function goalCard(g) {
    const { value, target } = goalProgress(g);
    const pct = target ? Math.min(1, value / target) : 0;
    const done = g.done || pct >= 1;
    const dl = g.deadline ? daysBetween(new Date(), parseKey(g.deadline)) : null;
    const s = g.subject ? subjectById(g.subject) : null;
    const unit = g.unit || TYPES[g.type]?.unit || '';
    return `<div class="goal ${done ? 'done' : ''}">
      <div class="row between" style="gap:10px;align-items:flex-start">
        <div class="li-main"><div class="li-title">${done ? '✅ ' : ''}${esc(g.title)}</div>
          <div class="li-sub">${s ? `<span class="dot" style="background:${s.color}"></span>${esc(s.short)} · ` : ''}${g.type === 'manual' ? 'Updated by you' : 'Tracked automatically'}${g.deadline ? ` · ${done ? 'due' : dl < 0 ? '<b style="color:var(--bad)">overdue</b>' : dl === 0 ? 'due today' : `${dl} days left`} (${fmtDate(g.deadline)})` : ''}</div></div>
        <button class="icon-btn sm bare" data-del="${g.id}" aria-label="Delete goal">${icon('trash', 14)}</button>
      </div>
      <div class="progress ${done ? 'good' : ''}" style="margin:10px 0 6px"><i style="width:${pct * 100}%"></i></div>
      <div class="row between"><span class="hint"><b>${value}</b> / ${target} ${esc(unit)}</span>
        ${g.type === 'manual' && !g.done ? `<span class="row" style="gap:6px"><button class="btn sm ghost" data-step="${g.id}" data-n="-1" aria-label="Decrease">−</button><button class="btn sm" data-step="${g.id}" data-n="1" aria-label="Increase">+1</button></span>` : ''}
        ${g.type === 'manual' ? `<button class="btn sm ghost" data-toggle="${g.id}">${g.done ? 'Reopen' : 'Mark done'}</button>` : ''}</div>
    </div>`;
  }

  function draw() {
    const items = S().goals.items;
    const active = items.filter((g) => !(g.done || goalProgress(g).value >= goalProgress(g).target));
    const finished = items.filter((g) => !active.includes(g));
    const unused = PRESETS.filter((p) => !items.some((g) => g.title === p.title));
    el.innerHTML = `
    <div class="grid g-3" style="align-items:start">
      <div class="span-2 stack" style="gap:18px">
        ${weekly()}
        <div class="card">
          <div class="card-head"><h3>${icon('flag', 17)} My goals</h3><button class="btn sm primary" data-new>${icon('plus', 14)} New goal</button></div>
          ${active.length ? `<div class="goal-list">${active.map(goalCard).join('')}</div>` : emptyState('flag', 'No active goals', 'Set a goal with a deadline, e.g. "Finish Class 11 Physics by 31 January".', '<button class="btn sm" data-new>Add a goal</button>')}
          ${finished.length ? `<details style="margin-top:14px"><summary class="label" style="cursor:pointer">Completed (${finished.length})</summary><div class="goal-list" style="margin-top:10px">${finished.map(goalCard).join('')}</div></details>` : ''}
        </div>
      </div>
      <div class="stack" style="gap:18px">
        ${scoreCard()}
        ${unused.length ? `<div class="card"><div class="card-head"><h3>${icon('bulb', 17)} Quick goals</h3></div>
          <div class="stack" style="gap:8px">${unused.map((p) => `<button class="preset" data-preset="${esc(p.title)}"><b>${esc(p.title)}</b><br><span class="hint">by ${fmtDate(dateKey(addDays(new Date(), p.days)))} · tracked automatically</span></button>`).join('')}</div></div>` : ''}
      </div>
    </div>`;
  }

  function editor(g = null) {
    const d = g || { title: '', type: 'manual', target: 10, unit: '', subject: '', deadline: dateKey(addDays(new Date(), 30)) };
    openModal({
      title: g ? 'Edit goal' : 'New goal',
      body: `<form id="gForm" class="stack">
        <div class="field"><label>Goal</label><input class="input" name="title" required maxlength="120" value="${esc(d.title)}" placeholder="e.g. Finish Organic Chemistry revision"></div>
        <div class="field"><label>How to track it</label><select class="select" name="type">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${d.type === k ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div>
        <div class="grid g-2" style="gap:12px">
          <div class="field" data-show="target"><label>Target</label><input class="input" type="number" min="1" max="100000" name="target" value="${d.target || 10}"></div>
          <div class="field" data-show="unit"><label>Unit (optional)</label><input class="input" name="unit" maxlength="20" value="${esc(d.unit || '')}" placeholder="chapters, pages…"></div>
          <div class="field" data-show="subject"><label>Subject</label><select class="select" name="subject">${SUBJECTS.map((s) => `<option value="${s.id}" ${d.subject === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Deadline</label><input class="input" type="date" name="deadline" value="${d.deadline || ''}" min="${dateKey()}"></div>
        </div>
      </form>`,
      foot: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="gSave">Save goal</button>`,
      onMount(m, close) {
        const f = m.querySelector('#gForm');
        const sync = () => {
          const t = f.type.value;
          m.querySelector('[data-show=target]').hidden = t === 'subject';
          m.querySelector('[data-show=unit]').hidden = t !== 'manual';
          m.querySelector('[data-show=subject]').hidden = t !== 'subject';
        };
        f.type.addEventListener('change', sync);
        sync();
        const save = () => {
          const title = f.title.value.trim();
          if (!title) return f.title.focus();
          S().goals.items.push({ id: uid(), title, type: f.type.value, target: Math.max(1, Number(f.target.value) || 1), unit: f.unit.value.trim(), subject: f.type.value === 'subject' ? f.subject.value : '', deadline: f.deadline.value, progress: 0, done: false, createdAt: Date.now() });
          commit();
          close();
          toast('Goal added', 'good', 'You can see it on the dashboard too.');
          draw();
        };
        m.querySelector('#gSave').addEventListener('click', save);
        f.addEventListener('submit', (e) => { e.preventDefault(); save(); });
      },
    });
  }

  function editWeekly() {
    const w = S().goals.weekly;
    openModal({
      title: 'Weekly targets',
      body: `<div class="stack">
        <div class="field"><label>Study hours per week</label><input class="input" type="number" min="1" max="112" id="wH" value="${w.hours}"></div>
        <div class="field"><label>Chapters to complete per week</label><input class="input" type="number" min="0" max="40" id="wC" value="${w.chapters}"></div>
        <div class="field"><label>Questions to solve per week</label><input class="input" type="number" min="0" max="5000" id="wQ" value="${w.questions}"></div>
        <p class="hint">Weeks start on Monday. Progress is counted from your focus sessions, chapter status and tests.</p></div>`,
      foot: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="wSave">Save</button>`,
      onMount(m, close) {
        m.querySelector('#wSave').addEventListener('click', () => {
          w.hours = Math.max(1, Number(m.querySelector('#wH').value) || w.hours);
          w.chapters = Math.max(0, Number(m.querySelector('#wC').value) || 0);
          w.questions = Math.max(0, Number(m.querySelector('#wQ').value) || 0);
          commit();
          close();
          draw();
        });
      },
    });
  }

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    const items = S().goals.items;
    if ('new' in d) editor();
    else if ('editWeekly' in d) editWeekly();
    else if (d.preset) {
      const p = PRESETS.find((x) => x.title === d.preset);
      items.push({ id: uid(), title: p.title, type: p.type, target: p.target || 1, unit: '', subject: p.subject || '', deadline: dateKey(addDays(new Date(), p.days)), progress: 0, done: false, createdAt: Date.now() });
      commit();
      toast('Goal added', 'good');
      draw();
    } else if (d.step) {
      const g = items.find((x) => x.id === d.step);
      g.progress = Math.max(0, (g.progress || 0) + Number(d.n));
      if (g.progress >= g.target) { g.done = true; toast('Goal achieved! 🎉', 'good', g.title); }
      commit();
      draw();
    } else if (d.toggle) {
      const g = items.find((x) => x.id === d.toggle);
      g.done = !g.done;
      if (!g.done && g.progress >= g.target) g.progress = Math.max(0, g.target - 1);
      commit();
      draw();
    } else if (d.del) {
      if (!(await confirmDialog('Delete this goal?', 'Delete'))) return;
      S().goals.items = items.filter((x) => x.id !== d.del);
      commit();
      draw();
    }
  });

  draw();
}
