import { S, commit, tasksFor, minutesOn, habitDoneCount } from '../store.js';
import { icon } from '../icons.js';
import { esc, dateKey, parseKey, addDays, startOfWeek, uid, fmtMin, debounce, fmtDate } from '../utils.js';
import { SUBJECTS, subjectById } from '../data.js';
import { openModal, toast, confirmDialog } from '../ui.js';

let selected = dateKey();

export function mount(el) {
  const today = dateKey();

  function heatmap() {
    const defs = S().habits.defs.length || 1;
    const weeks = 16;
    const start = addDays(startOfWeek(new Date()), -(weeks - 1) * 7);
    let cols = '';
    for (let w = 0; w < weeks; w++) {
      let cells = '';
      for (let d = 0; d < 7; d++) {
        const day = addDays(start, w * 7 + d);
        const k = dateKey(day);
        if (k > today) { cells += '<div class="cell fut"></div>'; continue; }
        const ratio = habitDoneCount(k) / defs;
        const lvl = ratio === 0 ? '' : ratio < 0.34 ? 'l1' : ratio < 0.67 ? 'l2' : ratio < 1 ? 'l3' : 'l4';
        cells += `<div class="cell ${lvl}" title="${fmtDate(k)} · ${habitDoneCount(k)}/${defs} habits"></div>`;
      }
      cols += `<div class="col">${cells}</div>`;
    }
    return cols;
  }

  function draw() {
    const st = S();
    const sel = parseKey(selected);
    const wk = startOfWeek(sel);
    const tasks = tasksFor(selected);
    const done = tasks.filter((t) => t.done).length;
    const habitLog = st.habits.log[selected] || [];
    const planned = tasks.reduce((a, t) => a + (Number(t.mins) || 0), 0);
    const isPast = selected < today;
    const pendingPast = isPast ? tasks.filter((t) => !t.done).length : 0;

    el.innerHTML = `
    <div class="card" style="padding:14px">
      <div class="week-strip">
        <button class="icon-btn" data-week="-1" aria-label="Previous week">${icon('left')}</button>
        ${Array.from({ length: 7 }, (_, i) => {
          const d = addDays(wk, i);
          const k = dateKey(d);
          const ts = st.tasks[k] || [];
          const r = ts.length ? ts.filter((t) => t.done).length / ts.length : 0;
          return `<button class="day-pill ${k === today ? 'today' : ''} ${k === selected ? 'sel' : ''}" data-day="${k}">
            <span class="dn">${d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
            <span class="dd">${d.getDate()}</span>
            <span class="dm"><i style="width:${r * 100}%"></i></span></button>`;
        }).join('')}
        <button class="icon-btn" data-week="1" aria-label="Next week">${icon('right')}</button>
      </div>
    </div>

    <div class="grid g-3" style="margin-top:18px">
      <div class="card span-2">
        <div class="card-head">
          <div><h3>${icon('tracker', 17)} ${selected === today ? "Today's" : sel.toLocaleDateString('en-IN', { weekday: 'long' }) + "'s"} tasks</h3>
          <p class="hint">${fmtDate(selected, { day: 'numeric', month: 'long', year: 'numeric' })} · ${done}/${tasks.length} done${planned ? ` · ${fmtMin(planned)} planned` : ''} · ${fmtMin(minutesOn(selected))} studied</p></div>
          <div class="row">
            ${selected !== today ? `<button class="btn sm ghost" data-today>Today</button>` : ''}
            ${pendingPast ? `<button class="btn sm" data-carry title="Move unfinished tasks to today">${icon('arrow', 14)} Carry ${pendingPast} to today</button>` : ''}
          </div>
        </div>
        <form id="addTask" class="task-form">
          <input class="input" name="title" placeholder="e.g. NCERT Biology Ch. 5 — Molecular Basis of Inheritance" autocomplete="off" required aria-label="Task">
          <select class="select" name="subject" aria-label="Subject"><option value="">Subject</option>${SUBJECTS.map((s) => `<option value="${s.id}">${esc(s.short)}</option>`).join('')}</select>
          <input class="input" name="mins" type="number" min="0" step="15" placeholder="Min" aria-label="Estimated minutes">
          <button class="btn primary">${icon('plus', 16)} Add</button>
        </form>
        ${tasks.length ? `<div class="list">${tasks.map((t) => `
          <div class="li ${t.done ? 'done' : ''}">
            <button class="check ${t.done ? 'on' : ''}" data-toggle="${t.id}" aria-label="Toggle">${icon('check', 14)}</button>
            <div class="li-main">
              <div class="li-title">${t.priority ? '<span title="High priority" style="color:var(--accent)">★ </span>' : ''}${esc(t.title)}</div>
              <div class="li-sub">${t.subject ? `<span class="tag"><span class="dot" style="background:${subjectById(t.subject).color}"></span>${esc(subjectById(t.subject).short)}</span>` : ''}${t.mins ? `<span>${icon('clock', 12)} ${fmtMin(t.mins)}</span>` : ''}</div>
            </div>
            <div class="li-actions">
              <button class="icon-btn sm bare" data-star="${t.id}" title="Toggle priority" aria-label="Toggle priority">${icon('flag', 15)}</button>
              ${t.subject ? `<a class="icon-btn sm bare" href="#/study?start=1&subject=${t.subject}" title="Start timer for this" aria-label="Start timer">${icon('play', 13)}</a>` : ''}
              <button class="icon-btn sm bare" data-del="${t.id}" title="Delete" aria-label="Delete">${icon('trash', 15)}</button>
            </div>
          </div>`).join('')}</div>`
          : `<div class="empty"><div class="em-icon">${icon('tracker', 24)}</div><h4>Plan your day</h4><p>Break the syllabus into small, finishable tasks.</p>
             <button class="btn sm" data-template style="margin-top:12px">${icon('sparkles', 14)} Use a balanced day template</button></div>`}
      </div>

      <div class="stack" style="gap:18px">
        <div class="card">
          <div class="card-head"><h3>Daily habits</h3><span class="muted">${habitLog.length}/${st.habits.defs.length}</span></div>
          <div class="stack" style="gap:8px">
            ${st.habits.defs.map((h) => `
              <button class="habit ${habitLog.includes(h.id) ? 'on' : ''}" data-habit="${h.id}">
                <span class="h-emoji">${esc(h.emoji)}</span>
                <span class="h-main"><b>${esc(h.title)}</b><small>${esc(h.hint || '')}</small></span>
                <span class="check ${habitLog.includes(h.id) ? 'on' : ''}">${icon('check', 14)}</span>
              </button>`).join('')}
          </div>
          <button class="btn sm ghost block" data-edit-habits style="margin-top:10px">${icon('edit', 14)} Edit habits</button>
        </div>
      </div>
    </div>

    <div class="grid g-2" style="margin-top:18px">
      <div class="card">
        <div class="card-head"><h3>Habit consistency</h3><span class="muted">last 16 weeks</span></div>
        <div class="heatmap">${heatmap()}</div>
        <div class="legend" style="margin-top:10px">Less <span class="cell" style="background:var(--bg-2)"></span><span class="cell" style="background:color-mix(in srgb,var(--accent) 25%,var(--bg-2))"></span><span class="cell" style="background:color-mix(in srgb,var(--accent) 50%,var(--bg-2))"></span><span class="cell" style="background:color-mix(in srgb,var(--accent) 75%,var(--bg-2))"></span><span class="cell" style="background:var(--accent)"></span> More</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>${icon('pen', 17)} Day log</h3><span class="muted" id="jSaved"></span></div>
        <textarea class="textarea" id="journal" rows="6" placeholder="What did you learn today? What will you fix tomorrow? (auto-saves)">${esc(st.journal[selected] || '')}</textarea>
      </div>
    </div>`;
  }

  const saveJournal = debounce((v) => {
    if (v.trim()) S().journal[selected] = v;
    else delete S().journal[selected];
    commit();
    const s = el.querySelector('#jSaved');
    if (s) s.textContent = 'Saved';
  }, 500);

  el.addEventListener('input', (e) => {
    if (e.target.id === 'journal') {
      el.querySelector('#jSaved').textContent = 'Saving…';
      saveJournal(e.target.value);
    }
  });

  el.addEventListener('submit', (e) => {
    if (e.target.id !== 'addTask') return;
    e.preventDefault();
    const f = e.target;
    tasksFor(selected).push({ id: uid(), title: f.title.value.trim(), subject: f.subject.value, mins: Number(f.mins.value) || 0, done: false });
    commit();
    draw();
    el.querySelector('#addTask input').focus();
  });

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button, a');
    if (!b) return;
    const d = b.dataset;
    const list = tasksFor(selected);
    if (d.day) { selected = d.day; draw(); }
    else if (d.week) { selected = dateKey(addDays(parseKey(selected), 7 * Number(d.week))); draw(); }
    else if ('today' in d) { selected = today; draw(); }
    else if (d.toggle) { const t = list.find((x) => x.id === d.toggle); t.done = !t.done; commit(); draw(); }
    else if (d.star) { const t = list.find((x) => x.id === d.star); t.priority = !t.priority; list.sort((a, b2) => (b2.priority ? 1 : 0) - (a.priority ? 1 : 0)); commit(); draw(); }
    else if (d.del) { S().tasks[selected] = list.filter((x) => x.id !== d.del); commit(); draw(); }
    else if (d.habit) {
      const log = (S().habits.log[selected] ||= []);
      const i = log.indexOf(d.habit);
      i >= 0 ? log.splice(i, 1) : log.push(d.habit);
      commit();
      draw();
      if (log.length === S().habits.defs.length && i < 0) toast('All habits done today! 🔥', 'good');
    } else if ('carry' in d) {
      const pending = list.filter((t) => !t.done);
      S().tasks[selected] = list.filter((t) => t.done);
      tasksFor(today).push(...pending.map((t) => ({ ...t, id: uid() })));
      commit();
      toast(`Moved ${pending.length} task(s) to today`, 'good');
      selected = today;
      draw();
    } else if ('template' in d) {
      const tpl = [
        ['Biology NCERT reading (1 chapter section)', 'botany', 120],
        ['Zoology NCERT + diagrams', 'zoology', 90],
        ['Physics concept + 30 numericals', 'physics', 120],
        ['Chemistry: reactions / numericals', 'chemistry', 90],
        ['Revision of yesterday’s topics', '', 60],
        ['Chapter test / PYQs (45 Qs)', '', 45],
      ];
      list.push(...tpl.map(([title, subject, mins]) => ({ id: uid(), title, subject, mins, done: false })));
      commit();
      draw();
    } else if ('editHabits' in d) editHabits(draw);
  });

  draw();
}

