// Study Material: NEET syllabus subject → chapter, with offline notes, topic checklists, progress tracking,
// AI-written deep notes, an AI doubt solver and links to the chapter test.
import { S, commit, syllabusStats, chapterKey, isDoneStatus } from '../store.js';
import { icon } from '../icons.js';
import { esc, uid, dateKey, addDays, timeAgo } from '../utils.js';
import { SUBJECTS, chaptersOf, chapterById, subjectById, ncertUrl, WEIGHT_LABEL, LIBRARY } from '../data.js';
import { chapterContent } from '../content.js';
import { runAI, hasAI, friendlyError, AIError } from '../ai.js';
import { toast, confirmDialog } from '../ui.js';
import { md } from '../md.js';

const STATUSES = [
  { id: '', label: 'Not started', color: 'var(--muted)' },
  { id: 'reading', label: 'Reading', color: 'var(--info)' },
  { id: 'done', label: 'Done', color: 'var(--good)' },
  { id: 'revised', label: 'Revised', color: 'var(--accent)' },
];
const statusOf = (id) => STATUSES.find((s) => s.id === (id || '')) || STATUSES[0];
const syl = () => S().syllabus;
const href = (sub, ch) => `#/syllabus?subject=${encodeURIComponent(sub)}${ch ? `&chapter=${encodeURIComponent(ch)}` : ''}`;
const LOADING_LINES = ['Reading the NCERT chapter…', 'Picking out exam-relevant lines…', 'Collecting formulas and reactions…', 'Listing common traps…', 'Adding PYQ themes…', 'Writing a quick-revision box…'];

// Module-level so a generation keeps going (and is saved) if the user navigates away.
let classFilter = 'All';
let generating = null; // { key, controller }
let lastError = null; // { key, message, code }
let doubt = { key: '', q: '', busy: false, answer: null, error: '' };

export function setStatus(sub, ch, status) {
  const k = chapterKey(sub, ch);
  const was = syl().status[k];
  if (status) syl().status[k] = status; else delete syl().status[k];
  syl().doneAt ||= {};
  if (isDoneStatus(status) && !isDoneStatus(was)) syl().doneAt[k] = Date.now();
  if (!isDoneStatus(status)) delete syl().doneAt[k];
}

function chStats(sub, c) {
  const k = chapterKey(sub, c.id);
  const done = c.topics.filter((t) => syl().topics?.[`${k}::${t}`]).length;
  return { k, done, total: c.topics.length, status: syl().status[k] || '' };
}

function str(v, max = 2000) {
  return String(v ?? '').trim().slice(0, max);
}
function list(v, max = 20) {
  return (Array.isArray(v) ? v : []).map((x) => str(typeof x === 'object' ? Object.values(x).join(': ') : x, 1200)).filter(Boolean).slice(0, max);
}
function clean(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  return {
    title: str(d.title, 200),
    overview: str(d.overview, 1500),
    sections: (Array.isArray(d.sections) ? d.sections : []).map((s) => ({ heading: str(s?.heading, 200), points: list(s?.points, 14) })).filter((s) => s.heading || s.points.length).slice(0, 10),
    formulas: list(d.formulas),
    keyTerms: (Array.isArray(d.keyTerms) ? d.keyTerms : []).map((t) => ({ term: str(t?.term, 120), meaning: str(t?.meaning, 600) })).filter((t) => t.term).slice(0, 15),
    ncertLines: list(d.ncertLines),
    mistakes: list(d.mistakes),
    pyqThemes: list(d.pyqThemes),
    mnemonic: str(d.mnemonic, 600),
    quickRevision: list(d.quickRevision),
  };
}

