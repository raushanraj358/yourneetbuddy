// Contact: feedback / issue form (opens the visitor's email app with a pre-filled message; no server needed),
// plus the public email address and social links.
import { S } from '../store.js';
import { icon } from '../icons.js';
import { esc } from '../utils.js';
import { toast } from '../ui.js';

export const CONTACT = {
  email: 'yourneetbuddy1@gmail.com',
  instagram: { handle: 'your.neet.buddy', url: 'https://www.instagram.com/your.neet.buddy/' },
  x: { handle: 'yourneetbuddy', url: 'https://x.com/yourneetbuddy' },
};

const TYPES = [
  { id: 'feedback', label: 'Feedback', icon: 'star', hint: 'What do you like, and what could be better?' },
  { id: 'issue', label: 'Report an issue', icon: 'alert', hint: 'What happened, and what did you expect? Which page were you on?' },
  { id: 'idea', label: 'Suggest a feature', icon: 'bulb', hint: 'What would you like to see, and how would it help your preparation?' },
  { id: 'content', label: 'Content correction', icon: 'book', hint: 'Which topic or question has the error, and what is the correct information (with the NCERT reference)?' },
];
const MAX_MAILTO = 1800; // keep mailto links within what email apps reliably accept

// Draft survives navigation within the session.
let draft = { type: 'feedback', name: '', subject: '', message: '', device: true };

function deviceInfo() {
  const theme = document.documentElement.dataset.theme || 'system';
  return [`Browser: ${navigator.userAgent}`, `Screen: ${screen.width}×${screen.height}`, `Theme: ${theme}`].join('\n');
}

function compose() {
  const t = TYPES.find((x) => x.id === draft.type);
  const subject = `[YourNEETBuddy] ${t.label}${draft.subject.trim() ? ': ' + draft.subject.trim() : ''}`;
  const extra = [];
  if (draft.name.trim()) extra.push(`From: ${draft.name.trim()}`);
  if (draft.type === 'issue' && draft.device) extra.push(deviceInfo());
  const body = draft.message.trim() + (extra.length ? `\n\n—\n${extra.join('\n')}` : '');
  return { subject, body };
}

export function socialLinks(size = 18) {
  return `
    <a class="social-btn ig" href="${CONTACT.instagram.url}" target="_blank" rel="noopener" aria-label="YourNEETBuddy on Instagram">${icon('instagram', size)}</a>
    <a class="social-btn xc" href="${CONTACT.x.url}" target="_blank" rel="noopener" aria-label="YourNEETBuddy on X (formerly Twitter)">${icon('x-logo', size)}</a>
    <a class="social-btn" href="mailto:${CONTACT.email}" aria-label="Email YourNEETBuddy">${icon('mail', size)}</a>`;
}

