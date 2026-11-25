// FAQs: about YourNEETBuddy and about the NEET (UG) exam. Static content; answers support **bold** via md().
import { icon } from '../icons.js';
import { esc, fmtDate } from '../utils.js';
import { md } from '../md.js';
import { config } from '../config.js';
import { EXAM } from '../data.js';
import { CONTACT } from './contact.js';

const FAQS = () => [
  {
    id: 'app', title: 'About YourNEETBuddy', icon: 'info', items: [
      ['What is YourNEETBuddy?', 'A free study companion for NEET (UG) aspirants. It brings together weekly goals, a daily tracker, a focus timer, reminders, chapter-wise study material for Physics, Chemistry, Botany and Zoology, quizzes and mock tests, and a notebook with spaced revision, all in one place.'],
      ['Is it free?', 'Yes. Every feature is free to use. The built-in AI has a small daily allowance so the shared free quota lasts for everyone (see the AI questions below).'],
      ['Do I need an account?', 'No. Everything works as a guest, and your data stays in this browser. Sign in with Google (or an email link) from **Profile** only if you want your progress saved to your account and synced across devices.'],
      ['Can I use it on my phone?', 'Yes. The site works in any modern mobile browser. Use your browser\'s **Add to Home Screen** option to open it like an app.'],
      ['How do I report a problem or suggest a feature?', `Open the **Contact** page (in the menu and the footer), choose what your message is about and send it. You can also email **${CONTACT.email}**, follow us on Instagram at **@${CONTACT.instagram.handle}** or on X (formerly Twitter) at **@${CONTACT.x.handle}**.`],
      ['Is YourNEETBuddy affiliated with NTA or NMC?', 'No. It is an independent study tool. Always check exam dates, eligibility and rules in the official information bulletin on **neet.nta.nic.in**.'],
    ],
  },
  {
    id: 'quiz', title: 'Quizzes & study material', icon: 'target', items: [
      ['What is the offline chapter test?', 'A ready-made question bank with **at least 30 NCERT-based questions for every chapter** of Physics, Chemistry, Botany and Zoology. It needs no AI and no internet once loaded. Under **Quiz → Offline chapter test**, pick a subject and a chapter (or mix all chapters) and choose 10, 20, 30 or all questions. Questions and answer options are shuffled each time.'],
      ['How is the quiz scored?', 'Just like NEET (UG): **+4** for a correct answer, **−1** for a wrong one and **0** for an unattempted question.'],
      ['What are the mock tests?', 'Timed tests in exam conditions with questions from all four subjects: a **mini mock** (40 questions, 45 min), a **half mock** (92 questions, 90 min) and a **full NEET mock** (180 questions, 180 min). They use the offline bank, so they work without AI.'],
      ['What is the difference between practice mode and exam mode?', 'In **practice mode** you see the answer and explanation right after each question. In **exam mode** you answer everything first and see the full analysis after you submit.'],
      ['Where do my mistakes go?', 'After a quiz, save your mistakes to **Notes**. They are scheduled for spaced revision so you see them again before the exam.'],
      ['Is the study material enough on its own?', 'No. The chapter notes are short summaries to revise from. **NCERT textbooks are the foundation of NEET**, especially for Biology: read them line by line, and use the notes, quizzes and previous year questions to test yourself.'],
    ],
  },
  {
    id: 'ai', title: 'AI features', icon: 'sparkles', items: [
      ['How many AI requests do I get?', `Guests get **${config().aiGuestLimit} a day** and signed-in users get **${config().aiDailyLimit} a day**. Each AI quiz, AI notes page or doubt uses one request. The count resets every day. Offline chapter tests and mocks are unlimited.`],
      ['How can I get unlimited AI?', 'Add your own free Google Gemini key under **Settings → AI quiz engine**. Requests then go straight from your browser to Google, and the daily allowance no longer applies. Your key stays on this device; it is never synced or included in exports.'],
      ['Can AI answers be wrong?', 'Yes, occasionally. The prompts insist on NCERT accuracy, but always cross-check facts, values and diagrams with your NCERT textbook before you rely on them.'],
      ['Can I get questions and notes in Hindi?', 'Yes. Choose **हिन्दी** before generating an AI quiz, AI notes or asking a doubt. The offline question bank and chapter notes are in English.'],
    ],
  },
  {
    id: 'data', title: 'Your data & sync', icon: 'cloud', items: [
      ['Where is my data stored?', 'As a guest, everything stays in this browser\'s local storage. When you sign in, the same data is also saved to your account so it is available on your other devices.'],
      ['What happens if I clear my browser data?', 'Guest data is deleted with it. To be safe, sign in, or use **Export backup** under **Settings → Your data** from time to time.'],
      ['I used the site as a guest, then signed in. Will I lose my progress?', 'No. If both this device and your account have data, you are asked which one to keep.'],
      ['Can I move my data to another device without an account?', 'Yes. Use **Export backup** under **Settings → Your data** to download a JSON file, then **Import backup** on the other device.'],
      ['How do I delete my data?', 'To clear this device, use **Reset everything** under **Settings → Your data**. To remove your synced data, go to **Profile** and choose **Delete my data from the cloud**.'],
    ],
  },
  {
    id: 'neet', title: 'About the NEET (UG) exam', icon: 'book', items: [
      ['Who conducts NEET (UG)?', 'The **National Testing Agency (NTA)** conducts NEET (UG). The syllabus is notified by the **National Medical Commission (NMC)**. The score is used for admission to MBBS, BDS, AYUSH (BAMS, BUMS, BSMS, BHMS) and B.Sc. Nursing courses across India.'],
      ['What is the exam pattern?', `**${EXAM.questions} compulsory multiple-choice questions** in **${EXAM.minutes} minutes** (3 hours): Physics 45, Chemistry 45 and Biology 90 (Botany 45 + Zoology 45). Total **${EXAM.maxMarks} marks**. It is a pen-and-paper (OMR) test. Check the latest information bulletin, as NTA can change the pattern.`],
      ['What is the marking scheme?', '**+4** for each correct answer, **−1** for each wrong answer and **0** for an unanswered question. If a question is dropped or has more than one correct option, NTA announces how it will be scored in the final answer key.'],
      ['What is the age limit and how many attempts are allowed?', 'You must be at least **17 years old on 31 December** of the admission year. There is currently **no upper age limit** and **no limit on the number of attempts**. **Always confirm in the current year\'s information bulletin.**'],
      ['What are the Class 12 eligibility requirements?', 'Class 12 (or equivalent) with **Physics, Chemistry, Biology/Biotechnology and English**. Minimum aggregate in PCB is generally **50%** for General, **45%** for General-PwBD and **40%** for SC, ST and OBC. Students appearing in Class 12 in the exam year can apply.'],
      ['What is the qualifying cut-off?', 'NEET (UG) uses percentiles: generally the **50th percentile** for General (EWS included), **45th** for General-PwBD and **40th** for SC, ST and OBC. The actual marks for each percentile change every year.'],
      ['In which languages can I write NEET (UG)?', 'The paper is offered in **13 languages**: English, Hindi, Assamese, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu and Urdu.'],
      ['Which books should I study?', 'The current **NCERT textbooks for Class 11 and 12** come first for all subjects, and almost entirely for Biology. Practise **previous year questions** and timed mocks. Links to NCERT and official sites are in **Resources**.'],
      [`When is NEET (UG) ${EXAM.date.slice(0, 4)}?`, `The app pre-fills **${fmtDate(EXAM.date, { day: 'numeric', month: 'long', year: 'numeric' })}** (NTA usually holds the exam on the first Sunday of May). Update your exam date in **Profile** once NTA announces the official date.`],
    ],
  },
];