function aiMarkdown(d) {
  const out = [];
  const block = (title, items) => items.length && out.push(`## ${title}`, ...items.map((x) => `- ${x}`), '');
  if (d.overview) out.push(d.overview, '');
  for (const s of d.sections) out.push(`## ${s.heading || 'Notes'}`, ...s.points.map((p) => `- ${p}`), '');
  block('Formulas & key facts', d.formulas);
  block('Key terms', d.keyTerms.map((t) => `**${t.term}**: ${t.meaning}`));
  block('NCERT lines NEET loves', d.ncertLines);
  block('Common mistakes', d.mistakes);
  block('Asked before (PYQ themes)', d.pyqThemes);
  if (d.mnemonic) out.push('## Memory hook', `> ${d.mnemonic}`, '');
  block('Quick revision', d.quickRevision);
  return out.join('\n').trim();
}

function offlineMarkdown(c) {
  const out = [];
  if (c.overview) out.push(c.overview, '');
  for (const [h, pts] of c.sections || []) out.push(`## ${h}`, ...pts.map((p) => `- ${p}`), '');
  if (c.formulas?.length) out.push('## Formulas & key facts', ...c.formulas.map((f) => `- ${f}`), '');
  if (c.traps?.length) out.push('## NEET traps', ...c.traps.map((t) => `- ==${t}==`), '');
  return out.join('\n').trim();
}

async function generate(sub, ch, language) {
  const key = chapterKey(sub, ch);
  if (generating) return toast('Already writing notes for another chapter. Please wait.', 'info');
  const controller = new AbortController();
  generating = { key, controller };
  lastError = null;
  window.dispatchEvent(new Event('ynb:syllabus'));
  const c = chapterById(sub, ch);
  try {
    const raw = await runAI('material', { subject: subjectById(sub).name, chapter: c.name, topic: '', language }, { signal: controller.signal });
    const data = clean(raw);
    if (!data.overview && !data.sections.length) throw new AIError('The AI returned empty notes. Please try again.', 'EMPTY');
    syl().material[key] = { data, at: Date.now(), lang: language };
    if (!syl().status[key]) setStatus(sub, ch, 'reading');
    commit();
    if (!location.hash.includes(`chapter=${encodeURIComponent(ch)}`)) toast('AI study notes ready', 'good', c.name);
  } catch (e) {
    if (e.name !== 'AbortError') {
      lastError = { key, message: friendlyError(e), code: e.code };
      if (!location.hash.includes(`chapter=${encodeURIComponent(ch)}`)) toast(lastError.message, 'bad');
    }
  } finally {
    generating = null;
    window.dispatchEvent(new Event('ynb:syllabus'));
  }
}

async function askDoubt(sub, ch, question, language) {
  doubt = { key: chapterKey(sub, ch), q: question, busy: true, answer: null, error: '' };
  window.dispatchEvent(new Event('ynb:syllabus'));
  try {
    const raw = await runAI('doubt', { subject: subjectById(sub).name, chapter: chapterById(sub, ch).name, question, language });
    const answer = str(raw?.answer, 6000);
    if (!answer) throw new AIError('The AI returned an empty answer. Please try again.', 'EMPTY');
    doubt.answer = { answer, keyPoints: list(raw?.keyPoints, 8), tip: str(raw?.tip, 400) };
  } catch (e) {
    doubt.error = friendlyError(e);
  }
  doubt.busy = false;
  window.dispatchEvent(new Event('ynb:syllabus'));
}

function sourcesFor(sub) {
  const items = LIBRARY.filter((r) => r.subject === sub || ['ncert', 'ncert-exemplar'].includes(r.id)).slice(0, 5);
  return `<div class="list">${items.map((r) => {
    const ico = r.type === 'book' ? 'book' : r.type === 'pdf' ? 'file' : r.type === 'video' ? 'video' : 'globe';
    const body = `<span class="stat-ico" style="width:30px;height:30px">${icon(ico, 15)}</span><div class="li-main"><div class="li-title">${esc(r.title)}</div><div class="li-sub">${esc(r.desc)}</div></div>`;
    return r.url ? `<a class="li" href="${esc(r.url)}" target="_blank" rel="noopener" style="text-decoration:none">${body}${icon('external', 14)}</a>` : `<div class="li">${body}</div>`;
  }).join('')}</div>`;
}

