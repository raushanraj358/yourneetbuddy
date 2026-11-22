# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

YourNEETBuddy: a study companion web app for NEET (UG) aspirants (Physics, Chemistry, Botany, Zoology). It's a **static, no-build,
vanilla-JS** single-page app hosted on **GitHub Pages** with the custom domain **https://yourneetbuddy.com**. **Supabase** provides optional
accounts, cloud sync and free AI. It is a sibling of YourIASBuddy (../../UPSC/youriasbuddy) and shares its architecture.
Don't reintroduce Vercel/serverless hosting. See README.md for user-facing setup.

## Hard constraints

- **No build step, no npm dependencies, no bundler.** Native ES modules loaded straight by the browser (`<script type="module">`).
  Don't add a framework, TypeScript, or a package that needs installing.
- **No Node.js on the dev machine.** Use `python3` for scripts and headless Chrome for checks (see Testing).
- **Keep URLs relative** (`assets/...`, `./#/...`), never leading-slash paths, so the app works at the domain root, under the
  GitHub Pages sub-path and on localhost. OAuth/magic-link redirects use `location.origin + location.pathname`.
- **Domain changes touch several places:** `ALLOWED_ORIGINS` in `tools/edge_handler.js` (then rebuild the function), Supabase
  Auth Site URL/Redirect URLs, and the Google OAuth client's JavaScript origins. The GitHub Pages custom domain is set in repo settings
  (no `CNAME` file; Actions deploys ignore it).
- **External scripts:** only via pinned CDN URLs (currently `@supabase/supabase-js@2.117.3` from jsDelivr, imported lazily in `cloud.js`).
  Pin exact versions.
- **Secrets never go in the repo.** `assets/js/config.js` holds only the public Supabase URL + anon/publishable key. The Gemini key lives in
  Supabase Edge Function secrets. Users' own API keys stay in localStorage and are stripped from exports and cloud sync (`snapshot()`).
- **Everything must work as a guest** (no Supabase config, offline-ish). Cloud and server AI are optional layers.

## Architecture

```
index.html → assets/js/app.js (router, nav, onboarding, timers, boot)
  store.js     single in-memory state S(), persisted to localStorage key 'ynb:v1'; commit() saves + notifies subscribers
  views/*.js   one module per route; export mount(el, params, { setSub }) → optional unmount fn
  cloud.js     Supabase auth + whole-state sync (one jsonb row per user in public.neet_user_data)
  ai.js        runAI(task, params): own key → providers.js directly; else POST to the Supabase "neet-ai" Edge Function
  prompts.js   TASKS whitelist + sanitize() + buildMessages(); shared with the Edge Function
  providers.js Gemini (Auto model fallback chain) + OpenAI adapters; shared with the Edge Function
  data.js      EXAM, SUBJECTS, CHAPTERS (subject → chapters with class, weight, ncert, topics), LIBRARY, HABITS, TIPS
  content.js   lazy loader for content/<subject>.js (offline notes + question bank); toMCQ() shuffles options
  config.js    public site config (Supabase URL/key, feature flags, display-only AI limits)
```

### Routing and views
- Hash routes: `#/<route>?a=b`. Routes are registered in `ROUTES` in `app.js` (title, icon, group, optional mobile `tab`, `sub`).
- On each navigation, `#view` is replaced with a fresh clone (old listeners are dropped). Views render with template strings into
  `el.innerHTML` and use **event delegation** on `el` (`data-*` attributes on buttons).
- **Always `esc()`** user/AI text interpolated into HTML. Render Markdown only through `md()` from `md.js`, which escapes first.
- If a view subscribes to global events, return an unmount function that removes them.
- The mobile tab bar holds 7 tabs (Home, Goals, Tracker, Timer, Study, Quiz, Notes) (grid `repeat(7, 1fr)` in styles.css). Don't add more; swap one out instead.

### State (`store.js`)
- Mutate `S()` directly, then call `commit()`. New top-level keys need a default in `defaults()`. Add object-valued keys that need
  default-merging to `MERGE_KEYS` and to `replaceAll()`.
- Syllabus progress: `S().syllabus = { status, topics, material, doneAt, noteIds }`. `status/material/doneAt/noteIds` are keyed by
  `` `${subjectId}::${chapterId}` ``; `topics` by `` `${subjectId}::${chapterId}::${topic}` ``. Change status through `setStatus()` in
  views/syllabus.js so `doneAt` (used by weekly goals) stays right. Helpers: `syllabusStats()`, `chaptersDoneSince()`, `questionsSince()`.
- Goals: `S().goals = { weekly: { hours, chapters, questions }, items: [...] }`; item types manual | subject | questions | hours | mocks
  (`goalProgress()` in views/goals.js).