function editHabits(redraw) {
  const defs = S().habits.defs;
  const row = (h) => `<div class="row" data-row><input class="input" style="width:60px;text-align:center" value="${esc(h.emoji)}" data-k="emoji" aria-label="Emoji">
    <input class="input" value="${esc(h.title)}" data-k="title" placeholder="Habit" aria-label="Habit name"><input type="hidden" value="${esc(h.id)}" data-k="id">
    <button class="icon-btn" data-rm aria-label="Remove">${icon('trash', 15)}</button></div>`;
  openModal({
    title: 'Edit habits',
    body: `<div class="stack" id="hList">${defs.map(row).join('')}</div><button class="btn sm ghost" id="hAdd" style="margin-top:10px">${icon('plus', 14)} Add habit</button>`,
    foot: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="hSave">Save</button>`,
    onMount(m, close) {
      m.querySelector('#hAdd').onclick = () => m.querySelector('#hList').insertAdjacentHTML('beforeend', row({ emoji: '⭐', title: '', id: uid() }));
      m.addEventListener('click', (e) => e.target.closest('[data-rm]')?.closest('[data-row]').remove());
      m.querySelector('#hSave').onclick = () => {
        S().habits.defs = [...m.querySelectorAll('[data-row]')]
          .map((r) => ({ id: r.querySelector('[data-k=id]').value, emoji: r.querySelector('[data-k=emoji]').value || '⭐', title: r.querySelector('[data-k=title]').value.trim(), hint: defs.find((x) => x.id === r.querySelector('[data-k=id]').value)?.hint || '' }))
          .filter((h) => h.title);
        commit();
        close();
        redraw();
      };
    },
  });
}