export function mount(el, params, { setSub }) {
  const sub = SUBJECTS.some((s) => s.id === params.subject) ? params.subject : null;
  const ch = sub && chapterById(sub, params.chapter) ? params.chapter : null;
  let lang = S().settings.materialLang || 'en';
  let tab = 'notes';
  let offline = undefined; // chapter content once loaded; null if missing
  let loadTimer = null;

  /* ---------------- All subjects ---------------- */
  function overview() {
    const st = syllabusStats();
    const a = st.all;
    const notes = Object.keys(syl().material).length;
    const chapters = SUBJECTS.flatMap((s) => chaptersOf(s.id).map((c) => ({ s, c })));
    const shown = chapters.filter(({ c }) => classFilter === 'All' || String(c.cls) === classFilter);
    const next = shown.filter(({ s, c }) => c.weight === 'H' && !isDoneStatus(syl().status[chapterKey(s.id, c.id)])).slice(0, 6);
    return `
    <div class="card syl-hero">
      <div style="flex:1 1 260px">
        <span class="eyebrow">NEET (UG) syllabus · NCERT Class 11 & 12</span>
        <h2 class="serif" style="font-size:30px;margin:4px 0">${a.done} of ${a.total} chapters covered</h2>
        <p class="hint">Open a subject, read a chapter's notes, tick off its topics, then take the chapter test.</p>
      </div>
      <div style="flex:1 1 240px">
        <div class="progress good" style="height:10px"><i style="width:${a.total ? (a.done / a.total) * 100 : 0}%"></i></div>
        <p class="hint" style="margin-top:8px">${a.reading} reading · ${a.revised} revised · ${a.topicsDone}/${a.topicsTotal} topics ticked · ${notes} AI note${notes === 1 ? '' : 's'}</p>
      </div>
    </div>
    <div class="syl-grid" style="margin-top:18px">
      ${SUBJECTS.map((s) => {
        const x = st[s.id];
        return `<a class="syl-card subj-card" href="${href(s.id)}" style="--c:${s.color}">
          <div class="row between"><span class="subj-ico">${icon(s.icon, 20)}</span><span class="hint">${x.done}/${x.total} chapters</span></div>
          <h4>${esc(s.name)}</h4>
          <div class="progress"><i style="width:${x.total ? (x.done / x.total) * 100 : 0}%;background:${s.color}"></i></div>
          <span class="hint">${s.qs} questions in NEET · ${x.topicsDone}/${x.topicsTotal} topics</span>
        </a>`;
      }).join('')}
    </div>
    <div class="row between wrap" style="margin:26px 0 12px;gap:10px">
      <h3 class="serif" style="font-size:24px">High-weightage chapters to finish</h3>
      <div class="seg">${['All', '11', '12'].map((c) => `<button class="${classFilter === c ? 'on' : ''}" data-cls="${c}">${c === 'All' ? 'All' : `Class ${c}`}</button>`).join('')}</div>
    </div>
    ${next.length ? `<div class="list card" style="padding:6px 16px">${next.map(({ s, c }) => `
      <a class="li" href="${href(s.id, c.id)}" style="text-decoration:none"><span class="dot" style="background:${s.color}"></span>
        <div class="li-main"><div class="li-title">${esc(c.name)}</div><div class="li-sub">${esc(s.short)} · Class ${c.cls}</div></div>${icon('right', 16)}</a>`).join('')}</div>`
      : `<div class="notice info">${icon('trophy', 18)}<div>All high-weightage chapters${classFilter === 'All' ? '' : ` of Class ${classFilter}`} are done. Keep revising!</div></div>`}`;
  }

  /* ---------------- One subject ---------------- */
  function chapterRow(c) {
    const x = chStats(sub, c);
    const stt = statusOf(x.status);
    const mat = syl().material[x.k];
    return `<div class="li syl-topic">
      <button class="status-pill" data-cycle="${esc(c.id)}" style="--c:${stt.color}" title="Change status">${stt.label}</button>
      <a class="li-main" href="${href(sub, c.id)}" style="text-decoration:none;color:inherit"><div class="li-title">${esc(c.name)}</div>
        <div class="li-sub"><span class="w-tag w-${c.weight}" title="${WEIGHT_LABEL[c.weight]}">${c.weight === 'H' ? 'High' : c.weight === 'M' ? 'Medium' : 'Low'}</span> ${x.done}/${x.total} topics${mat ? ` · ${icon('sparkles', 11)} AI notes` : ''}</div></a>
      <a class="icon-btn sm bare" href="${href(sub, c.id)}" aria-label="Open">${icon('right', 16)}</a>
    </div>`;
  }
  function subjectView() {
    const s = subjectById(sub);
    const st = syllabusStats()[sub];
    const groups = [11, 12].map((cls) => ({ cls, items: chaptersOf(sub).filter((c) => c.cls === cls) })).filter((g) => g.items.length);
    return `
    <a class="btn sm ghost" href="#/syllabus">${icon('left', 14)} All subjects</a>
    <div class="grid g-3" style="margin-top:12px;align-items:start">
      <div class="card span-2">
        <div class="card-head"><h3><span class="subj-ico sm" style="--c:${s.color}">${icon(s.icon, 15)}</span> ${esc(s.name)}</h3><span class="tag">${st.done}/${st.total} done</span></div>
        <div class="progress" style="margin-bottom:6px"><i style="width:${st.total ? (st.done / st.total) * 100 : 0}%;background:${s.color}"></i></div>
        <p class="hint" style="margin-bottom:6px">Tap a status to change it. Weightage shows how often NEET has asked from the chapter recently.</p>
        ${groups.map((g) => `<p class="eyebrow" style="margin:16px 0 4px">Class ${g.cls}</p><div class="list">${g.items.map(chapterRow).join('')}</div>`).join('')}
      </div>
      <div class="stack">
        <div class="card">
          <div class="card-head"><h3>${icon('target', 17)} Practise ${esc(s.short)}</h3></div>
          <div class="stack" style="gap:8px">
            <a class="btn block" href="#/quiz?mode=chapter&subject=${sub}">${icon('check', 15)} Offline chapter test</a>
            <a class="btn block" href="#/quiz?mode=ai&subject=${sub}">${icon('sparkles', 15)} AI quiz</a>
            <a class="btn block" href="#/quiz?mode=mock">${icon('trophy', 15)} NEET mock test</a>
          </div>
        </div>
        <div class="card"><div class="card-head"><h3>${icon('library', 17)} Read from</h3></div>${sourcesFor(sub)}</div>
      </div>
    </div>`;
  }

  /* ---------------- One chapter ---------------- */
  function chapterView() {
    const s = subjectById(sub);
    const c = chapterById(sub, ch);
    const list = chaptersOf(sub);
    const idx = list.findIndex((x) => x.id === ch);
    const prev = list[idx - 1];
    const next = list[idx + 1];
    const x = chStats(sub, c);
    const mat = syl().material[x.k];
    const busy = generating?.key === x.k;
    const err = lastError?.key === x.k ? lastError : null;
    const langSeg = `<div class="seg"><button class="${lang === 'en' ? 'on' : ''}" data-lang="en">English</button><button class="${lang === 'hi' ? 'on' : ''}" data-lang="hi">हिन्दी</button></div>`;
    const qCount = offline?.quiz?.length || 0;
    const nUrl = ncertUrl(c);

    let body;
    if (tab === 'notes') {
      body = offline === undefined ? `<div class="stack"><div class="skeleton"></div><div class="skeleton" style="width:80%"></div><div class="skeleton" style="width:60%"></div></div>`
        : offline ? `<div class="notice info" style="margin-bottom:16px">${icon('book', 18)}<div class="hint">Key notes for quick revision — works offline. Read the NCERT chapter alongside${nUrl ? ` (<a href="${esc(nUrl)}" target="_blank" rel="noopener">open NCERT</a>)` : ''}.</div></div>
          <article class="md">${md(offlineMarkdown(offline))}</article>
          <hr class="divider"><div class="row wrap">${S().notes.some((n) => n.id === syl().noteIds?.[x.k])
            ? `<a class="btn" href="#/notes?id=${esc(syl().noteIds[x.k])}">${icon('notes', 15)} Open in my notes</a>`
            : `<button class="btn" data-savenote="offline">${icon('notes', 15)} Save to my notes</button>`}</div>`
        : `<p class="hint">Notes for this chapter aren't available offline yet. Try AI notes.</p>`;
    } else if (busy) {
      body = `<div class="loader"><div class="orbit"></div>
        <div><h3 class="serif" style="font-size:26px">Writing your study notes</h3><p class="muted" id="loadLine">${LOADING_LINES[0]}</p></div>
        <div style="width:min(420px,100%)" class="stack"><div class="skeleton"></div><div class="skeleton" style="width:80%"></div><div class="skeleton" style="width:60%"></div></div>
        <p class="hint">This takes 15–40 seconds. You can keep using the app; we'll save the notes here.</p>
        <button class="btn ghost" data-cancel>Cancel</button></div>`;
    } else if (mat) {
      body = `<div class="notice info" style="margin-bottom:16px">${icon('info', 18)}<div class="hint">AI-written notes, ${timeAgo(mat.at)}${mat.lang === 'hi' ? ' · हिन्दी' : ''}. Cross-check anything surprising against NCERT.</div></div>
        <article class="md">${md(aiMarkdown(mat.data))}</article>
        <hr class="divider">
        <div class="row wrap">
          ${mat.noteId && S().notes.some((n) => n.id === mat.noteId) ? `<a class="btn" href="#/notes?id=${esc(mat.noteId)}">${icon('notes', 15)} Open in my notes</a>` : `<button class="btn" data-savenote="ai">${icon('notes', 15)} Save to my notes</button>`}
          <span class="spacer"></span>${langSeg}
          <button class="btn ghost" data-generate>${icon('revise', 15)} Rewrite</button>
        </div>`;
    } else {
      body = `<div class="empty" style="padding:28px 8px">
        <div class="em-icon">${icon('sparkles', 24)}</div>
        <h4>Detailed AI study notes</h4>
        <p>NCERT-line notes with formulas, key terms, common mistakes, PYQ themes and a quick-revision box.</p>
        ${err ? `<div class="notice" style="margin:14px auto 0;max-width:520px;text-align:left">${icon('alert', 18)}<div>${esc(err.message)}${['NO_KEY', 'AUTH', 'MODEL'].includes(err.code) ? ` <a href="#/settings" style="font-weight:700">Open Settings →</a>` : ''}</div></div>` : ''}
        ${hasAI()
          ? `<div class="row wrap" style="justify-content:center;margin-top:16px">${langSeg}<button class="btn accent" data-generate>${icon('sparkles', 16)} Generate AI notes</button></div>`
          : `<div class="notice info" style="margin:14px auto 0;max-width:520px;text-align:left">${icon('key', 18)}<div>To generate notes, add a free Google Gemini key in <a href="#/settings" style="font-weight:700">Settings</a>. The offline notes tab works without it.</div></div>`}
      </div>`;
    }

    const d = doubt.key === x.k ? doubt : { q: '', busy: false, answer: null, error: '' };
    return `
    <div class="row wrap" style="gap:8px"><a class="btn sm ghost" href="${href(sub)}">${icon('left', 14)} ${esc(s.name)}</a></div>
    <div class="grid g-3" style="margin-top:12px;align-items:start">
      <div class="card span-2">
        <div class="syl-topic-head">
          <span class="tag"><span class="dot" style="background:${s.color}"></span>${esc(s.short)} · Class ${c.cls} · <span class="w-tag w-${c.weight}">${WEIGHT_LABEL[c.weight]}</span></span>
          <h2 class="serif">${esc(c.name)}</h2>
          <div class="seg" role="group" aria-label="Chapter status">${STATUSES.map((t) => `<button class="${x.status === t.id ? 'on' : ''}" data-status="${t.id}">${t.label}</button>`).join('')}</div>
        </div>
        <div class="tabs" role="tablist">
          <button class="${tab === 'notes' ? 'on' : ''}" data-tab="notes">${icon('book', 15)} Key notes</button>
          <button class="${tab === 'ai' ? 'on' : ''}" data-tab="ai">${icon('sparkles', 15)} AI notes${mat ? ' ✓' : ''}</button>
        </div>
        ${body}
      </div>
      <div class="stack">
        <div class="card">
          <div class="card-head"><h3>${icon('target', 17)} Practise</h3></div>
          <div class="stack" style="gap:8px">
            <a class="btn accent block" href="#/quiz?mode=chapter&subject=${sub}&chapter=${encodeURIComponent(ch)}">${icon('check', 15)} Chapter test${qCount ? ` · ${qCount} Qs` : ''} (offline)</a>
            <a class="btn block" href="#/quiz?mode=ai&subject=${sub}&chapter=${encodeURIComponent(ch)}">${icon('sparkles', 15)} AI quiz on this chapter</a>
            <a class="btn block" href="#/study?subject=${sub}&start=1">${icon('timer', 15)} Start a focus session</a>
            ${nUrl ? `<a class="btn ghost block" href="${esc(nUrl)}" target="_blank" rel="noopener">${icon('external', 15)} Open NCERT chapter</a>` : `<p class="hint">Not in the current NCERT books — use the older NCERT edition.</p>`}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('tracker', 17)} Topics</h3><span class="hint">${x.done}/${x.total}</span></div>
          <div class="list">${c.topics.map((t, i) => {
            const on = syl().topics?.[`${x.k}::${t}`];
            return `<div class="li ${on ? 'done' : ''}"><button class="check ${on ? 'on' : ''}" data-topic="${i}" aria-label="Mark topic done">${icon('check', 14)}</button><div class="li-main"><div class="li-title">${esc(t)}</div></div></div>`;
          }).join('')}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('brain', 17)} Ask a doubt</h3></div>
          <form id="doubtForm" class="stack" style="gap:8px">
            <textarea class="textarea" name="q" rows="3" maxlength="1500" placeholder="e.g. Why is the A-band length unchanged during contraction?" ${d.busy ? 'disabled' : ''}>${esc(d.q)}</textarea>
            <button class="btn primary" ${d.busy || !hasAI() ? 'disabled' : ''}>${d.busy ? 'Thinking…' : `${icon('sparkles', 15)} Explain`}</button>
            ${!hasAI() ? `<p class="hint">Add a free Gemini key in <a href="#/settings">Settings</a> to ask doubts.</p>` : ''}
          </form>
          ${d.error ? `<div class="notice" style="margin-top:10px">${icon('alert', 18)}<div>${esc(d.error)}</div></div>` : ''}
          ${d.answer ? `<article class="md doubt-answer">${md(d.answer.answer)}${d.answer.keyPoints.length ? `<ul>${d.answer.keyPoints.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}${d.answer.tip ? `<blockquote>${esc(d.answer.tip)}</blockquote>` : ''}</article>` : ''}
        </div>
        <div class="row between">
          ${prev ? `<a class="btn sm ghost" href="${href(sub, prev.id)}" title="${esc(prev.name)}">${icon('left', 14)} Previous</a>` : '<span></span>'}
          ${next ? `<a class="btn sm ghost" href="${href(sub, next.id)}" title="${esc(next.name)}">Next ${icon('right', 14)}</a>` : ''}
        </div>
      </div>
    </div>`;
  }

  function draw() {
    clearInterval(loadTimer);
    if (ch) {
      setSub(`${subjectById(sub).name} · Class ${chapterById(sub, ch).cls}`);
      el.innerHTML = chapterView();
      if (tab === 'ai' && generating?.key === chapterKey(sub, ch)) {
        let i = 0;
        loadTimer = setInterval(() => {
          const line = el.querySelector('#loadLine');
          if (line) line.textContent = LOADING_LINES[++i % LOADING_LINES.length];
        }, 2600);
      }
    } else if (sub) {
      setSub(`${chaptersOf(sub).length} chapters · notes, topics and progress`);
      el.innerHTML = subjectView();
    } else el.innerHTML = overview();
  }

  function saveNote(kind) {
    const c = chapterById(sub, ch);
    const k = chapterKey(sub, ch);
    const body = kind === 'ai' ? (syl().material[k] ? aiMarkdown(syl().material[k].data) : '') : offline ? offlineMarkdown(offline) : '';
    if (!body) return;
    const now = Date.now();
    const note = { id: uid(), title: `${c.name}${kind === 'ai' ? ' (AI notes)' : ''}`, subject: sub, tags: ['study-material'], pinned: false, body, createdAt: now, updatedAt: now, openedAt: now, revisions: 0, nextRevision: dateKey(addDays(new Date(), 1)) };
    S().notes.push(note);
    if (kind === 'ai') syl().material[k].noteId = note.id;
    else (syl().noteIds ||= {})[k] = note.id;
    commit();
    toast('Saved to Notes', 'good', 'Added to your revision schedule.');
    draw();
  }

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.cls) { classFilter = d.cls; draw(); }
    else if (d.cycle !== undefined) {
      const k = chapterKey(sub, d.cycle);
      const i = STATUSES.findIndex((x) => x.id === (syl().status[k] || ''));
      setStatus(sub, d.cycle, STATUSES[(i + 1) % STATUSES.length].id);
      commit();
      draw();
    } else if (d.status !== undefined) {
      setStatus(sub, ch, d.status);
      commit();
      if (isDoneStatus(d.status)) toast('Chapter marked ' + statusOf(d.status).label.toLowerCase(), 'good', 'Take the chapter test to lock it in.');
      draw();
    } else if (d.topic !== undefined) {
      const c = chapterById(sub, ch);
      const tk = `${chapterKey(sub, ch)}::${c.topics[Number(d.topic)]}`;
      syl().topics ||= {};
      if (syl().topics[tk]) delete syl().topics[tk]; else syl().topics[tk] = true;
      const x = chStats(sub, c);
      if (x.done === x.total && !isDoneStatus(x.status)) { setStatus(sub, ch, 'done'); toast('All topics ticked — chapter done!', 'good'); }
      else if (x.done && !x.status) setStatus(sub, ch, 'reading');
      commit();
      draw();
    } else if (d.tab) { tab = d.tab; draw(); }
    else if (d.lang) {
      lang = d.lang;
      S().settings.materialLang = lang;
      commit();
      draw();
    } else if ('generate' in d) {
      if (syl().material[chapterKey(sub, ch)] && !(await confirmDialog('Rewrite these notes? The current version will be replaced.', 'Rewrite'))) return;
      generate(sub, ch, lang);
    } else if ('cancel' in d) generating?.controller.abort();
    else if (d.savenote) saveNote(d.savenote);
  });

  el.addEventListener('submit', (e) => {
    if (e.target.id !== 'doubtForm') return;
    e.preventDefault();
    const q = e.target.q.value.trim();
    if (q.length < 8) return toast('Write your doubt in a little more detail', 'info');
    askDoubt(sub, ch, q, lang);
  });

  const onChange = () => el.isConnected && draw();
  window.addEventListener('ynb:syllabus', onChange);
  draw();
  if (ch) {
    chapterContent(sub, ch).then((c) => { offline = c; if (el.isConnected) draw(); }).catch(() => { offline = null; if (el.isConnected) draw(); });
  }
  return () => {
    clearInterval(loadTimer);
    window.removeEventListener('ynb:syllabus', onChange);
  };
}
