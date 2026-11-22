// Lazy loader for the offline chapter notes and question bank (assets/js/content/<subject>.js).
// Each subject file is loaded only when a page needs it, so the first page load stays light.
import { SUBJECTS, chaptersOf } from './data.js';

const cache = {};

/** Resolves to { chapterId: { overview, sections, formulas, traps, quiz } } for one subject. */
export function loadSubject(sub) {
  if (!SUBJECTS.some((s) => s.id === sub)) return Promise.resolve({});
  cache[sub] ||= import(`./content/${sub}.js`).then((m) => m.CONTENT || {}).catch((e) => {
    delete cache[sub];
    throw e;
  });
  return cache[sub];
}

export async function chapterContent(sub, id) {
  return (await loadSubject(sub))[id] || null;
}

/** Converts a bank item [q, options, answer, explanation] into the quiz player's question shape. */
export function toMCQ(item, sub, chapterName) {
  const [stem, opts, ans, explanation] = item;
  let options = [...opts];
  let answer = ans;
  // Shuffle option order so the correct letter isn't predictable — unless an option refers to the others ("All of these", "Both…").
  if (!options.some((o) => /\b(all of|none of|both|neither|all of these|all three)\b/i.test(o))) {
    const order = options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    options = order.map((i) => opts[i]);
    answer = order.indexOf(ans);
  }
  return { stem, statements: [], ask: '', options, answer, explanation: explanation || '', concept: chapterName || '', subject: sub, passage: '' };
}

export async function chapterQuestions(sub, id) {
  const c = await chapterContent(sub, id);
  const name = chaptersOf(sub).find((x) => x.id === id)?.name || '';
  return (c?.quiz || []).map((q) => toMCQ(q, sub, name));
}

/** All bank questions for a subject, each tagged with its chapter. */
export async function subjectQuestions(sub) {
  const all = await loadSubject(sub);
  return chaptersOf(sub).flatMap((c) => (all[c.id]?.quiz || []).map((q) => ({ ...toMCQ(q, sub, c.name), chapter: c.id })));
}
