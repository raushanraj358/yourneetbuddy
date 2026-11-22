import { S, commit } from '../store.js';
import { icon } from '../icons.js';
import { esc, uid, dateKey, addDays, parseKey, debounce, timeAgo, wordCount, fmtDate } from '../utils.js';
import { SUBJECTS, subjectById } from '../data.js';
import { md, plain } from '../md.js';
import { toast, confirmDialog, emptyState } from '../ui.js';

const INTERVALS = [1, 3, 7, 15, 30, 60]; // spaced-repetition gaps in days
let selectedId = null;
let filter = 'all';
let query = '';
let preview = false;

export function mount(el, params) {
  if (params.filter) filter = params.filter;
  if (params.id) { selectedId = params.id; preview = true; }
  if (params.new) { createNote(); history.replaceState(null, '', '#/notes'); }

  el.innerHTML = `<div class="notes-layout" id="nl"><div class="card notes-list" id="nList"></div><div class="card note-editor" id="nEditor" style="padding:26px"></div></div>`;
  const listEl = el.querySelector('#nList');
  const edEl = el.querySelector('#nEditor');
  const layout = el.querySelector('#nl');

  function createNote() {
    const n = { id: uid(), title: '', subject: filter && subjectById(filter).paper && SUBJECTS.some((s) => s.id === filter) ? filter : 'botany', tags: [], body: '', pinned: false, createdAt: Date.now(), updatedAt: Date.now(), openedAt: Date.now(), revisions: 0, nextRevision: dateKey(addDays(new Date(), INTERVALS[0])) };
    S().notes.unshift(n);
    commit();
    selectedId = n.id;
    preview = false;
    return n;
  }

  function visible() {
    const today = dateKey();
    const q = query.toLowerCase();
    return S().notes
      .filter((n) => filter === 'all' || (filter === 'due' ? n.nextRevision && n.nextRevision <= today : filter === 'pinned' ? n.pinned : n.subject === filter))
      .filter((n) => !q || (n.title + ' ' + n.body + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
  }

  function drawList() {
    const today = dateKey();
    const notes = visible();
    const dueCount = S().notes.filter((n) => n.nextRevision && n.nextRevision <= today).length;
    const usedSubjects = [...new Set(S().notes.map((n) => n.subject))];
    listEl.innerHTML = `
      <div class="row" style="margin-bottom:10px"><div style="position:relative;flex:1">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)">${icon('search', 16)}</span>
        <input class="input" id="nSearch" placeholder="Search notes…" value="${esc(query)}" style="padding-left:36px" aria-label="Search notes"></div>
        <button class="btn primary" data-new title="New note">${icon('plus', 16)}</button></div>
      <div class="row wrap" style="gap:6px;margin-bottom:12px">
        <button class="chip ${filter === 'all' ? 'on' : ''}" data-filter="all">All ${S().notes.length}</button>
        <button class="chip ${filter === 'due' ? 'on' : ''}" data-filter="due">${icon('revise', 12)} Due ${dueCount}</button>
        <button class="chip ${filter === 'pinned' ? 'on' : ''}" data-filter="pinned">${icon('pin', 12)} Pinned</button>
        ${usedSubjects.map((s) => `<button class="chip ${filter === s ? 'on' : ''}" data-filter="${s}"><span class="dot" style="background:${subjectById(s).color}"></span>${esc(subjectById(s).short)}</button>`).join('')}
      </div>
      <div class="scroll">${notes.length ? notes.map((n) => {
        const due = n.nextRevision && n.nextRevision <= today;
        return `<button class="note-item ${n.id === selectedId ? 'sel' : ''}" data-open="${n.id}">
          <b>${n.pinned ? `<span style="color:var(--accent)">${icon('pin', 13)}</span>` : ''}${esc(n.title || 'Untitled note')}</b>
          <p>${esc(plain(n.body) || 'Empty note')}</p>
          <span class="meta"><span class="tag"><span class="dot" style="background:${subjectById(n.subject).color}"></span>${esc(subjectById(n.subject).short)}</span>
          ${due ? `<span class="tag" style="color:var(--accent)">${icon('revise', 11)} Revise</span>` : ''}<span class="hint">${timeAgo(n.updatedAt)}</span></span></button>`;
      }).join('') : emptyState('notes', query ? 'No matches' : filter === 'due' ? 'All caught up' : 'No notes yet', query ? 'Try another search.' : filter === 'due' ? 'Nothing is due for revision today.' : 'Create subject-wise notes and revise them on schedule.')}</div>`;
  }

  function drawEditor() {
    const n = S().notes.find((x) => x.id === selectedId);
    layout.classList.toggle('editing', Boolean(n));
    if (!n) {
      edEl.innerHTML = `<div class="empty" style="padding:70px 20px"><div class="em-icon">${icon('edit', 24)}</div><h4>Your NEET notebook</h4>
        <p>Write crisp, revisable notes. Use <b>**bold**</b>, <b>==highlight==</b>, lists and headings.<br>Every note is scheduled for revision on a 1–3–7–15–30–60 day cycle.</p>
        <button class="btn accent" data-new style="margin-top:16px">${icon('plus', 16)} New note</button></div>`;
      return;
    }
    const due = n.nextRevision && n.nextRevision <= dateKey();
    edEl.innerHTML = `
      <div class="row wrap" style="margin-bottom:16px;gap:8px">
        <button class="icon-btn mobile-only" data-back aria-label="Back to list">${icon('left')}</button>
        <select class="select" id="nSubject" style="width:auto" aria-label="Subject">${SUBJECTS.map((s) => `<option value="${s.id}" ${s.id === n.subject ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
        <input class="input" id="nTags" style="width:180px" placeholder="tags, comma separated" value="${esc((n.tags || []).join(', '))}" aria-label="Tags">
        <span class="spacer"></span>
        <div class="seg"><button class="${!preview ? 'on' : ''}" data-preview="0">${icon('edit', 13)} Write</button><button class="${preview ? 'on' : ''}" data-preview="1">${icon('eye', 13)} Read</button></div>
        <button class="icon-btn" data-pin title="${n.pinned ? 'Unpin' : 'Pin'}" aria-label="Pin" style="${n.pinned ? 'color:var(--accent)' : ''}">${icon('pin', 16)}</button>
        <button class="icon-btn" data-delete title="Delete note" aria-label="Delete">${icon('trash', 16)}</button>
      </div>
      <input class="editor-title" id="nTitle" placeholder="Note title" value="${esc(n.title)}" aria-label="Title">
      <div class="row wrap hint" style="margin:8px 0 18px;gap:12px">
        <span>${icon('clock', 13)} Edited ${timeAgo(n.updatedAt)}</span><span id="nWords">${wordCount(n.body)} words</span>
        <span>${icon('revise', 13)} ${n.revisions || 0} revision${n.revisions === 1 ? '' : 's'}${n.nextRevision ? ` · next ${n.nextRevision <= dateKey() ? '<b style="color:var(--accent)">due now</b>' : fmtDate(n.nextRevision)}` : ''}</span>
      </div>
      ${preview ? `<div class="md">${n.body ? md(n.body) : '<p class="muted">Nothing here yet — switch to Write.</p>'}</div>`
        : `<div class="toolbar" style="margin-bottom:14px">
            <button data-fmt="h2" title="Heading">H</button><button data-fmt="bold" title="Bold"><b>B</b></button><button data-fmt="italic" title="Italic"><i>I</i></button>
            <button data-fmt="hl" title="Highlight" style="background:var(--hi)">Hi</button><button data-fmt="ul" title="Bullet list">• List</button><button data-fmt="ol" title="Numbered list">1. List</button>
            <button data-fmt="quote" title="Quote">❝</button><button data-fmt="link" title="Link">${icon('link', 13)}</button></div>
          <textarea class="editor-body" id="nBody" placeholder="Start writing… e.g.\n\n## Article 21\n- Right to life & personal liberty\n- ==Maneka Gandhi (1978)== expanded scope: 'procedure established by law' must be fair, just and reasonable">${esc(n.body)}</textarea>`}
      <hr class="divider" style="margin-top:22px">
      <div class="row wrap">
        <button class="btn ${due ? 'accent' : ''}" data-revised>${icon('check', 16)} ${due ? 'Mark revised' : 'Revised early'}</button>
        <a class="btn" href="#/quiz?note=${n.id}">${icon('sparkles', 16)} Quiz me on this note</a>
        <span class="spacer"></span>
        <span class="hint">Created ${fmtDate(n.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>`;
  }

  const persist = debounce(() => { commit(); drawList(); }, 500);
  const cur = () => S().notes.find((x) => x.id === selectedId);

  el.addEventListener('input', (e) => {
    const n = cur();
    if (e.target.id === 'nSearch') { query = e.target.value; const pos = e.target.selectionStart; drawList(); const s = el.querySelector('#nSearch'); s.focus(); s.setSelectionRange(pos, pos); return; }
    if (!n) return;
    if (e.target.id === 'nTitle') n.title = e.target.value;
    else if (e.target.id === 'nBody') { n.body = e.target.value; el.querySelector('#nWords').textContent = `${wordCount(n.body)} words`; }
    else if (e.target.id === 'nTags') n.tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
    else return;
    n.updatedAt = Date.now();
    persist();
  });
  el.addEventListener('change', (e) => {
    const n = cur();
    if (n && e.target.id === 'nSubject') { n.subject = e.target.value; n.updatedAt = Date.now(); commit(); drawList(); }
  });

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    const n = cur();
    if ('new' in d) { createNote(); drawList(); drawEditor(); el.querySelector('#nTitle')?.focus(); }
    else if (d.filter) { filter = d.filter; drawList(); }
    else if (d.open) {
      selectedId = d.open;
      const x = cur();
      x.openedAt = Date.now();
      preview = Boolean(x.body);
      commit();
      drawList();
      drawEditor();
      if (innerWidth < 980) scrollTo({ top: 0 });
    } else if ('back' in d) { selectedId = null; drawList(); drawEditor(); }
    else if (d.preview) { preview = d.preview === '1'; drawEditor(); }
    else if ('pin' in d && n) { n.pinned = !n.pinned; commit(); drawList(); drawEditor(); }
    else if ('delete' in d && n) {
      if (await confirmDialog(`Delete "${n.title || 'Untitled note'}"? This cannot be undone.`)) {
        S().notes = S().notes.filter((x) => x.id !== n.id);
        selectedId = null;
        commit();
        drawList();
        drawEditor();
      }
    } else if ('revised' in d && n) {
      n.revisions = (n.revisions || 0) + 1;
      n.lastRevised = dateKey();
      const gap = INTERVALS[Math.min(n.revisions, INTERVALS.length - 1)];
      n.nextRevision = dateKey(addDays(new Date(), gap));
      commit();
      drawList();
      drawEditor();
      toast(`Revision #${n.revisions} done`, 'good', `Next revision in ${gap} days.`);
    } else if (d.fmt) applyFormat(d.fmt);
  });

  function applyFormat(kind) {
    const ta = el.querySelector('#nBody');
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value: v } = ta;
    const sel = v.slice(s, e);
    const lineStart = v.lastIndexOf('\n', s - 1) + 1;
    let out, caret;
    const wrap = (a, b, ph) => { const t = sel || ph; out = v.slice(0, s) + a + t + b + v.slice(e); caret = [s + a.length, s + a.length + t.length]; };
    const prefix = (p) => {
      const block = v.slice(lineStart, e);
      const lines = block.split('\n').map((l, i) => (typeof p === 'function' ? p(i) : p) + l);
      out = v.slice(0, lineStart) + lines.join('\n') + v.slice(e);
      caret = [out.length - (v.length - e), out.length - (v.length - e)];
    };
    if (kind === 'bold') wrap('**', '**', 'bold');
    else if (kind === 'italic') wrap('*', '*', 'italic');
    else if (kind === 'hl') wrap('==', '==', 'key point');
    else if (kind === 'link') wrap('[', '](https://)', 'link text');
    else if (kind === 'h2') prefix('## ');
    else if (kind === 'ul') prefix('- ');
    else if (kind === 'ol') prefix((i) => `${i + 1}. `);
    else if (kind === 'quote') prefix('> ');
    ta.value = out;
    ta.focus();
    ta.setSelectionRange(caret[0], caret[1]);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Keyboard shortcuts inside the editor.
  el.addEventListener('keydown', (e) => {
    if (e.target.id !== 'nBody' || !(e.metaKey || e.ctrlKey)) return;
    const map = { b: 'bold', i: 'italic', h: 'hl' };
    if (map[e.key]) { e.preventDefault(); applyFormat(map[e.key]); }
  });

  if (selectedId && !cur()) selectedId = null;
  drawList();
  drawEditor();
  return () => persist && commit();
}
