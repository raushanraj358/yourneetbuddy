// Toasts, modals, notifications, sound, small chart helpers.
import { icon } from './icons.js';
import { esc } from './utils.js';
import { S } from './store.js';

export function toast(msg, type = 'good', sub = '') {
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ico = { good: 'check', bad: 'alert', info: 'info', remind: 'bell' }[type] || 'info';
  el.innerHTML = `<span class="t-ico">${icon(ico, 18)}</span><div>${esc(msg)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  root.appendChild(el);
  const ttl = type === 'remind' ? 9000 : 3200;
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
  }, ttl);
}
window.addEventListener('ynb:toast', (e) => toast(e.detail.msg, e.detail.type));

export function openModal({ title, body, foot = '', wide = false, onMount }) {
  const root = document.getElementById('modalRoot');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn bare" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>`;
  const close = () => {
    wrap.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => e.key === 'Escape' && close();
  wrap.addEventListener('mousedown', (e) => {
    if (e.target === wrap) close();
  });
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  root.appendChild(wrap);
  const modal = wrap.querySelector('.modal');
  onMount?.(modal, close);
  setTimeout(() => modal.querySelector('input, textarea, select')?.focus(), 50);
  return close;
}

export function confirmDialog(message, okLabel = 'Delete') {
  return new Promise((resolve) => {
    let answered = false;
    const close = openModal({
      title: 'Are you sure?',
      body: `<p class="muted">${esc(message)}</p>`,
      foot: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" data-ok>${esc(okLabel)}</button>`,
      onMount(m) {
        m.querySelector('[data-ok]').addEventListener('click', () => {
          answered = true;
          resolve(true);
          close();
        });
        new MutationObserver((_, obs) => {
          if (!document.body.contains(m)) {
            obs.disconnect();
            if (!answered) resolve(false);
          }
        }).observe(document.getElementById('modalRoot'), { childList: true });
      },
    });
  });
}

let audioCtx;
export function chime() {
  if (!S().settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    [660, 880, 1320].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.18, now + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.5);
      o.connect(g).connect(audioCtx.destination);
      o.start(now + i * 0.16);
      o.stop(now + i * 0.16 + 0.55);
    });
  } catch {}
}

export function notify(title, body = '') {
  chime();
  toast(title, 'remind', body);
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      new Notification(title, { body, icon: 'assets/img/icon-192.png', tag: title });
    }
  } catch {}
}

/* ---------- Charts (SVG/HTML strings) ---------- */

export function ring(pct, size = 64, stroke = 7, color = 'var(--accent)', label = '') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--bg-2)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset .6s"/></svg>
    <span class="ring-label">${label}</span></div>`;
}

export function barChart(items, { target = 0, fmt = (v) => v } = {}) {
  const max = Math.max(target * 1.15, ...items.map((i) => i.value), 1);
  const tgt = target ? `<div class="target" style="bottom:${22 + (target / max) * 122}px"><span>Target</span></div>` : '';
  return `<div class="bars">${tgt}${items
    .map(
      (i) => `<div class="b ${target && i.value >= target ? 'hit' : ''} ${i.today ? 'today' : ''}" title="${esc(i.title || '')}">
        <div class="cw"><span class="val">${i.value ? fmt(i.value) : ''}</span><div class="col" style="height:calc(${(i.value / max)} * (100% - 18px))"></div></div>
        <small>${esc(i.label)}</small></div>`
    )
    .join('')}</div>`;
}

export function hbars(items, fmt = (v) => v) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return `<div class="stack" style="gap:10px">${items
    .map(
      (i) => `<div class="hbar"><span class="nm" title="${esc(i.label)}">${esc(i.label)}</span>
      <div class="track"><i style="width:${(i.value / max) * 100}%;background:${i.color}"></i></div>
      <span class="n">${fmt(i.value)}</span></div>`
    )
    .join('')}</div>`;
}

export function emptyState(ico, title, sub = '', action = '') {
  return `<div class="empty"><div class="em-icon">${icon(ico, 24)}</div><h4>${esc(title)}</h4><p>${esc(sub)}</p>${action ? `<div style="margin-top:14px">${action}</div>` : ''}</div>`;
}
