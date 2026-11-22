# YourNEETBuddy · yourneetbuddy.com

A calm, modern study companion for NEET (UG) aspirants: NCERT chapter notes for Physics, Chemistry, Botany and Zoology,
offline chapter tests, AI quizzes, timed NEET mock tests, goals, reminders and progress tracking.

**Live site:** https://yourneetbuddy.com (once the domain is connected, see below)

No install and no build step. It's a static web app on GitHub Pages, with optional accounts and free AI powered by Supabase.
It shares its architecture with [YourIASBuddy](https://youriasbuddy.com).

## Features

| Section | What it does |
|---|---|
| **Dashboard** | Countdown to NEET, today's hours vs target, streak, tasks, quiz accuracy, syllabus covered per subject, goals, weekly chart, reminders, revision queue |
| **Goals** | Weekly targets (study hours, chapters, questions) tracked automatically, target score out of 720 with the pace needed, personal goals with deadlines (automatic or manual) |
| **Daily Tracker** | Week-strip planner, subject-tagged tasks, NEET day template, habits (NCERT reading, MCQs, formulas, diagrams, PYQs), consistency heatmap |
| **Study Hours** | Pomodoro + stopwatch, manual logging, charts, subject split, heatmap |
| **Reminders** | Once / daily / weekdays / weekly reminders with NEET presets, browser notifications + chime |
| **Study Material** | 81 NCERT chapters (Physics 28, Chemistry 21, Botany 17, Zoology 15) by class, with weightage. Each chapter has **offline key notes** (concepts, formulas, NEET traps), a topic checklist, status (Not started / Reading / Done / Revised), **AI notes** (English or हिन्दी), an **AI doubt solver**, an NCERT link and a chapter test |
| **Quiz & Mock Tests** | **Chapter tests** from a built-in bank of ~600 NCERT-based MCQs (no internet or AI needed), **AI quizzes** on any chapter/topic (NCERT direct, assertion–reason, statements, match the columns, numericals), and **timed mock tests** (40 / 92 / 180 questions across all four subjects). NEET marking (+4 / −1), practice and exam modes, subject-wise scores, mistake book → Notes, accuracy by subject |
| **Notes** | Markdown notebook with highlights, subject filters, search, pinning, spaced revision (1-3-7-15-30-60 days), "Quiz me on this note" |
| **Resources** | Curated library (NTA, NMC, NCERT, Exemplar, DIKSHA, standard books…) with progress tracking, plus your own links |
| **Profile** | Continue with Google to save and sync progress across devices. Exam date, daily target, target score, lifetime stats |
| **Settings** | AI (built-in free AI, or your own Gemini/OpenAI key), theme & sound, JSON backup/restore |

**No account needed.** Guests can use everything and their data stays in the browser. Signing in saves the same data to the user's account.

## How it's hosted (all free)

| Piece | Service | Notes |
|---|---|---|
| Website | GitHub Pages + custom domain `yourneetbuddy.com` | Every push to `main` publishes the site via `.github/workflows/jekyll-gh-pages.yml` |
| Sign-in | Supabase Auth | Google sign-in (email magic link as a fallback) |
| Cloud sync | Supabase Postgres | One row per user in `neet_user_data`, protected by row-level security |
| Free AI | Supabase Edge Function `neet-ai` | Holds the Gemini key |
| AI model | Google Gemini free tier | Free as long as billing is **not** enabled on the Google project |

Database objects are prefixed `neet_` and the function is called `neet-ai`, so YourNEETBuddy can run **in the same Supabase project as
YourIASBuddy** (that's how `assets/js/config.js` is set up now) or in a project of its own.

## One-time setup

The site works in guest mode before any of this is done (offline notes, chapter tests and mocks need no setup).

### 1. Publish on GitHub Pages with your domain
1. Push this repo to `github.com/raushanraj358/yourneetbuddy` (branch `main`).
2. Repo → **Settings → Pages → Source: GitHub Actions**. The workflow deploys on every push.
3. At your domain registrar, add DNS records for `yourneetbuddy.com`:
   - `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` records for `@` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` for `www` → `raushanraj358.github.io`
4. Repo → **Settings → Pages → Custom domain**: `yourneetbuddy.com` → Save, then tick **Enforce HTTPS** once the certificate is ready.

### 2. Supabase: database + free AI
Using the existing YourIASBuddy project (already in `config.js`) or a new one:
1. **SQL Editor → New query**: paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
2. **Edge Functions → Deploy a new function → Via Editor**: name it exactly `neet-ai`, paste the whole of
   [`supabase/functions/neet-ai/index.ts`](supabase/functions/neet-ai/index.ts) → **Deploy**. Turn **OFF** "Verify JWT".
3. Secrets: `GEMINI_API_KEY` is shared by all functions in a project (already set if you reuse the YourIASBuddy project).
   Optional: `ALLOWED_ORIGINS`, `AI_DAILY_LIMIT` (default 25), `AI_GUEST_DAILY_LIMIT` (default 5), `GEMINI_MODEL`.
   ⚠️ If you set `ALLOWED_ORIGINS` as a project secret, it applies to **both** sites, so list both domains in it.
4. If you made a **new** project, put its Project URL and anon/publishable key in [`assets/js/config.js`](assets/js/config.js).

### 3. Google sign-in
1. Supabase → **Authentication → URL Configuration → Redirect URLs**: add `https://yourneetbuddy.com/`, `https://www.yourneetbuddy.com/`
   and `http://localhost:5173/`. (In a shared project leave the Site URL as it is; in a new project set it to `https://yourneetbuddy.com/`.)
2. Google Cloud Console → your OAuth client → **Authorised JavaScript origins**: add `https://yourneetbuddy.com`. On **Branding**, add
   `yourneetbuddy.com` under Authorised domains.
3. In a new Supabase project, also enable the Google provider with the client ID/secret and add its callback URL to the OAuth client.

Note: in a shared project the Google consent screen shows the OAuth app's name (YourIASBuddy). Use a separate project and OAuth client if
you want it to say YourNEETBuddy.

## Run locally

```bash
cd yourneetbuddy
python3 -m http.server 5173
# open http://localhost:5173
```

## Editing content

- **Chapter list** (names, class, weightage, topics, NCERT links): `CHAPTERS` in [`assets/js/data.js`](assets/js/data.js).
- **Offline notes and question bank**: [`assets/js/content/<subject>.js`](assets/js/content/). Each chapter has `overview`, `sections`
  (`[heading, [points]]`), `formulas`, `traps` and `quiz` items written as `[question, [A, B, C, D], correctIndex, explanation]`.
  Option order is shuffled at runtime unless an option says "All of these", "Both…", "None…".
- **AI prompts**: `assets/js/prompts.js`, then run `python3 tools/build_edge_function.py` and redeploy the `neet-ai` function.

## Notes

- NEET (UG) 2027 is pre-filled as **2 May 2027** (NTA usually holds it on the first Sunday of May). Update `EXAM.date` in `data.js` once NTA announces it.
- Chapter weightage (High/Medium/Low) is a guide based on recent papers, not an official figure.
- AI content and the built-in notes can contain mistakes. Cross-check against the current NCERT textbooks.