export function mount(el) {
  if (!draft.name) draft.name = S().profile?.name || '';

  const draw = () => {
    const t = TYPES.find((x) => x.id === draft.type);
    el.innerHTML = `
    <section class="card contact-hero">
      <div>
        <span class="eyebrow">We'd love to hear from you</span>
        <h2 class="serif">Help us make YourNEETBuddy better</h2>
        <p class="muted">Found a bug, spotted a wrong fact, or have an idea that would help your preparation? Write to us. We read every message.</p>
      </div>
      <div class="contact-hero-social">${socialLinks(20)}</div>
    </section>

    <div class="contact-grid">
      <form class="card stack" id="contactForm" novalidate style="gap:18px">
        <div class="card-head" style="margin:0"><h3>${icon('pen', 17)} Send us a message</h3></div>
        <div class="field">
          <span class="label">What is it about?</span>
          <div class="contact-types" role="radiogroup" aria-label="Message type">${TYPES.map((x) => `
            <button type="button" role="radio" aria-checked="${x.id === draft.type}" class="contact-type ${x.id === draft.type ? 'on' : ''}" data-type="${x.id}">${icon(x.icon, 16)}<span>${x.label}</span></button>`).join('')}</div>
        </div>
        <div class="grid g-2 contact-row" style="gap:14px">
          <div class="field"><label for="cName">Your name <span class="muted" style="font-weight:500">(optional)</span></label>
            <input class="input" id="cName" autocomplete="name" maxlength="80" value="${esc(draft.name)}" placeholder="e.g. Aditi"></div>
          <div class="field"><label for="cSubject">Subject <span class="muted" style="font-weight:500">(optional)</span></label>
            <input class="input" id="cSubject" maxlength="100" value="${esc(draft.subject)}" placeholder="A short summary"></div>
        </div>
        <div class="field">
          <label for="cMsg">Message</label>
          <textarea class="textarea" id="cMsg" rows="7" maxlength="3000" placeholder="${esc(t.hint)}" required>${esc(draft.message)}</textarea>
          <div class="row between"><span class="hint" id="cErr" role="alert"></span><span class="hint" id="cCount">${draft.message.length} / 3000</span></div>
        </div>
        ${draft.type === 'issue' ? `<label class="row" style="cursor:pointer;gap:12px"><span class="switch"><input type="checkbox" id="cDevice" ${draft.device ? 'checked' : ''}><span></span></span>
          <span><b style="font-size:14px">Include device details</b><br><span class="hint">Browser and screen size help us reproduce the problem. Nothing else is shared.</span></span></label>` : ''}
        <div class="row wrap">
          <button type="submit" class="btn accent lg">${icon('mail', 17)} Send via email</button>
          <button type="button" class="btn lg ghost" data-copy-msg>${icon('file', 16)} Copy message</button>
        </div>
        <p class="hint">This opens your email app with the message ready to send to <b>${CONTACT.email}</b>. No email app? Use <b>Copy message</b> and paste it into any email or DM.</p>
      </form>

      <div class="stack" style="gap:18px">
        <div class="card">
          <div class="card-head"><h3>${icon('mail', 17)} Email</h3></div>
          <a class="contact-line" href="mailto:${CONTACT.email}"><span class="contact-ico">${icon('mail', 18)}</span><span class="cl-main"><span class="cl-title">${CONTACT.email}</span><span class="cl-sub">Feedback, issues and partnerships</span></span></a>
          <button class="btn sm ghost" data-copy-email style="margin-top:10px">${icon('file', 14)} Copy email address</button>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('globe', 17)} Follow us</h3></div>
          <div class="stack" style="gap:10px">
            <a class="contact-line" href="${CONTACT.instagram.url}" target="_blank" rel="noopener"><span class="contact-ico ig">${icon('instagram', 18)}</span><span class="cl-main"><span class="cl-title">Instagram</span><span class="cl-sub">@${CONTACT.instagram.handle}</span></span>${icon('external', 14)}</a>
            <a class="contact-line" href="${CONTACT.x.url}" target="_blank" rel="noopener"><span class="contact-ico xc">${icon('x-logo', 16)}</span><span class="cl-main"><span class="cl-title">X (formerly Twitter)</span><span class="cl-sub">@${CONTACT.x.handle}</span></span>${icon('external', 14)}</a>
          </div>
          <p class="hint" style="margin-top:12px">Daily tips, updates and new features.</p>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('info', 17)} Before you write</h3></div>
          <p class="hint">Many questions about accounts, AI limits and your data are answered in the <a href="#/faq" style="font-weight:700">FAQs</a>. Please don't share passwords or API keys in your message.</p>
        </div>
      </div>
    </div>`;
  };

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copied`, 'good');
    } catch {
      toast('Could not copy automatically', 'bad', text.length < 80 ? text : 'Please select and copy the text manually.');
    }
  };

  const valid = () => {
    const err = el.querySelector('#cErr');
    if (draft.message.trim().length < 10) {
      err.textContent = 'Please write a little more (at least 10 characters).';
      err.style.color = 'var(--bad)';
      el.querySelector('#cMsg').focus();
      return false;
    }
    err.textContent = '';
    return true;
  };

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.type) { draft.type = b.dataset.type; draw(); }
    else if ('copyEmail' in b.dataset) copy(CONTACT.email, 'Email address');
    else if ('copyMsg' in b.dataset) {
      if (!valid()) return;
      const { subject, body } = compose();
      copy(`To: ${CONTACT.email}\nSubject: ${subject}\n\n${body}`, 'Message');
    }
  });
  el.addEventListener('input', (e) => {
    const id = e.target.id;
    if (id === 'cName') draft.name = e.target.value;
    else if (id === 'cSubject') draft.subject = e.target.value;
    else if (id === 'cMsg') {
      draft.message = e.target.value;
      el.querySelector('#cCount').textContent = `${draft.message.length} / 3000`;
      if (draft.message.trim().length >= 10) el.querySelector('#cErr').textContent = '';
    }
  });
  el.addEventListener('change', (e) => {
    if (e.target.id === 'cDevice') draft.device = e.target.checked;
  });
  el.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!valid()) return;
    const { subject, body } = compose();
    if (body.length > MAX_MAILTO) {
      copy(`To: ${CONTACT.email}\nSubject: ${subject}\n\n${body}`, 'Message');
      toast('Your message is long', 'info', 'We copied it. Paste it into a new email to ' + CONTACT.email);
      return;
    }
    location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast('Opening your email app…', 'good', 'Press send there to reach us. Thank you!');
  });

  draw();
}
