// Quiz: offline chapter tests from the built-in question bank, AI-generated quizzes, and timed NEET mock tests.
// NEET marking: +4 for a correct answer, −1 for a wrong one, 0 for unattempted.
import { S, commit } from '../store.js';
import { icon } from '../icons.js';
import { esc, uid, fmtClock, shuffle, timeAgo, dateKey, addDays } from '../utils.js';
import { SUBJECTS, EXAM, chaptersOf, chapterById, subjectById } from '../data.js';
import { chapterQuestions, subjectQuestions } from '../content.js';
import { runAI, cleanMCQs, hasAI, friendlyError, AIError } from '../ai.js';
import { toast, hbars, emptyState, ring, confirmDialog } from '../ui.js';

const DIFFICULTY = ['Easy', 'Moderate', 'NEET standard', 'Tough'];
const PATTERNS = ['NCERT direct', 'Assertion–Reason', 'Statement-based', 'Match the columns', 'Numerical'];
const MODES = {
  chapter: { label: 'Chapter test', desc: 'Offline question bank · instant', icon: 'check' },
  ai: { label: 'AI quiz', desc: 'Fresh questions on any topic', icon: 'sparkles' },
  mock: { label: 'Mock test', desc: 'Timed NEET pattern · +4 / −1', icon: 'trophy' },
};
const MOCKS = {
  mini: { label: 'Mini mock', per: 10, mins: 45, desc: '40 questions · 10 per subject · 45 min' },
  half: { label: 'Half mock', per: 23, mins: 90, desc: '92 questions · 23 per subject · 90 min' },
  full: { label: 'Full NEET mock', per: 45, mins: 180, desc: '180 questions · 45 per subject · 180 min' },
};
const LOADING_LINES = ['Reading the NCERT chapter…', 'Studying NEET PYQ patterns…', 'Framing statements carefully…', 'Crafting tricky distractors…', 'Double-checking calculations…', 'Writing explanations…'];
const MARK = EXAM.mark;
const NEG = EXAM.neg;

// Module-level state survives navigation within the session.
let cfg = { mode: 'chapter', subject: 'physics', chapter: '', topic: '', difficulty: 'NEET standard', count: 10, language: 'en', patterns: [...PATTERNS], practice: true, context: '', contextTitle: '', mock: 'mini' };
let phase = 'setup'; // setup | loading | play | result | history
let session = null;
let lastError = null;
let controller = null;

const subjOf = (q) => q.subject || session?.meta.subject;

