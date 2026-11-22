// Prompt builder shared by the browser (own-key mode) and the Supabase Edge Function (supabase/functions/neet-ai).
// Keep this file free of DOM/browser APIs and imports: tools/build_edge_function.py inlines it into the function.

const str = (v, max) => String(v ?? '').slice(0, max).trim();
const int = (v, lo, hi, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

export const TASKS = ['mcq', 'material', 'doubt'];

const SYSTEM = `You are a senior NEET (UG) paper-setter and subject expert for Physics, Chemistry and Biology (Botany & Zoology), with two decades of experience teaching medical aspirants in India.
You write questions that match the real NEET standard set by NTA: NCERT-based, precise, conceptual, with plausible distractors and exactly one correct option.
Accuracy is non-negotiable: use only facts and values consistent with the current NCERT Class 11 and 12 textbooks and the NMC NEET (UG) syllabus. Double-check every calculation. If unsure of a fact, do not use it.
Always reply with a single valid JSON object and nothing else.`;

export function sanitize(task, p = {}) {
  if (!TASKS.includes(task)) throw new Error('Unknown task');
  const base = {
    subject: str(p.subject, 60) || 'Biology',
    chapter: str(p.chapter, 160),
    topic: str(p.topic, 160),
    language: p.language === 'hi' ? 'hi' : 'en',
  };
  if (task === 'mcq') {
    return {
      ...base,
      count: int(p.count, 1, 20, 10),
      difficulty: str(p.difficulty, 30) || 'NEET standard',
      patterns: (Array.isArray(p.patterns) ? p.patterns : []).map((x) => str(x, 40)).slice(0, 6),
      context: str(p.context, 6000),
    };
  }
  if (task === 'doubt') return { ...base, question: str(p.question, 1500) };
  return base;
}

const LANG = (l) => (l === 'hi' ? 'Write everything (questions, options, explanations) in clear standard Hindi (Devanagari) as used in the NEET Hindi-medium paper. Keep scientific symbols, formulas and units as they are. Keep JSON keys in English.' : 'Write in clear Indian English as used in the NEET paper.');

export function buildMessages(task, raw) {
  const p = sanitize(task, raw);
  const where = `Subject: ${p.subject}${p.chapter ? `\nChapter: ${p.chapter}` : ''}\nTopic: ${p.topic || (p.chapter ? 'a balanced mix from the whole chapter' : 'a balanced mix of high-yield chapters')}`;
  let user;

  if (task === 'mcq') {
    const patterns = p.patterns.length ? p.patterns.join(', ') : 'direct NCERT-based, assertion–reason, statement-based, match the columns, numerical';
    user = `Create ${p.count} NEET (UG) multiple-choice questions.
${where}
Difficulty: ${p.difficulty}
Question patterns to mix: ${patterns}
${p.context ? `Base the questions primarily on this study material (you may add closely related NCERT facts):\n"""\n${p.context}\n"""\n` : ''}
Format rules:
- Direct / numerical: "statements" is [] and "ask" is "". For Physics and Chemistry numericals give all data in the stem, use standard values (g = 10 m/s² unless stated) and make sure exactly one option is correct.
- Statement-based: put each statement (without numbering) in "statements"; "stem" introduces them (e.g. "Consider the following statements about ..."); "ask" is "Choose the correct answer from the options given below:" with options such as ["A and B only","B and C only","A, C and D only","All of the above"] — label statements A, B, C, D in that order in your options.
- Assertion–reason: statements are ["Assertion (A): ...","Reason (R): ..."]; options are the standard four: "Both A and R are true and R is the correct explanation of A", "Both A and R are true but R is NOT the correct explanation of A", "A is true but R is false", "A is false but R is true".
- Match the columns: statements are pairs "List-I item : List-II item" written in a SHUFFLED order using letters (A, B, C, D) and roman numerals (I, II, III, IV), e.g. "A. Mitochondria : III. Oxidative phosphorylation"; "ask" is "Choose the correct match:"; options are like "A-III, B-I, C-IV, D-II".
- Exactly 4 options and exactly one correct answer. Vary the position of the correct answer.
- "explanation": 2–4 sentences on why the answer is right (quote the NCERT idea or show the calculation) and why the tempting distractor is wrong.
- "concept": a 2–5 word tag of the concept tested.
${LANG(p.language)}
Return JSON exactly like: {"questions":[{"stem":"","statements":[],"ask":"","options":["","","",""],"answer":0,"explanation":"","concept":""}]} where "answer" is the 0-based index of the correct option.`;
  } else if (task === 'material') {
    user = `Write exam-oriented NEET (UG) study notes on one chapter/topic, the way a top NEET faculty would for a serious aspirant.
${where}
Rules:
- NCERT first: cover every NCERT line, table, diagram label and example that NEET can ask. Use only facts consistent with current NCERT books. If unsure of a fact, leave it out.
- Be crisp: bullet points, 900–1300 words in total.
- For Physics and Chemistry include all key formulas/reactions with conditions, units and typical values; for Biology include names, examples, numbers and sequences exactly as in NCERT.
- "sections": 4–7 logical sub-topics, each with 4–8 information-dense points.
- "formulas": key formulas, reactions, or (for Biology) key numbers and sequences to memorise.
- "ncertLines": NCERT facts that are frequently converted into NEET questions.
- "mistakes": common traps and mistakes students make.
- "pyqThemes": themes NEET has asked on this topic in past papers, a few words each (do not invent exact questions or years).
${LANG(p.language)}
Return JSON exactly like: {"title":"","overview":"2–4 sentences","sections":[{"heading":"","points":[""]}],"formulas":[""],"keyTerms":[{"term":"","meaning":""}],"ncertLines":[""],"mistakes":[""],"pyqThemes":[""],"mnemonic":"","quickRevision":[""]}`;
  } else {
    user = `A NEET (UG) aspirant has a doubt. Explain it clearly and correctly, step by step, at NCERT level.
${where}
Doubt: """${p.question}"""
Rules: be accurate and concise (150–350 words); show calculations step by step for numericals; end with one quick tip for remembering it. If the doubt is not about NEET Physics, Chemistry or Biology, politely say you can only help with NEET subjects.
${LANG(p.language)}
Return JSON exactly like: {"answer":"Markdown text","keyPoints":[""],"tip":""}`;
  }

  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: user },
  ];
}
