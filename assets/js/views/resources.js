import { S, commit } from '../store.js';
import { icon } from '../icons.js';
import { esc, uid, safeUrl } from '../utils.js';
import { LIBRARY, SUBJECTS, subjectById } from '../data.js';
import { openModal, toast, confirmDialog, emptyState, ring } from '../ui.js';

const TYPES = {
  web: { label: 'Website', emoji: '🌐', bg: 'var(--info-soft)' },
  pdf: { label: 'PDF / Docs', emoji: '📄', bg: 'var(--bad-soft)' },
  book: { label: 'Book', emoji: '📘', bg: 'var(--warn-soft)' },
  video: { label: 'Video', emoji: '▶️', bg: 'var(--accent-soft)' },
  course: { label: 'Course', emoji: '🎓', bg: 'var(--good-soft)' },
};
const STATUS = { todo: 'To read', doing: 'In progress', done: 'Completed' };
const NEXT = { todo: 'doing', doing: 'done', done: 'todo' };

let tab = 'library';
let q = '';
let subj = '';
let status = '';

export function mount(el) {
  function card(r, mine) {
    const t = TYPES[r.type] || TYPES.web;
    const st = (mine ? r.status : S().library[r.id]) || 'todo';
    const url = safeUrl(r.url || '');
    const s = subjectById(r.subject);
    return `<div class="res-card">
      <div class="rc-top"><span class="rc-ico" style="background:${t.bg}">${t.emoji}</span>
        <div style="flex:1;min-width:0"><h4>${esc(r.title)}</h4><p>${esc(r.desc || r.note || '')}</p></div></div>
      <div class="rc-foot">
        ${r.subject && r.subject !== 'general' ? `<span class="tag"><span class="dot" style="background:${s.color}"></span>${esc(s.short)}</span>` : '<span class="tag">General</span>'}
        <span class="spacer"></span>
        <button class="status-btn" data-s="${st}" data-status="${r.id}" data-mine="${mine ? 1 : ''}" title="Click to change status">${st === 'done' ? icon('check', 12) : ''}${STATUS[st]}</button>
        ${url ? `<a class="icon-btn sm" href="${esc(url)}" target="_blank" rel="noopener" title="Open" aria-label="Open ${esc(r.title)}">${icon('external', 14)}</a>` : ''}
        ${mine ? `<button class="icon-btn sm" data-edit="${r.id}" aria-label="Edit">${icon('edit', 14)}</button><button class="icon-btn sm" data-del="${r.id}" aria-label="Delete">${icon('trash', 14)}</button>` : ''}
      </div></div>`;
  }

  function match(r, mine) {
    const st = (mine ? r.status : S().library[r.id]) || 'todo';
    return (!q || (r.title + ' ' + (r.desc || '') + ' ' + (r.note || '')).toLowerCase().includes(q.toLowerCase())) && (!subj || r.subject === subj) && (!status || st === status);
  }

  function draw() {
    const lib = S().library;
    const done = LIBRARY.filter((r) => lib[r.id] === 'done').length;
    const doing = LIBRARY.filter((r) => lib[r.id] === 'doing').length;
    const mine = S().resources;
    const items = tab === 'library' ? LIBRARY.filter((r) => match(r, false)) : mine.filter((r) => match(r, true));
    const cats = tab === 'library' ? [...new Set(items.map((r) => r.cat))] : [];

    el.innerHTML = `
      <div class="grid g-3" style="margin-bottom:18px">
        <div class="card span-2 row" style="gap:20px">
          ${ring(done / LIBRARY.length, 84, 9, 'var(--good)', `${Math.round((done / LIBRARY.length) * 100)}%`)}
          <div class="stack" style="gap:4px"><span class="eyebrow">Core library progress</span>
            <span class="serif" style="font-size:30px;line-height:1.1">${done} of ${LIBRARY.length} completed</span>
            <span class="hint">${doing} in progress · ${mine.length} in your personal list. Mark sources as you finish them — NCERT first, then one good question bank.</span></div>
        </div>
        <div class="card stack" style="justify-content:center">
          <button class="btn accent" data-add>${icon('plus', 16)} Add a resource</button>
          <p class="hint" style="text-align:center">Save links, PDFs, YouTube lectures or books you're using.</p>
        </div>
      </div>
      <div class="row wrap" style="margin-bottom:16px;gap:10px">
        <div class="seg"><button class="${tab === 'library' ? 'on' : ''}" data-tab="library">${icon('library', 13)} Curated library</button><button class="${tab === 'mine' ? 'on' : ''}" data-tab="mine">${icon('bookmark', 13)} My resources ${mine.length}</button></div>
        <span class="spacer"></span>
        <div style="position:relative;min-width:200px;flex:1;max-width:320px"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)">${icon('search', 16)}</span>
          <input class="input" id="rSearch" placeholder="Search resources…" value="${esc(q)}" style="padding-left:36px" aria-label="Search resources"></div>
        <select class="select" id="rSubj" style="width:auto" aria-label="Filter by subject"><option value="">All subjects</option>${SUBJECTS.map((s) => `<option value="${s.id}" ${subj === s.id ? 'selected' : ''}>${esc(s.short)}</option>`).join('')}</select>
        <select class="select" id="rStatus" style="width:auto" aria-label="Filter by status"><option value="">Any status</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      </div>
      <div id="rItems">
      ${tab === 'library'
        ? (cats.length ? cats.map((c) => `<h3 class="serif" style="font-size:24px;margin:8px 0 12px">${esc(c)}</h3><div class="res-grid" style="margin-bottom:22px">${items.filter((r) => r.cat === c).map((r) => card(r, false)).join('')}</div>`).join('') : `<div class="card">${emptyState('search', 'No matches', 'Try different filters.')}</div>`)
        : (items.length ? `<div class="res-grid">${items.map((r) => card(r, true)).join('')}</div>` : `<div class="card">${emptyState('library', mine.length ? 'No matches' : 'Your list is empty', mine.length ? 'Try different filters.' : 'Add the books, links and lectures you are using.', mine.length ? '' : `<button class="btn sm" data-add>${icon('plus', 14)} Add resource</button>`)}</div>`)}
      </div>`;
  }

  function editor(existing) {
    const r = existing || { title: '', url: '', type: 'web', subject: '', note: '', status: 'todo' };
    openModal({
      title: existing ? 'Edit resource' : 'Add resource',
      body: `<form class="stack" id="rForm">
        <div class="field"><label>Title</label><input class="input" name="title" required value="${esc(r.title)}" placeholder="e.g. Rajya Sabha TV — Big Picture on federalism"></div>
        <div class="field"><label>Link (optional)</label><input class="input" name="url" type="url" value="${esc(r.url)}" placeholder="https://"></div>
        <div class="grid g-2" style="gap:12px">
          <div class="field"><label>Type</label><select class="select" name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${r.type === k ? 'selected' : ''}>${v.emoji} ${v.label}</option>`).join('')}</select></div>
          <div class="field"><label>Subject</label><select class="select" name="subject"><option value="">General</option>${SUBJECTS.map((s) => `<option value="${s.id}" ${r.subject === s.id ? 'selected' : ''}>${esc(s.short)}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Note</label><input class="input" name="note" value="${esc(r.note)}" placeholder="Why it's useful, which chapters, etc."></div>
      </form>`,
      foot: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" form="rForm">${existing ? 'Save' : 'Add resource'}</button>`,
      onMount(m, close) {
        m.querySelector('#rForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const f = e.target;
          const url = f.url.value.trim();
          if (url && !safeUrl(url)) return toast('Please enter a valid http(s) link', 'bad');
          const data = { title: f.title.value.trim(), url, type: f.type.value, subject: f.subject.value, note: f.note.value.trim() };
          if (existing) Object.assign(existing, data);
          else S().resources.unshift({ id: uid(), status: 'todo', createdAt: Date.now(), ...data });
          commit();
          close();
          tab = 'mine';
          draw();
          toast(existing ? 'Resource updated' : 'Resource added', 'good');
        });
      },
    });
  }

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.tab) { tab = d.tab; draw(); }
    else if ('add' in d) editor();
    else if (d.status) {
      if (d.mine) { const r = S().resources.find((x) => x.id === d.status); r.status = NEXT[r.status || 'todo']; }
      else S().library[d.status] = NEXT[S().library[d.status] || 'todo'];
      commit();
      draw();
    } else if (d.edit) editor(S().resources.find((x) => x.id === d.edit));
    else if (d.del) {
      if (await confirmDialog('Remove this resource from your list?', 'Remove')) {
        S().resources = S().resources.filter((x) => x.id !== d.del);
        commit();
        draw();
      }
    }
  });
  el.addEventListener('input', (e) => {
    if (e.target.id === 'rSearch') {
      q = e.target.value;
      const pos = e.target.selectionStart;
      draw();
      const s = el.querySelector('#rSearch');
      s.focus();
      s.setSelectionRange(pos, pos);
    }
  });
  el.addEventListener('change', (e) => {
    if (e.target.id === 'rSubj') { subj = e.target.value; draw(); }
    if (e.target.id === 'rStatus') { status = e.target.value; draw(); }
  });

  draw();
}
