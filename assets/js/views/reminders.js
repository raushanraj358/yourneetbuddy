import { S, commit } from '../store.js';
import { icon } from '../icons.js';
import { esc, uid, dateKey, fmtTime12, parseKey } from '../utils.js';
import { PRESET_REMINDERS } from '../data.js';
import { nextOccurrence } from '../reminders-engine.js';
import { toast, notify, emptyState, confirmDialog } from '../ui.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EMOJIS = ['⏰', '📰', '📚', '✍️', '🔁', '🎯', '🧮', '🧘', '💧', '😴'];
const REPEAT_LABEL = { once: 'Once', daily: 'Every day', weekdays: 'Mon – Fri', weekly: 'Weekly' };

let form = { title: '', time: '07:00', repeat: 'daily', date: dateKey(), days: [1], emoji: '⏰', note: '' };

export function mount(el) {
  function describe(r) {
    if (r.repeat === 'weekly') return (r.days || []).sort().map((d) => DAYS[d]).join(', ');
    if (r.repeat === 'once') return parseKey(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return REPEAT_LABEL[r.repeat];
  }
  function nextLabel(r) {
    if (!r.enabled) return 'Paused';
    const n = nextOccurrence(r);
    if (!n) return 'Done';
    const today = new Date();
    const tmr = new Date(); tmr.setDate(today.getDate() + 1);
    const day = n.toDateString() === today.toDateString() ? 'Today' : n.toDateString() === tmr.toDateString() ? 'Tomorrow' : n.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const mins = Math.round((n - today) / 60000);
    const rel = mins < 60 ? `in ${mins} min` : mins < 1440 ? `in ${Math.floor(mins / 60)}h ${mins % 60}m` : '';
    return `${day}${rel ? ' · ' + rel : ''}`;
  }
  function permState() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  function draw() {
    const list = [...S().reminders].sort((a, b) => a.time.localeCompare(b.time));
    const perm = permState();
    el.innerHTML = `
    <div class="grid g-3">
      <div class="stack span-2" style="gap:18px">
        <div class="card">
          <div class="card-head"><h3>${icon('plus', 17)} New reminder</h3></div>
          <form id="remForm" class="stack">
            <div class="row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">
              <div class="field" style="width:76px"><label>Icon</label><select class="select" name="emoji">${EMOJIS.map((e) => `<option ${form.emoji === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
              <div class="field" style="flex:1;min-width:200px"><label>What</label><input class="input" name="title" required placeholder="e.g. Revise Organic named reactions" value="${esc(form.title)}"></div>
              <div class="field" style="width:140px"><label>Time</label><input class="input" type="time" name="time" required value="${form.time}"></div>
            </div>
            <div class="field"><span class="label">Repeat</span><div class="seg">${Object.entries(REPEAT_LABEL).map(([k, v]) => `<button type="button" class="${form.repeat === k ? 'on' : ''}" data-repeat="${k}">${v}</button>`).join('')}</div></div>
            ${form.repeat === 'once' ? `<div class="field" style="max-width:220px"><label>Date</label><input class="input" type="date" name="date" min="${dateKey()}" value="${form.date}"></div>` : ''}
            ${form.repeat === 'weekly' ? `<div class="field"><span class="label">On</span><div class="daypick">${DAYS.map((d, i) => `<button type="button" class="${form.days.includes(i) ? 'on' : ''}" data-day="${i}">${d.slice(0, 2)}</button>`).join('')}</div></div>` : ''}
            <div class="field"><label>Note (optional)</label><input class="input" name="note" placeholder="Shown with the notification" value="${esc(form.note)}"></div>
            <div><button class="btn primary">${icon('bell', 16)} Save reminder</button></div>
          </form>
        </div>

        <div class="card">
          <div class="card-head"><h3>${icon('bell', 17)} Your reminders</h3><span class="muted">${list.filter((r) => r.enabled).length} active</span></div>
          ${list.length ? `<div class="stack" style="gap:10px">${list.map((r) => `
            <div class="rem ${r.enabled ? '' : 'off'}">
              <div class="rem-time">${fmtTime12(r.time).replace(/ (AM|PM)/, '<span style="font-size:15px;font-family:var(--font);font-weight:700;margin-left:3px">$1</span>')}<small>${esc(describe(r))}</small></div>
              <div style="flex:1;min-width:0"><b>${esc(r.emoji || '⏰')} ${esc(r.title)}</b><div class="hint">${esc(nextLabel(r))}${r.note ? ' · ' + esc(r.note) : ''}</div></div>
              <label class="switch" title="${r.enabled ? 'Pause' : 'Enable'}"><input type="checkbox" data-toggle="${r.id}" ${r.enabled ? 'checked' : ''} aria-label="Enabled"><span></span></label>
              <button class="icon-btn sm bare" data-del="${r.id}" aria-label="Delete reminder">${icon('trash', 15)}</button>
            </div>`).join('')}</div>`
            : emptyState('bell', 'No reminders yet', 'Pick a preset on the right or create your own.')}
        </div>
      </div>

      <div class="stack" style="gap:18px">
        <div class="card">
          <div class="card-head"><h3>Notifications</h3></div>
          ${perm === 'granted' ? `<div class="notice info" style="background:var(--good-soft);border-color:transparent">${icon('check', 18)}<div>Browser notifications are on.</div></div>`
            : perm === 'denied' ? `<div class="notice">${icon('alert', 18)}<div>Notifications are blocked. Allow them for this site in your browser settings to get alerts in the background.</div></div>`
            : perm === 'unsupported' ? `<div class="notice">${icon('alert', 18)}<div>This browser doesn't support notifications. You'll still get in-app alerts with a chime.</div></div>`
            : `<p class="hint" style="margin-bottom:12px">Allow notifications so reminders reach you even when this tab is in the background.</p><button class="btn accent block" data-perm>${icon('bell', 16)} Enable notifications</button>`}
          <button class="btn ghost block sm" data-test style="margin-top:10px">Send a test alert</button>
          <p class="hint" style="margin-top:10px">Reminders fire while YourNEETBuddy is open in a tab (tip: install it as an app from your browser menu and keep it pinned).</p>
        </div>
        <div class="card">
          <div class="card-head"><h3>Quick presets</h3></div>
          <div class="stack" style="gap:8px">${PRESET_REMINDERS.map((p, i) => `
            <button class="preset" data-preset="${i}"><span style="font-size:20px">${p.emoji}</span><span style="flex:1"><b style="font-size:14px">${esc(p.title)}</b><br><span class="hint">${fmtTime12(p.time)} · ${p.repeat === 'weekly' ? DAYS[p.days[0]] + 's' : REPEAT_LABEL[p.repeat]}</span></span>${icon('plus', 16)}</button>`).join('')}</div>
        </div>
      </div>
    </div>`;
  }

  function add(r) {
    S().reminders.push({ id: uid(), enabled: true, createdAt: Date.now(), lastFired: 0, ...r });
    commit();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(draw);
  }

  // Keep form fields in module state so re-renders (repeat toggle) don't lose input.
  const syncForm = () => {
    const f = el.querySelector('#remForm');
    if (!f) return;
    form.title = f.title.value;
    form.time = f.time.value;
    form.emoji = f.emoji.value;
    form.note = f.note.value;
    if (f.date) form.date = f.date.value;
  };

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.repeat) { syncForm(); form.repeat = d.repeat; draw(); }
    else if (d.day) {
      syncForm();
      const i = Number(d.day);
      form.days = form.days.includes(i) ? form.days.filter((x) => x !== i) : [...form.days, i];
      draw();
    } else if (d.preset) {
      const p = PRESET_REMINDERS[Number(d.preset)];
      add({ title: p.title, time: p.time, repeat: p.repeat, days: p.days || [], emoji: p.emoji, date: dateKey(), note: '' });
      toast('Reminder added', 'good', `${p.title} · ${fmtTime12(p.time)}`);
      draw();
    } else if (d.del) {
      if (await confirmDialog('Delete this reminder?')) {
        S().reminders = S().reminders.filter((r) => r.id !== d.del);
        commit();
        draw();
      }
    } else if ('perm' in d) { await Notification.requestPermission(); draw(); }
    else if ('test' in d) {
      if ('Notification' in window && Notification.permission === 'granted') new Notification('YourNEETBuddy', { body: 'Notifications are working 🎉', icon: 'assets/img/icon-192.png' });
      notify('This is how reminders look', 'You will hear a soft chime too.');
    }
  });
  el.addEventListener('change', (e) => {
    const id = e.target.dataset.toggle;
    if (!id) return;
    const r = S().reminders.find((x) => x.id === id);
    r.enabled = e.target.checked;
    if (r.enabled) r.lastFired = Date.now(); // don't immediately fire a just-missed occurrence
    if (r.enabled && r.repeat === 'once' && !nextOccurrence(r)) { r.enabled = false; toast('That one-time reminder is in the past — create a new one', 'bad'); }
    commit();
    draw();
  });
  el.addEventListener('submit', (e) => {
    if (e.target.id !== 'remForm') return;
    e.preventDefault();
    syncForm();
    if (form.repeat === 'weekly' && !form.days.length) return toast('Pick at least one day', 'bad');
    const r = { title: form.title.trim(), time: form.time, repeat: form.repeat, days: [...form.days], date: form.repeat === 'once' ? form.date : dateKey(), emoji: form.emoji, note: form.note.trim() };
    if (r.repeat === 'once' && !nextOccurrence(r)) return toast('That time has already passed', 'bad');
    add(r);
    toast('Reminder saved', 'good', `${r.title} · ${fmtTime12(r.time)}`);
    form = { ...form, title: '', note: '' };
    draw();
  });

  draw();
  // Refresh "in X min" labels, but never while the user is typing in the form.
  const iv = setInterval(() => {
    if (el.contains(document.activeElement) && document.activeElement.matches('input, select')) return;
    syncForm();
    draw();
  }, 60000);
  return () => clearInterval(iv);
}
