// Profile: account & sync, personal goal, and a lifetime record of the user's preparation.
import { S, commit, studyStreak, bestStreak, minutesByDay } from '../store.js';
import { icon } from '../icons.js';
import { esc, dateKey, fmtMin, fmtHours, fmtDate, timeAgo } from '../utils.js';
import { toast, hbars, confirmDialog } from '../ui.js';
import { subjectById, allChapters } from '../data.js';
import { cloud, onCloudChange, signInWithEmail, signInWithGoogle, signOut, sync, deleteCloudData, authErrorMessage } from '../cloud.js';

const STATUS = {
  pending: ['Saving…', 'var(--muted)'],
  syncing: ['Syncing…', 'var(--muted)'],
  synced: ['All changes saved to your account', 'var(--good)'],
  paused: ['Sync paused: choose which data to keep', 'var(--warn)'],
  offline: ['Offline: changes will sync when you reconnect', 'var(--warn)'],
  error: ['Could not reach the server. Retrying on next change', 'var(--bad)'],
};

export function mount(el) {
  let sentTo = '';

  function accountCard() {
    const c = cloud();
    if (!c.configured) {
      return `<div class="card">
        <div class="card-head"><h3>${icon('cloud', 17)} Account</h3><span class="tag">This device only</span></div>
        <p class="hint">Your progress is saved in this browser. Accounts and cloud sync are not enabled on this copy of the site.
        Use <a href="#/settings">Settings → Export backup</a> to move your data to another device.</p></div>`;
    }
    if (!c.ready) return `<div class="card"><div class="card-head"><h3>${icon('cloud', 17)} Account</h3></div><p class="hint">Connecting…</p></div>`;

    if (!c.user) {
      return `<div class="card">
        <div class="card-head"><h3>${icon('cloud', 17)} Save your progress</h3><span class="tag">Guest</span></div>
        <p class="muted" style="margin-bottom:14px">Sign in to keep your hours, tasks, notes and quiz history safe and synced across your phone and laptop. It's free, with no password to remember.</p>
        ${sentTo ? `<div class="notice info" style="background:var(--good-soft);border-color:transparent">${icon('mail', 18)}<div><b>Check your inbox.</b><br>We sent a sign-in link to <b>${esc(sentTo)}</b>. Open it on this device. It may take a minute (check spam too).<br><button class="btn sm ghost" data-resend style="margin-top:8px;padding-left:0">Use a different email</button></div></div>`
        : `<div class="stack">
          ${c.googleAuth ? `<button class="btn primary lg block" data-google>${googleLogo()} Continue with Google</button>` : ''}
          ${c.emailAuth ? `<details ${c.googleAuth ? '' : 'open'}>
            ${c.googleAuth ? '<summary class="hint" style="cursor:pointer;text-align:center;list-style:none">No Google account? <u>Use email instead</u></summary>' : '<summary hidden></summary>'}
            <form id="emailForm" class="stack" style="gap:10px;margin-top:10px">
              <div class="field"><label for="email">Email</label><input class="input" id="email" type="email" required placeholder="you@example.com" autocomplete="email"></div>
              <button class="btn block">${icon('mail', 16)} Email me a sign-in link</button>
            </form></details>` : ''}
          <p class="hint">What you've already done on this device will be saved to your account.</p>
          <p class="hint">By continuing, you agree to our <a href="terms.html" target="_blank">Terms of Use</a> and <a href="privacy.html" target="_blank">Privacy Policy</a>.</p>
        </div>`}
      </div>`;
    }

    const u = c.user;
    const name = S().profile.name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Aspirant';
    const avatar = u.user_metadata?.avatar_url;
    const [label, color] = STATUS[c.status] || ['', 'var(--muted)'];
    return `<div class="card">
      <div class="card-head"><h3>${icon('cloud', 17)} Account</h3><span class="tag" style="color:var(--good)">● Signed in</span></div>
      <div class="row" style="gap:14px;margin-bottom:14px">
        ${avatar ? `<img src="${esc(avatar)}" alt="" width="52" height="52" referrerpolicy="no-referrer" style="border-radius:50%">` : `<div class="avatar lg">${esc(name[0].toUpperCase())}</div>`}
        <div style="min-width:0"><b style="font-size:17px">${esc(name)}</b><div class="hint" style="overflow-wrap:anywhere">${esc(u.email || '')}</div>
        ${fmtDate(u.created_at, { day: 'numeric', month: 'short', year: 'numeric' }) ? `<div class="hint">Member since ${fmtDate(u.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</div>` : ''}</div>
      </div>
      <p class="hint" style="color:${color};margin-bottom:12px">${icon(c.status === 'synced' ? 'check' : 'cloud', 14)} ${label}${c.status === 'synced' && c.lastSyncAt ? ` · ${timeAgo(c.lastSyncAt)}` : ''}</p>
      <div class="row wrap">
        <button class="btn" data-sync>${icon('revise', 15)} Sync now</button>
        <button class="btn ghost" data-signout>${icon('logout', 15)} Sign out</button>
      </div>
      <details style="margin-top:14px"><summary class="hint" style="cursor:pointer">Privacy & data</summary>
        <p class="hint" style="margin:8px 0">Your study data is stored in your private account and only you can read it. API keys are never uploaded. Signing out removes the data from this device but keeps it in your account.</p>
        <button class="btn sm ghost danger" data-deletecloud>${icon('trash', 14)} Delete my data from the cloud</button>
      </details>
    </div>`;
  }

  function draw() {
    const st = S();
    const p = st.profile;
    const by = minutesByDay();
    const totalMin = Object.values(by).reduce((a, b) => a + b, 0);
    const daysStudied = Object.values(by).filter((m) => m > 0).length;
    const allTasks = Object.values(st.tasks).flat();
    const tasksDone = allTasks.filter((t) => t.done).length;
    const mcq = st.quizzes;
    const solved = mcq.reduce((a, q) => a + q.correct + q.wrong, 0);
    const correct = mcq.reduce((a, q) => a + q.correct, 0);
    const revisions = st.notes.reduce((a, n) => a + (n.revisions || 0), 0);
    const libDone = Object.values(st.library).filter((v) => v === 'done').length + st.resources.filter((r) => r.status === 'done').length;
    const sylTotal = allChapters().length;
    const sylDone = Object.values(st.syllabus.status || {}).filter((v) => v === 'done' || v === 'revised').length;
    const habitDays = Object.values(st.habits.log).filter((l) => l && l.length).length;

    const bySubject = {};
    for (const s of st.sessions) bySubject[s.subject] = (bySubject[s.subject] || 0) + s.minutes;
    const subj = Object.entries(bySubject).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([id, v]) => ({ label: subjectById(id).short, value: v, color: subjectById(id).color }));

    const quizBy = {};
    for (const q of mcq) {
      const k = q.subject || 'general';
      quizBy[k] = quizBy[k] || { c: 0, t: 0 };
      quizBy[k].c += q.correct;
      quizBy[k].t += q.correct + q.wrong;
    }
    const quizSubj = Object.entries(quizBy).filter(([, v]) => v.t).sort((a, b) => b[1].t - a[1].t).slice(0, 6);

    const activity = [
      ...st.sessions.map((s) => ({ at: s.at || Date.parse(s.date), ico: 'timer', text: `Studied ${subjectById(s.subject).short} for ${fmtMin(s.minutes)}` })),
      ...st.quizzes.map((q) => ({ at: q.at, ico: 'sparkles', text: `Quiz on ${q.topic || subjectById(q.subject).short}: ${q.correct}/${q.total} correct` })),
      ...st.notes.map((n) => ({ at: n.createdAt, ico: 'notes', text: `Wrote a note: ${n.title || 'Untitled'}` })),
    ].filter((a) => a.at).sort((a, b) => b.at - a.at).slice(0, 8);

    const tiles = [
      ['Total study', `${fmtHours(totalMin)}<small>h</small>`, `${daysStudied} day${daysStudied === 1 ? '' : 's'} studied`, 'timer'],
      ['Current streak', `${studyStreak()}<small>d</small>`, `best ${bestStreak()} days`, 'flame'],
      ['Questions solved', `${solved}`, solved ? `${Math.round((correct / solved) * 100)}% accuracy` : 'take a quiz', 'target'],
      ['Tasks done', `${tasksDone}`, `of ${allTasks.length} planned`, 'check'],
      ['Notes', `${st.notes.length}`, `${revisions} revisions`, 'notes'],
      ['Syllabus covered', `${sylDone}<small>/ ${sylTotal}</small>`, `${habitDays} habit days · ${libDone} resources done`, 'book'],
    ];

    el.innerHTML = `
    <div class="grid g-2">
      ${accountCard()}
      <div class="card">
        <div class="card-head"><h3>${icon('target', 17)} Goal</h3></div>
        <form id="profile" class="stack">
          <div class="field"><label>Name</label><input class="input" name="name" value="${esc(p.name)}" placeholder="Your name"></div>
          <div class="grid g-2" style="gap:12px">
            <div class="field"><label>NEET (UG) date</label><input class="input" type="date" name="examDate" value="${p.examDate}"></div>
            <div class="field"><label>Preparation started</label><input class="input" type="date" name="startDate" value="${p.startDate || dateKey()}" max="${dateKey()}"></div>
          </div>
          <div class="grid g-2" style="gap:12px">
            <div class="field"><label>Daily study target (hours)</label><input class="input" type="number" min="1" max="16" name="dailyTarget" value="${p.dailyTarget}"></div>
            <div class="field"><label>Target score (out of 720)</label><input class="input" type="number" min="100" max="720" step="5" name="targetScore" value="${p.targetScore || 650}"></div>
          </div>
          <p class="hint">NEET (UG) 2027 is pre-filled as 2 May 2027 (NTA usually holds it on the first Sunday of May). Check the official date on <a href="https://neet.nta.nic.in" target="_blank" rel="noopener">neet.nta.nic.in</a>.</p>
          <div><button class="btn primary">Save</button></div>
        </form>
      </div>
    </div>

    <h3 class="eyebrow" style="margin:26px 0 12px">Your journey so far · since ${fmtDate(p.startDate || dateKey(), { day: 'numeric', month: 'short', year: 'numeric' })}</h3>
    <section class="grid g-3 profile-tiles">
      ${tiles.map(([l, v, s, i]) => `<div class="card stat-card"><div class="stat"><span class="eyebrow">${l}</span><span class="v">${v}</span><span class="hint">${s}</span></div><div class="stat-ico">${icon(i, 20)}</div></div>`).join('')}
    </section>

    <section class="grid g-3" style="margin-top:18px">
      <div class="card">
        <div class="card-head"><h3>${icon('chart', 17)} Hours by subject</h3></div>
        ${subj.length ? hbars(subj, fmtMin) : '<p class="hint">Log a study session to see your subject split.</p>'}
      </div>
      <div class="card">
        <div class="card-head"><h3>${icon('target', 17)} Quiz accuracy by subject</h3></div>
        ${quizSubj.length ? hbars(quizSubj.map(([id, v]) => ({ label: subjectById(id).short, value: Math.round((v.c / v.t) * 100), color: subjectById(id).color })), (v) => `${v}%`) : '<p class="hint">Your accuracy per subject appears after your first quiz.</p>'}
      </div>
      <div class="card">
        <div class="card-head"><h3>${icon('clock', 17)} Recent activity</h3></div>
        ${activity.length ? `<div class="list">${activity.map((a) => `<div class="li"><span class="stat-ico" style="width:30px;height:30px">${icon(a.ico, 15)}</span><div class="li-main"><div class="li-title">${esc(a.text)}</div><div class="li-sub">${timeAgo(a.at)}</div></div></div>`).join('')}</div>` : '<p class="hint">Nothing yet. Start a focus session or take a quiz.</p>'}
      </div>
    </section>`;
  }

  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'profile') {
      const p = S().profile;
      p.name = f.name.value.trim();
      p.examDate = f.examDate.value || p.examDate;
      p.startDate = f.startDate.value || p.startDate;
      p.dailyTarget = Math.max(1, Math.min(16, Number(f.dailyTarget.value) || 8));
      p.targetScore = Math.max(100, Math.min(720, Number(f.targetScore.value) || 650));
      commit();
      toast('Profile saved', 'good');
      draw();
    } else if (f.id === 'emailForm') {
      const email = f.email.value.trim();
      const btn = f.querySelector('button');
      btn.disabled = true;
      try {
        await signInWithEmail(email);
        sentTo = email;
        draw();
      } catch (err) {
        toast(authErrorMessage(err), 'bad');
        btn.disabled = false;
      }
    }
  });

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    try {
      if ('google' in d) await signInWithGoogle();
      else if ('resend' in d) { sentTo = ''; draw(); }
      else if ('sync' in d) { await sync(); if (cloud().status === 'synced') toast('Synced', 'good'); }
      else if ('signout' in d) { if (await signOut()) toast('Signed out', 'good', 'Your progress is safe in your account.'); }
      else if ('deletecloud' in d) {
        if (await confirmDialog('This permanently deletes your synced study data from the cloud and signs you out. Data on this device is kept.', 'Delete cloud data')) {
          await deleteCloudData();
          toast('Cloud data deleted', 'good');
        }
      }
    } catch (err) {
      toast(authErrorMessage(err), 'bad');
    }
  });

  // Redraw on account/sync changes, but never while the user is typing in a field.
  const off = onCloudChange(() => {
    if (!el.isConnected) return off();
    if (el.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) return;
    draw();
  });

  draw();
  return off;
}

function googleLogo() {
  return `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
}