export function mount(el) {
  const sections = FAQS();
  let q = '';
  let open = null; // section filter

  const item = ([ques, ans]) => `
    <details class="faq-item">
      <summary><span>${esc(ques)}</span>${icon('right', 16)}</summary>
      <div class="faq-a md">${md(ans)}</div>
    </details>`;

  const draw = () => {
    const needle = q.trim().toLowerCase();
    const shown = sections
      .filter((s) => !open || s.id === open)
      .map((s) => ({ ...s, items: s.items.filter(([a, b]) => !needle || (a + ' ' + b).toLowerCase().includes(needle)) }))
      .filter((s) => s.items.length);
    el.querySelector('#faqList').innerHTML = shown.length
      ? shown.map((s) => `
        <section class="card faq-sec">
          <div class="card-head"><h3>${icon(s.icon, 17)} ${esc(s.title)}</h3></div>
          ${s.items.map(item).join('')}
        </section>`).join('')
      : `<div class="card"><p class="muted">No questions match “${esc(q)}”. Try another word.</p></div>`;
    el.querySelectorAll('[data-sec]').forEach((b) => b.classList.toggle('on', (b.dataset.sec || null) === open));
    if (needle) el.querySelectorAll('.faq-item').forEach((d) => (d.open = true));
  };

  el.innerHTML = `
    <div class="stack" style="gap:16px;max-width:860px">
      <div class="faq-search"><span class="faq-search-ico">${icon('search', 17)}</span><input class="input" id="faqQ" type="search" placeholder="Search the FAQs" autocomplete="off" aria-label="Search the FAQs"></div>
      <div class="row wrap" style="gap:6px">
        <button class="chip on" data-sec="">All</button>
        ${sections.map((s) => `<button class="chip" data-sec="${s.id}">${esc(s.title)}</button>`).join('')}
      </div>
      <div class="stack" id="faqList" style="gap:16px"></div>
      <p class="hint">Still stuck? <a href="#/contact" style="font-weight:700">Contact us</a>, read the <a href="privacy.html">Privacy</a> and <a href="terms.html">Terms</a> pages, or check the official bulletin on <a href="https://neet.nta.nic.in" target="_blank" rel="noopener">neet.nta.nic.in</a>.</p>
    </div>`;

  el.addEventListener('input', (e) => {
    if (e.target.id === 'faqQ') { q = e.target.value; draw(); }
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sec]');
    if (b) { open = b.dataset.sec || null; draw(); }
  });
  draw();
}