export function mount(el, params) {
  if (params.mode && MODES[params.mode]) { cfg.mode = params.mode; phase = 'setup'; }
  if (params.subject && SUBJECTS.some((s) => s.id === params.subject)) { cfg.subject = params.subject; cfg.chapter = ''; phase = 'setup'; }
  if (params.chapter && chapterById(cfg.subject, params.chapter)) cfg.chapter = params.chapter;
  if (params.note) {
    const n = S().notes.find((x) => x.id === params.note);
    if (n) {
      cfg.mode = 'ai';
      cfg.context = `${n.title}\n\n${n.body}`.slice(0, 6000);
      cfg.contextTitle = n.title || 'Untitled note';
      cfg.topic = n.title || '';
      if (SUBJECTS.some((s) => s.id === n.subject)) cfg.subject = n.subject;
      cfg.chapter = '';
      phase = 'setup';
    }
  }
  if (params.topic) { cfg.topic = params.topic; phase = 'setup'; }

  const draw = () => {
    if (phase === 'setup') el.innerHTML = setupView();
    else if (phase === 'loading') el.innerHTML = loadingView();
    else if (phase === 'play') el.innerHTML = playView();
    else if (phase === 'result') el.innerHTML = resultView();
    else if (phase === 'history') el.innerHTML = historyView();
  };

  /* ---------------- Setup ---------------- */
  function subjectChips() {
    return `<div class="field"><span class="label">Subject</span><div class="subj-grid">${SUBJECTS.map((s) => `
      <button class="chip ${cfg.subject === s.id ? 'on' : ''}" data-subject="${s.id}"><span class="dot" style="background:${s.color}"></span>${esc(s.short)}</button>`).join('')}</div></div>`;
  }
  function chapterSelect(allLabel) {
    return `<div class="field"><label for="qChapter">Chapter</label>
      <select class="select" id="qChapter"><option value="">${allLabel}</option>
      ${[11, 12].map((cls) => `<optgroup label="Class ${cls}">${chaptersOf(cfg.subject).filter((c) => c.cls === cls).map((c) => `<option value="${c.id}" ${cfg.chapter === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}
      </select></div>`;
  }
  function practiceSwitch() {
    return `<label class="row" style="cursor:pointer"><span class="switch"><input type="checkbox" id="qPractice" ${cfg.practice ? 'checked' : ''}><span></span></span>
      <span><b style="font-size:14px">Practice mode</b><br><span class="hint">See the answer and explanation right after each question (otherwise: exam mode).</span></span></label>`;
  }

  function setupView() {
    const aiReady = hasAI();
    const ch = chapterById(cfg.subject, cfg.chapter);
    let form;
    if (cfg.mode === 'chapter') {
      form = `${subjectChips()}${chapterSelect(`All ${subjectById(cfg.subject).short} chapters (mixed)`)}
        <div class="field"><span class="label">Number of questions</span><div class="seg">${[10, 20, 30, 0].map((c) => `<button class="${cfg.count === c ? 'on' : ''}" data-count="${c}">${c || 'All'}</button>`).join('')}</div></div>
        ${practiceSwitch()}
        <div class="notice info">${icon('book', 18)}<div style="flex:1">Built-in NCERT-based questions — no internet or AI needed. ${ch ? `Testing <b>${esc(ch.name)}</b>.` : 'Questions are mixed from every chapter of the subject.'}</div></div>
        <div class="row wrap"><button class="btn accent lg" data-start-chapter>${icon('play', 17)} Start chapter test</button></div>`;
    } else if (cfg.mode === 'mock') {
      form = `<div class="field"><span class="label">Test length</span><div class="mock-grid">${Object.entries(MOCKS).map(([k, m]) => `
          <button class="mode-card ${cfg.mock === k ? 'on' : ''}" data-mock="${k}"><b>${m.label}</b><span>${m.desc}</span></button>`).join('')}</div></div>
        <div class="notice info">${icon('info', 18)}<div style="flex:1">Exam conditions: a countdown timer, questions from Physics, Chemistry, Botany and Zoology, +4 for correct, −1 for wrong. Answers are shown at the end. Questions come from the offline bank, so it works without internet.</div></div>
        <div class="row wrap"><button class="btn accent lg" data-start-mock>${icon('play', 17)} Start ${MOCKS[cfg.mock].label.toLowerCase()}</button></div>`;
    } else {
      form = `${subjectChips()}${chapterSelect('Any chapter')}
        <div class="field">
          <label for="qTopic">Topic <span class="muted" style="font-weight:500">(optional, be as specific as you like)</span></label>
          <input class="input" id="qTopic" value="${esc(cfg.topic)}" placeholder="e.g. Krebs cycle, Projectile motion, SN1 vs SN2" autocomplete="off">
          ${ch ? `<div class="row wrap" style="gap:6px;margin-top:4px">${ch.topics.map((t) => `<button class="chip ${cfg.topic === t ? 'on' : ''}" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
        </div>
        <div class="field"><span class="label">Difficulty</span><div class="seg">${DIFFICULTY.map((d) => `<button class="${cfg.difficulty === d ? 'on' : ''}" data-diff="${d}">${d}</button>`).join('')}</div></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
          <div class="field"><span class="label">Number of questions</span><div class="seg">${[5, 10, 15, 20].map((c) => `<button class="${cfg.count === c ? 'on' : ''}" data-count="${c}">${c}</button>`).join('')}</div></div>
          <div class="field"><span class="label">Language</span><div class="seg"><button class="${cfg.language === 'en' ? 'on' : ''}" data-lang="en">English</button><button class="${cfg.language === 'hi' ? 'on' : ''} hi" data-lang="hi">हिन्दी</button></div></div>
        </div>
        <div class="field"><span class="label">Question types</span><div class="row wrap" style="gap:6px">${PATTERNS.map((p) => `<button class="chip ${cfg.patterns.includes(p) ? 'on' : ''}" data-pattern="${p}">${cfg.patterns.includes(p) ? icon('check', 12) : ''}${p}</button>`).join('')}</div></div>
        ${practiceSwitch()}
        ${cfg.contextTitle ? `<div class="notice info">${icon('notes', 18)}<div style="flex:1">Quizzing from your note <b>${esc(cfg.contextTitle)}</b></div><button class="icon-btn sm bare" data-clear-context aria-label="Remove note context">${icon('x', 15)}</button></div>`
          : `<details ${cfg.context ? 'open' : ''}><summary class="label" style="cursor:pointer">Paste study material to quiz from (optional)</summary>
            <textarea class="textarea" id="qContext" rows="4" style="margin-top:8px" placeholder="Paste NCERT text or your notes. Questions will be based on it.">${esc(cfg.context)}</textarea></details>`}
        ${lastError ? `<div class="notice">${icon('alert', 18)}<div style="flex:1">${esc(lastError.message)}${['NO_KEY', 'AUTH', 'MODEL', 'RATE'].includes(lastError.code) ? ` <a href="#/settings" style="font-weight:700">Open Settings →</a>` : ''}</div></div>`
          : !aiReady ? `<div class="notice info">${icon('key', 18)}<div style="flex:1">To generate fresh questions, add a <b>free Google Gemini key</b> in <a href="#/settings" style="font-weight:700">Settings</a> (takes 1 minute). Meanwhile, the offline chapter tests and mock tests work without it.</div></div>` : ''}
        <div class="row wrap"><button class="btn accent lg" data-generate>${icon('sparkles', 17)} Generate quiz</button><button class="btn lg ghost" data-mode="chapter">Use offline bank instead</button></div>`;
    }
    return `
    <div class="quiz-setup">
      <div class="card" style="padding:24px">
        <div class="stack" style="gap:20px">
          <div class="mode-cards">${Object.entries(MODES).map(([k, v]) => `
            <button class="mode-card ${cfg.mode === k ? 'on' : ''}" data-mode="${k}"><span class="mc-ico">${icon(v.icon, 18)}</span><b>${v.label}</b><span>${v.desc}</span></button>`).join('')}</div>
          ${form}
        </div>
      </div>
      ${statsPanel()}
    </div>`;
  }

  function statsPanel() {
    const qz = S().quizzes;
    const c = qz.reduce((a, q) => a + q.correct, 0);
    const w = qz.reduce((a, q) => a + q.wrong, 0);
    const acc = c + w ? c / (c + w) : 0;
    const bySub = {};
    qz.forEach((q) => {
      for (const [k, v] of Object.entries(q.bySubject || { [q.subject]: { c: q.correct, w: q.wrong } })) {
        if (!SUBJECTS.some((s) => s.id === k)) continue;
        bySub[k] ||= { c: 0, t: 0 };
        bySub[k].c += v.c;
        bySub[k].t += v.c + v.w;
      }
    });
    const items = Object.entries(bySub).filter(([, v]) => v.t).map(([k, v]) => ({ label: subjectById(k).short, value: Math.round((v.c / v.t) * 100), color: subjectById(k).color })).sort((a, b) => a.value - b.value);
    const mocks = qz.filter((q) => q.mode === 'mock');
    const best = mocks.length ? Math.max(...mocks.map((q) => Math.round((q.score / q.maxScore) * 720))) : null;
    return `
      <div class="stack" style="gap:18px">
        <div class="card">
          <div class="card-head"><h3>${icon('trophy', 17)} Your performance</h3>${qz.length ? `<button class="btn sm ghost" data-history>History</button>` : ''}</div>
          ${qz.length ? `
          <div class="row" style="gap:18px">${ring(acc, 86, 9, 'var(--good)', `${Math.round(acc * 100)}%`)}
            <div class="stack" style="gap:4px"><span><b>${qz.length}</b> <span class="muted">tests taken</span></span><span><b>${c + w}</b> <span class="muted">questions attempted</span></span>
            ${best !== null ? `<span><b>${best}</b> <span class="muted">best mock (scaled to 720)</span></span>` : `<span class="muted">Target: ${S().profile.targetScore || 650}/720</span>`}</div></div>
          ${items.length ? `<hr class="divider"><p class="eyebrow" style="margin-bottom:10px">Accuracy by subject · weakest first</p>${hbars(items, (v) => v + '%')}` : ''}`
          : emptyState('trophy', 'No attempts yet', 'Your accuracy, weak areas and history will appear here.')}
        </div>
        ${qz.length ? `<div class="card"><div class="card-head"><h3>Recent</h3></div><div class="list">${qz.slice(0, 5).map(histRow).join('')}</div></div>` : ''}
      </div>`;
  }

  function histRow(q) {
    const s = q.mode === 'mock' ? { short: 'All subjects', color: 'var(--accent)' } : subjectById(q.subject);
    const title = q.mode === 'mock' ? q.topic : q.topic || (q.chapter && chapterById(q.subject, q.chapter)?.name) || s.short;
    return `<button class="li" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left;cursor:pointer" data-review="${q.id}" ${q.questions ? '' : 'disabled'}>
      <span class="dot" style="background:${s.color}"></span>
      <div class="li-main"><div class="li-title">${esc(title)}</div><div class="li-sub">${(MODES[q.mode] || MODES.chapter).label} · ${timeAgo(q.at)}</div></div>
      <b>${q.score}/${q.maxScore}</b></button>`;
  }

  function historyView() {
    const qz = S().quizzes;
    return `<div class="row" style="margin-bottom:14px"><button class="btn sm" data-back>${icon('left', 14)} Back</button><span class="spacer"></span>
      ${qz.length ? `<button class="btn sm ghost danger" data-clear-history>${icon('trash', 14)} Clear history</button>` : ''}</div>
      <div class="card">${qz.length ? `<div class="list">${qz.map(histRow).join('')}</div>` : emptyState('trophy', 'No history', '')}</div>`;
  }

  /* ---------------- Loading & starting ---------------- */
  function loadingView() {
    return `<div class="card"><div class="loader"><div class="orbit"></div>
      <div><h3 class="serif" style="font-size:28px">${cfg.mode === 'ai' ? 'Setting your question paper' : 'Preparing your test'}</h3>
      <p class="muted" id="loadLine">${LOADING_LINES[0]}</p></div>
      <div style="width:min(420px,100%)" class="stack"><div class="skeleton"></div><div class="skeleton" style="width:80%"></div><div class="skeleton" style="width:60%"></div></div>
      ${cfg.mode === 'ai' ? '<button class="btn ghost" data-cancel>Cancel</button>' : ''}</div></div>`;
  }

  async function startChapter() {
    phase = 'loading';
    draw();
    try {
      let qs = cfg.chapter ? await chapterQuestions(cfg.subject, cfg.chapter) : await subjectQuestions(cfg.subject);
      qs = shuffle(qs);
      if (cfg.count) qs = qs.slice(0, cfg.count);
      if (!qs.length) throw new Error('No questions');
      const ch = chapterById(cfg.subject, cfg.chapter);
      startMCQ(qs, { kind: 'chapter', topic: ch ? ch.name : `${subjectById(cfg.subject).name} · mixed`, practice: cfg.practice });
    } catch (e) {
      console.warn(e);
      phase = 'setup';
      toast("Couldn't load the question bank. Check your connection and try again.", 'bad');
    }
    draw();
  }

  async function startMock() {
    phase = 'loading';
    draw();
    try {
      const m = MOCKS[cfg.mock];
      const parts = await Promise.all(SUBJECTS.map((s) => subjectQuestions(s.id)));
      const qs = parts.flatMap((p) => shuffle(p).slice(0, m.per));
      startMCQ(qs, { kind: 'mock', topic: m.label, practice: false, limitMs: m.mins * 60000 });
    } catch (e) {
      console.warn(e);
      phase = 'setup';
      toast("Couldn't load the question bank. Check your connection and try again.", 'bad');
    }
    draw();
  }

  async function generate() {
    const sub = subjectById(cfg.subject);
    const ch = chapterById(cfg.subject, cfg.chapter);
    phase = 'loading';
    lastError = null;
    draw();
    let li = 0;
    const iv = setInterval(() => {
      const n = el.querySelector('#loadLine');
      if (n) n.textContent = LOADING_LINES[++li % LOADING_LINES.length];
    }, 1800);
    controller = new AbortController();
    try {
      const res = await runAI('mcq', { subject: sub.name, chapter: ch?.name || '', topic: cfg.topic, difficulty: cfg.difficulty, count: cfg.count, language: cfg.language, context: cfg.context, patterns: cfg.patterns }, { signal: controller.signal });
      const qs = cleanMCQs(res).map((q) => ({ ...q, subject: cfg.subject }));
      if (!qs.length) throw new AIError('The AI response had no valid questions. Please try again.', 'EMPTY');
      startMCQ(qs, { kind: 'ai', topic: cfg.topic || ch?.name || sub.name, practice: cfg.practice });
    } catch (e) {
      if (e.name !== 'AbortError') lastError = { message: friendlyError(e), code: e.code };
      phase = 'setup';
    } finally {
      clearInterval(iv);
      controller = null;
    }
    draw();
  }

  function startMCQ(questions, { kind, topic, practice, limitMs = 0 }) {
    session = { kind, id: uid(), questions, answers: Array(questions.length).fill(null), review: [], cur: 0, startedAt: Date.now(), practice, limitMs, meta: { ...cfg, topic } };
    phase = 'play';
  }

  /* ---------------- MCQ player ---------------- */
  function qBody(q, { answer = null, reveal = false, interactive = true } = {}) {
    const raw = q.statements.length && q.statements.every((s) => /^(assertion|reason|statement|[A-H][.)]\s)/i.test(s));
    return `
      ${q.passage ? `<div class="q-passage">${esc(q.passage)}</div>` : ''}
      <div class="q-stem">${esc(q.stem)}</div>
      ${q.statements.length ? `<ol class="q-statements ${raw ? 'raw' : ''}">${q.statements.map((s) => `<li><span>${esc(s)}</span></li>`).join('')}</ol>` : ''}
      ${q.ask ? `<div class="q-ask">${esc(q.ask)}</div>` : ''}
      <div class="options">${q.options.map((o, i) => {
        let cls = '';
        if (reveal) cls = i === q.answer ? 'right' : i === answer ? 'wrong' : '';
        else if (answer === i) cls = 'sel';
        return `<button class="opt ${cls}" ${interactive && !reveal ? `data-opt="${i}"` : 'disabled'}><span class="ol">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`;
      }).join('')}</div>
      ${reveal ? `<div class="explain"><b>${answer === null ? 'Not attempted' : answer === q.answer ? '✓ Correct (+4)' : '✗ Incorrect (−1)'} · Answer: ${'ABCD'[q.answer]}</b>${esc(q.explanation)}</div>` : ''}`;
  }

  const clockText = () => {
    const s = session;
    return s.limitMs ? fmtClock(Math.max(0, s.limitMs - (Date.now() - s.startedAt))) : fmtClock(Date.now() - s.startedAt);
  };

  function playView() {
    const s = session;
    const q = s.questions[s.cur];
    const n = s.questions.length;
    const a = s.answers[s.cur];
    const locked = s.practice && a !== null;
    const answered = s.answers.filter((x) => x !== null).length;
    const sub = subjectById(subjOf(q));
    return `
    <div class="q-shell">
      <div class="card q-card">
        <div class="row between" style="margin-bottom:6px">
          <span class="q-num">Question ${s.cur + 1} <span style="font-size:16px">/ ${n}</span></span>
          <span class="row"><span class="tag"><span class="dot" style="background:${sub.color}"></span>${esc(sub.short)}</span>${q.concept ? `<span class="tag q-concept">${esc(q.concept)}</span>` : ''}</span>
        </div>
        <div class="progress" style="margin-bottom:22px"><i style="width:${(answered / n) * 100}%"></i></div>
        <div class="stack ${s.meta.language === 'hi' && s.kind === 'ai' ? 'hi' : ''}" style="gap:16px">${qBody(q, { answer: a, reveal: locked })}</div>
        <div class="row" style="margin-top:22px;flex-wrap:wrap">
          <button class="btn" data-nav="-1" ${s.cur === 0 ? 'disabled' : ''}>${icon('left', 16)} Prev</button>
          ${!s.practice ? `<button class="btn ghost" data-mark>${icon('flag', 15)} ${s.review.includes(s.cur) ? 'Unmark' : 'Mark for review'}</button>` : ''}
          ${a !== null && !s.practice ? `<button class="btn ghost" data-clear>Clear</button>` : ''}
          <span class="spacer"></span>
          ${s.cur < n - 1 ? `<button class="btn primary" data-nav="1">Next ${icon('right', 16)}</button>` : `<button class="btn accent" data-submit>Submit ${icon('check', 16)}</button>`}
        </div>
        <p class="hint" style="margin-top:14px">Shortcuts: <span class="kbd">A</span>–<span class="kbd">D</span> answer · <span class="kbd">←</span> <span class="kbd">→</span> navigate</p>
      </div>
      <div class="card q-side">
        <div class="row between" style="margin-bottom:12px"><span class="eyebrow">${s.limitMs ? 'Time left' : 'Time'}</span><span class="mono" id="qClock" style="font-size:20px">${clockText()}</span></div>
        <div class="palette">${s.questions.map((qq, i) => {
          let c = '';
          if (s.practice && s.answers[i] !== null) c = s.answers[i] === qq.answer ? 'right' : 'wrong';
          else if (s.answers[i] !== null) c = 'ans';
          return `<button class="${c} ${s.review.includes(i) ? 'rev' : ''} ${i === s.cur ? 'cur' : ''}" data-go="${i}">${i + 1}</button>`;
        }).join('')}</div>
        <hr class="divider">
        <p class="hint">${answered}/${n} answered${s.review.length ? ` · ${s.review.length} marked` : ''} · +4 / −1</p>
        <button class="btn accent block" data-submit style="margin-top:12px">Submit test</button>
        <button class="btn ghost block sm" data-quit style="margin-top:6px">Quit</button>
      </div>
    </div>`;
  }

  function submit() {
    const s = session;
    let correct = 0, wrong = 0, skipped = 0;
    const bySubject = {};
    s.questions.forEach((q, i) => {
      const k = subjOf(q);
      bySubject[k] ||= { c: 0, w: 0, s: 0 };
      if (s.answers[i] === null) { skipped++; bySubject[k].s++; }
      else if (s.answers[i] === q.answer) { correct++; bySubject[k].c++; }
      else { wrong++; bySubject[k].w++; }
    });
    const score = correct * MARK - wrong * NEG;
    s.result = { correct, wrong, skipped, score, maxScore: s.questions.length * MARK, timeSec: Math.round((Date.now() - s.startedAt) / 1000), bySubject };
    const q = S().quizzes;
    q.unshift({ id: s.id, at: Date.now(), mode: s.kind, subject: s.kind === 'mock' ? 'mixed' : s.meta.subject, chapter: s.kind === 'mock' ? '' : s.meta.chapter, topic: s.meta.topic, total: s.questions.length, ...s.result, questions: s.questions, answers: s.answers });
    // Keep full question data only for the most recent 30 attempts to save space.
    q.forEach((x, i) => { if (i >= 30) { delete x.questions; delete x.answers; } });
    if (q.length > 300) q.length = 300;
    commit();
    phase = 'result';
  }

  /* ---------------- Result ---------------- */
  function resultView() {
    const s = session;
    const r = s.result;
    const acc = r.correct + r.wrong ? Math.round((r.correct / (r.correct + r.wrong)) * 100) : 0;
    const scaled = Math.round((Math.max(0, r.score) / r.maxScore) * 720);
    const verdict = acc >= 85 ? 'Outstanding — that is a top-rank pace.' : acc >= 70 ? 'Strong attempt. Polish the misses.' : acc >= 50 ? 'Decent. Revise the concepts below.' : 'Tough round. Re-read the NCERT chapter and retry.';
    const subs = Object.entries(r.bySubject || {}).filter(([k]) => SUBJECTS.some((x) => x.id === k));
    return `
    <div class="card" style="padding:26px">
      <div class="score-hero">
        ${ring(r.maxScore ? Math.max(0, r.score) / r.maxScore : 0, 150, 12, acc >= 60 ? 'var(--good)' : 'var(--accent)', `<span class="serif" style="font-size:38px;font-weight:400">${acc}%</span><br><span class="hint">accuracy</span>`)}
        <div class="stack" style="gap:14px">
          <div><span class="eyebrow">${(MODES[s.kind] || MODES.chapter).label}${s.meta.topic ? ' · ' + esc(s.meta.topic) : ''}</span>
          <div class="score-big">${r.score}<small> / ${r.maxScore}</small></div><p class="muted">${verdict} ${s.kind === 'mock' ? `That is about <b>${scaled}/720</b> on the NEET scale (target ${S().profile.targetScore || 650}).` : 'NEET marking (+4 / −1) applied.'}</p></div>
          <div class="kpis">
            <div class="kpi"><b style="color:var(--good)">${r.correct}</b><span>Correct</span></div>
            <div class="kpi"><b style="color:var(--bad)">${r.wrong}</b><span>Wrong</span></div>
            <div class="kpi"><b>${r.skipped}</b><span>Skipped</span></div>
            <div class="kpi"><b>${fmtClock(r.timeSec * 1000)}</b><span>Time taken</span></div>
          </div>
          ${subs.length > 1 ? `<div class="sub-scores">${subs.map(([k, v]) => `<div class="kpi"><b style="color:${subjectById(k).color}">${v.c * MARK - v.w * NEG}</b><span>${esc(subjectById(k).short)} · ${v.c}/${v.c + v.w + v.s}</span></div>`).join('')}</div>` : ''}
          <div class="row wrap">
            <button class="btn accent" data-new>${icon('sparkles', 16)} New test</button>
            <button class="btn" data-retake>${icon('revise', 16)} Retake</button>
            ${r.wrong || r.skipped ? `<button class="btn" data-mistakes>${icon('notes', 16)} Save mistakes to Notes</button>` : ''}
          </div>
        </div>
      </div>
    </div>
    <h3 class="serif" style="font-size:28px;margin:28px 0 14px">Answer review</h3>
    <div class="row wrap" style="gap:6px;margin-bottom:14px"><button class="chip ${!s.onlyWrong ? 'on' : ''}" data-filter-review="all">All questions</button><button class="chip ${s.onlyWrong ? 'on' : ''}" data-filter-review="wrong">Only wrong & skipped</button></div>
    <div class="stack" style="gap:14px">${s.questions.map((q, i) => (s.onlyWrong && s.answers[i] === q.answer) ? '' : `
      <div class="card ${s.meta.language === 'hi' && s.kind === 'ai' ? 'hi' : ''}"><div class="row between" style="margin-bottom:10px"><span class="q-num" style="font-size:18px">Q${i + 1} <span class="hint" style="font-family:var(--font)">${esc(subjectById(subjOf(q)).short)}</span></span>
        <span class="tag" style="${s.answers[i] === null ? '' : s.answers[i] === q.answer ? 'color:var(--good)' : 'color:var(--bad)'}">${s.answers[i] === null ? 'Skipped · 0' : s.answers[i] === q.answer ? '+4' : '−1'}</span></div>
        <div class="stack" style="gap:14px">${qBody(q, { answer: s.answers[i], reveal: true, interactive: false })}</div></div>`).join('')}</div>`;
  }

  function saveMistakes() {
    const s = session;
    const lines = [];
    s.questions.forEach((q, i) => {
      if (s.answers[i] === q.answer) return;
      lines.push(`### ${q.stem}`);
      q.statements.forEach((st, k) => lines.push(`${k + 1}. ${st}`));
      if (q.ask) lines.push(`**${q.ask}**`);
      lines.push(`- Your answer: ${s.answers[i] === null ? 'Skipped' : q.options[s.answers[i]]}`);
      lines.push(`- ==Correct: ${q.options[q.answer]}==`);
      lines.push(`> ${q.explanation}`);
      lines.push('');
    });
    const sub = s.kind === 'mock' ? subjOf(s.questions[0]) : s.meta.subject;
    S().notes.unshift({
      id: uid(), title: `Mistake book: ${s.meta.topic || subjectById(sub).short} (${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`,
      subject: sub, tags: ['mistakes'], body: lines.join('\n'), pinned: false, createdAt: Date.now(), updatedAt: Date.now(),
      revisions: 0, nextRevision: dateKey(addDays(new Date(), 1)),
    });
    commit();
    toast('Mistakes saved to Notes', 'good', 'Scheduled for revision tomorrow.');
  }

  /* ---------------- Events ---------------- */
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.mode) { cfg.mode = d.mode; if (d.mode === 'chapter' && ![10, 20, 30, 0].includes(cfg.count)) cfg.count = 10; if (d.mode === 'ai' && ![5, 10, 15, 20].includes(cfg.count)) cfg.count = 10; lastError = null; draw(); }
    else if (d.subject) { cfg.subject = d.subject; cfg.chapter = ''; cfg.topic = ''; draw(); }
    else if (d.topic !== undefined) { cfg.topic = cfg.topic === d.topic ? '' : d.topic; draw(); }
    else if (d.diff) { cfg.difficulty = d.diff; draw(); }
    else if (d.count !== undefined) { cfg.count = Number(d.count); draw(); }
    else if (d.lang) { cfg.language = d.lang; draw(); }
    else if (d.mock) { cfg.mock = d.mock; draw(); }
    else if (d.pattern) {
      const i = cfg.patterns.indexOf(d.pattern);
      if (i >= 0 && cfg.patterns.length > 1) cfg.patterns.splice(i, 1);
      else if (i < 0) cfg.patterns.push(d.pattern);
      draw();
    } else if ('clearContext' in d) { cfg.context = ''; cfg.contextTitle = ''; draw(); }
    else if ('generate' in d) generate();
    else if ('startChapter' in d) startChapter();
    else if ('startMock' in d) startMock();
    else if ('cancel' in d) controller?.abort();
    else if (d.opt !== undefined) {
      if (session.practice && session.answers[session.cur] !== null) return;
      session.answers[session.cur] = Number(d.opt);
      draw();
    } else if (d.nav) { session.cur = Math.max(0, Math.min(session.questions.length - 1, session.cur + Number(d.nav))); draw(); }
    else if (d.go !== undefined) { session.cur = Number(d.go); draw(); }
    else if ('mark' in d) { const r = session.review; const i = r.indexOf(session.cur); i >= 0 ? r.splice(i, 1) : r.push(session.cur); draw(); }
    else if ('clear' in d) { session.answers[session.cur] = null; draw(); }
    else if ('submit' in d) {
      const left = session.answers.filter((x) => x === null).length;
      if (left && !(await confirmDialog(`${left} question(s) unanswered. Submit anyway?`, 'Submit'))) return;
      submit();
      draw();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if ('quit' in d) { if (await confirmDialog('Quit this test? Your answers will be lost.', 'Quit')) { session = null; phase = 'setup'; draw(); } }
    else if ('new' in d) { session = null; phase = 'setup'; draw(); }
    else if ('retake' in d) { startMCQ(session.questions, { kind: session.kind, topic: session.meta.topic, practice: session.practice, limitMs: session.limitMs }); draw(); }
    else if ('mistakes' in d) { saveMistakes(); b.disabled = true; }
    else if (d.filterReview) { session.onlyWrong = d.filterReview === 'wrong'; draw(); }
    else if ('history' in d) { phase = 'history'; draw(); }
    else if ('back' in d) { phase = 'setup'; draw(); }
    else if ('clearHistory' in d) { if (await confirmDialog('Delete all quiz history?', 'Delete')) { S().quizzes = []; commit(); phase = 'setup'; draw(); } }
    else if (d.review) {
      const h = S().quizzes.find((x) => x.id === d.review);
      if (!h?.questions) return;
      session = { kind: h.mode, id: h.id, questions: h.questions, answers: h.answers, review: [], cur: 0, practice: false, limitMs: 0, meta: { ...cfg, subject: h.subject, chapter: h.chapter, topic: h.topic }, result: { correct: h.correct, wrong: h.wrong, skipped: h.skipped, score: h.score, maxScore: h.maxScore, timeSec: h.timeSec, bySubject: h.bySubject } };
      phase = 'result';
      draw();
      window.scrollTo({ top: 0 });
    }
  });

  el.addEventListener('input', (e) => {
    if (e.target.id === 'qTopic') cfg.topic = e.target.value;
    if (e.target.id === 'qContext') cfg.context = e.target.value;
  });
  el.addEventListener('change', (e) => {
    if (e.target.id === 'qPractice') cfg.practice = e.target.checked;
    if (e.target.id === 'qChapter') { cfg.chapter = e.target.value; cfg.topic = ''; draw(); }
  });
  el.addEventListener('keydown', (e) => {
    if (e.target.id === 'qTopic' && e.key === 'Enter') generate();
  });

  const onKey = (e) => {
    if (phase !== 'play' || e.target.matches('input, textarea, select') || document.querySelector('.modal-backdrop')) return;
    const k = e.key.toUpperCase();
    const idx = 'ABCD'.indexOf(k) >= 0 ? 'ABCD'.indexOf(k) : '1234'.indexOf(k);
    const locked = session.practice && session.answers[session.cur] !== null;
    if (idx >= 0 && !locked) { session.answers[session.cur] = idx; draw(); }
    else if (e.key === 'ArrowRight' && session.cur < session.questions.length - 1) { session.cur++; draw(); }
    else if (e.key === 'ArrowLeft' && session.cur > 0) { session.cur--; draw(); }
  };
  document.addEventListener('keydown', onKey);
  const onTick = () => {
    if (phase !== 'play' || !session) return;
    const c = el.querySelector('#qClock');
    if (c) c.textContent = clockText();
    if (session.limitMs && Date.now() - session.startedAt >= session.limitMs) {
      submit();
      draw();
      toast("Time's up! Your test was submitted.", 'info');
    }
  };
  window.addEventListener('ynb:tick', onTick);

  if (phase === 'loading') phase = 'setup'; // a request was abandoned by navigating away
  draw();
  return () => {
    controller?.abort(); // don't leave a request running for a view that's gone
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('ynb:tick', onTick);
  };
}