- Quiz history entries: `{ mode: 'chapter'|'ai'|'mock', subject ('mixed' for mocks), chapter, score, maxScore, bySubject, … }`. NEET marking +4/−1.
- `isBlank()` / `dataSummary()` feed cloud.js's "which data to keep" dialog. Update them when you add a major data type.

### Cloud sync (`cloud.js`)
- `neet_user_data` row: `{ user_id, data jsonb, rev bigint }`. Optimistic concurrency: update `where rev = meta.rev`. 0 rows → conflict → user chooses.
- Device ↔ account link and last-seen rev live in localStorage `ynb:sync` (`{ uid, rev, dirty }`). Pushes are debounced (2.5 s) and
  serialised through `queue()`.
- `suppress` stops cloud-originated replacements from being echoed back. After replacing local data, it fires `ynb:datareplaced`
  (app.js re-renders).
- Supabase auth uses PKCE (`?code=` in the query, which doesn't clash with hash routing). Don't call Supabase methods synchronously
  inside `onAuthStateChange`.

### AI
- To add an AI task: extend `TASKS`, `sanitize()` and `buildMessages()` in `prompts.js`. The model must return **one JSON object**.
  Validate and normalise the output in the calling view (see `cleanMCQs()` in ai.js, `clean()` in views/syllabus.js).
  Current tasks: `mcq`, `material`, `doubt`.
- `prompts.js` and `providers.js` **must not import anything**. They're inlined into the Edge Function.
- After changing `prompts.js`, `providers.js` or `tools/edge_handler.js`, regenerate the function:
  `python3 tools/build_edge_function.py`. Commit the regenerated `supabase/functions/neet-ai/index.ts`, and remind the owner to redeploy it
  in Supabase. **Never hand-edit `supabase/functions/neet-ai/index.ts`.**
- Edge Function: CORS + `ALLOWED_ORIGINS` check, then the caller is identified (Supabase user JWT, else guest by IP). Daily usage is counted
  via the `bump_neet_ai_usage` RPC (service role only). Default limits: 25/day for users, 5/day for guests.

### Shared Supabase project
- Everything in the database is prefixed `neet_` and the function is `neet-ai`, so this app can live in the same Supabase project as
  YourIASBuddy. Never touch the un-prefixed `user_data` / `ai_usage` objects; they belong to YourIASBuddy. Edge Function secrets are
  project-wide (e.g. `ALLOWED_ORIGINS` affects both sites).

### Database (`supabase/schema.sql`)
- Must stay idempotent (safe to re-run). RLS on every table; `neet_ai_usage` intentionally has no policies (service role only).

## Content conventions

- NEET accuracy matters: everything must match the current NCERT Class 11–12 books and the NMC syllabus. Keep that standard in prompts
  and in content/*.js. Quiz bank items are `[question, [4 options], correctIndex, explanation]`; avoid "option A/B" references in
  explanations because options are shuffled.
- Subject ids (`physics`, `chemistry`, `botany`, `zoology`) and chapter ids are stored in user data. Don't rename them. Adding chapters or
  topics is safe; renaming a topic orphans its tick.
- UI copy: short, calm, encouraging; Indian English; dates via `fmtDate` (en-IN). Hindi output is supported for AI tasks (`language: 'hi'`).
- Styling: use the existing CSS tokens/classes in `assets/css/styles.css` (`card`, `btn`, `chip`, `seg`, `tag`, `notice`, `list/li`,
  `progress`, `stat-card`). Colours go through CSS variables so light and dark themes both work.

## Testing

There's no test suite. Verify changes in headless Chrome:

```bash
python3 -m http.server 5173 &   # from the repo root
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --user-data-dir="$TMPDIR/ynb-chrome" --enable-logging=stderr --virtual-time-budget=6000 \
  --dump-dom "http://localhost:5173/#/syllabus" 2>chrome.log | head
grep -E "CONSOLE.*(rror|Uncaught)" chrome.log   # should print nothing
```

- For interactive flows, serve a same-origin harness page that loads the app in an `<iframe>`, clicks through it, and writes
  results into the DOM, then `--dump-dom` that page.
- To test AI or cloud paths without real services, serve a modified `config.js` that points `supabaseUrl` at a local mock which
  answers `POST /functions/v1/neet-ai` with `{ content: "<json string>", used, limit }`.
- The Edge Function can be exercised in the browser by stubbing `Deno.env`/`Deno.serve` and `createClient`. Pass plain request objects,
  because browsers strip the `Origin` header from `new Request()`.
- Keep scratch files out of the repo.

## Deploying

- Push to `main` → GitHub Actions builds with Jekyll and publishes to Pages. `_config.yml` excludes `supabase/`, `tools/`, README, CLAUDE.md and
  `package.json` from the site.
- Supabase changes (SQL, Edge Function, secrets, auth providers) are applied manually by the owner in the Supabase dashboard. List them
  explicitly whenever a change needs one.
- Commit or push only when asked.
