# CLAUDE.md — MediTrack vertical video

> **You are Claude Code working on the MediTrack vertical-video feature.** Read this file end-to-end at the start of every session. The §3 *Current state* section tells you what's actually built; §6 *Target architecture* describes where this is going. Do not invent files, packages, or systems that aren't in §3 unless you are explicitly told to build them.

> **Repo history note.** This repo started as "Brief" — a workspace product for data teams. The render layer was built and proven there. The product has now been refocused on MediTrack, an existing live product at meditrack.in that summarizes medical reports for Indian users. The Remotion render layer ports cleanly; the framing, safety rails, sample content, visual direction, and avatar approach have all been updated for the medical context. Older "Brief" naming should be migrated, not preserved.

> **Build sequence.** `build-plan.md` at the repo root contains three sequenced prompts to run in Claude Code, in order: (1) visual rebuild to Dark Vibrant Pop + `Character.tsx`, (2) ElevenLabs TTS wiring + `scripts/generate-tts.ts`, (3) `prompts/draft_script.md` authoring. Do not skip ahead or run them out of order.

---

## 1. Product identity

**Name:** MediTrack vertical video (a feature inside MediTrack, not a standalone product).
**One line:** A 60-second vertical video that explains a user's medical lab report in Hindi, narrated by a friendly AI assistant with an illustrated character on screen, with the values and trends shown visually.

**Why this exists.** MediTrack already turns medical reports into written summaries. The video feature is a *companion artifact* for two situations the written summary doesn't serve well:
1. **Forwarding to elderly parents** who don't read long English text but will watch a 1-minute Hindi video.
2. **The user themselves on their commute**, where reading isn't realistic but watching is.

Both contexts are mobile, short-attention, Hindi-first.

**Primary user.** An Indian adult (25–65) with moderate smartphone literacy, some English exposure, strong preference for Hindi.

**Watch surface (v1).** Inside the MediTrack web app, on the report detail page. Watch-only. No download, no WhatsApp share — those are v1.5+.

**Success signal for v1.** Of users who see "Watch summary," ≥40% press play; of those who play, ≥70% complete; ≥30% report subjective improvement in understanding via a one-question post-video survey. Everything else is vanity.

---

## 2. Non-negotiable principles

These override anything else in this file or in a session prompt. If a request conflicts with §2, push back before executing.

### 2.1 Medical safety rails
1. **Never diagnose.** The video describes what a value *is* and what the normal range *says*, not what the user *has*. *"Aapka LDL 142 hai, jo 100 ki normal range se thoda zyada hai"* — yes. *"Aapko cholesterol ki problem hai"* — never.
2. **Always recommend a doctor for anything abnormal.** Every abnormal value triggers a "doctor se mil lijiye" beat. Hard rule in the prompt.
3. **Conservative on uncertainty.** OCR low confidence, ambiguous values, unrecognized report types → fail loudly with a user-facing error. No silent fallbacks.
4. **Disclaimer banner is a render invariant.** *"यह medical advice नहीं है। Doctor से consult करें।"* renders every frame via `Disclaimer.tsx`, mounted in `MediTrack.tsx` outside any Sequence. Not prop-controlled, cannot be disabled. Any PR making the disclaimer optional, conditional, or beat-scoped is rejected.
5. **No medications, ever.** No drug names, no dosages, no "take X." Lifestyle suggestions only.
6. **Pediatric and pregnancy stop.** Pediatric patient (age <18 or pediatric ranges) or pregnancy panel → pipeline stops, no video, surface "specialist के साथ discuss करें" message.
7. **Critical values change the video structure.** Critical-range value → video opens with "तुरंत doctor से मिलें," lifestyle/reassurance content skipped.

### 2.2 Trust and provenance
1. **Every value shown comes from the user's actual report.** The LLM never invents numbers. Numbers are emitted as placeholder tokens (`{{value.ldl}}`) and resolved post-hoc against structured `Report` data. The script prompt forbids raw numerals.
2. **Lab name and report date visible every frame** via header.
3. **Authored by AI, not a doctor.** Byline reads "MediTrack AI" — the "MediTrack AI" suffix is a render invariant.

### 2.3 Format discipline
1. **9:16, 1080×1920, 30 fps.**
2. **Target 60s, hard cap 90s.** Cut content; never speed up audio.
3. **First 3 seconds hook on user's name + report type.** *"नमस्ते Priya जी, आपकी lipid profile report तैयार है।"* No long disclaimers in the open — the disclaimer banner is persistent on screen.
4. **Captions mandatory.** Burnt-in, word-by-word, Devanagari + Latin code-switching.
5. **Tone:** family doctor with five minutes for you. Not clinical, not chirpy, not fear-mongering. *"कोई बड़ी बात नहीं है"* before any lifestyle suggestion.

### 2.4 Data handling and privacy
1. Encrypt at rest (S3 SSE-KMS) + in transit (TLS). No report data in logs. No report data in analytics events.
2. Right-to-delete cascades to video/audio/avatar within 24h.
3. **DPDPA (India, 2023) applies.** Design for it.
4. No fine-tuning on customer data.

### 2.5 Scope discipline
v1 is small on purpose. When in doubt, cut. Every proposal answers: *does this help a user understand their report today?* If not, defer.

### 2.6 What Claude Code does not decide
- Architectural direction.
- Adding dependencies (propose, wait for approval).
- Renaming/moving files outside the working directory.
- Anything in §2.1–§2.4. These are not optimization targets.

---

## 3. Current state of the repo

Only the **Remotion render layer** is built. Everything else in §6 (the report-to-video pipeline) is target architecture.

**Working directory:** the repo root. The Remotion package, server and all `npm` scripts live at the top level (the older `brief-sample/` layout below is historical — paths inside it map to the root).

```
meditrack/
├── CLAUDE.md
├── build-plan.md                       # sequenced build prompts (all three complete)
├── brief-sample/                       # ← the Remotion package + server; cd here before npm commands
│   ├── package.json                    # Remotion 4.0.200, Hono, BullMQ, R2 SDK
│   ├── tsconfig.json                   # render-layer config (noEmit)
│   ├── tsconfig.server.json            # server build config (outDir: dist/)
│   ├── remotion.config.ts
│   ├── Dockerfile                      # multi-stage: build + runtime with Chromium/ffmpeg
│   ├── fly.toml                        # Fly.io config — bom region, shared-cpu-2x
│   ├── docker-compose.yml              # local Redis for dev
│   ├── public/                         # TTS audio + character assets
│   ├── prompts/
│   │   └── draft_script.md             # LLM prompt: Report → MediTrackPayload
│   ├── scripts/
│   │   └── generate-tts.ts             # ElevenLabs Hindi TTS generator with caching
│   ├── src/
│   │   ├── index.ts
│   │   ├── Root.tsx
│   │   ├── theme.ts                    # all design tokens (colors, sizes, spacing)
│   │   ├── compositions/
│   │   │   └── MediTrack.tsx           # composes Background + Header + Disclaimer + ChartCard + Character + Captions
│   │   ├── components/
│   │   │   ├── Background.tsx          # dark canvas with subtle radial drift
│   │   │   ├── Header.tsx              # compact MediTrack. wordmark + report type/date
│   │   │   ├── Disclaimer.tsx          # render-invariant disclaimer (§2.1.4)
│   │   │   ├── ChartCard.tsx           # bigNumber | bar | line — vertical-first rotated white cards
│   │   │   ├── Character.tsx           # illustrated SVG doctor — ambient + talking animation
│   │   │   └── Captions.tsx            # word-by-word accumulating Hindi captions
│   │   ├── data/
│   │   │   └── sampleMediTrack.ts      # typed payload + sample lipid-profile data
│   │   └── render/
│   │       ├── renderVideo.ts          # programmatic Remotion render (bundle + renderMedia)
│   │       └── renderVideo.cli.ts      # CLI: tsx render:cli <input> <output.mp4>
│   └── server/
│       ├── index.ts                    # entrypoint — starts HTTP + worker in one process
│       ├── http.ts                     # Hono app: POST /render, GET /healthz
│       ├── auth.ts                     # bearer-token middleware (constant-time compare)
│       ├── env.ts                      # zod schema validating all env vars on boot
│       ├── queue.ts                    # BullMQ queue + Redis connection
│       ├── worker.ts                   # BullMQ worker (concurrency: 1)
│       ├── types.ts                    # API request/response zod schemas
│       ├── pipeline/
│       │   ├── run.ts                  # orchestrator: render → R2 upload → callback
│       │   ├── upload.ts              # R2 upload + presigned URL
│       │   └── callback.ts            # POST to caller's callbackUrl
│       └── __tests__/
│           └── render.test.ts          # integration test (mocked queue)
└── out/                                # render output, gitignored
```

**Visual direction:** Dark Vibrant Pop. Dark navy canvas (`#0a0e1a`), white rotated cards with hard amber offset shadows (`#fbbf24`), chunky Inter 900-weight type, bright amber for caption highlights. Hindi/Devanagari captions, no rotation on Devanagari.

**On-screen presenter:** `Character.tsx` — an illustrated SVG doctor character with two animation modes:
- **Ambient (idle).** Breathing (scaleY), blink every 6s, idle sway. Always playing.
- **Talking.** Mouth open/close keyed to audio amplitude via `@remotion/media-utils`. NOT phoneme lip-sync — intentional.

**TTS:** **ElevenLabs Multilingual v2.** `scripts/generate-tts.ts` generates per-beat audio with SHA-256 caching, concatenates via ffmpeg. Audio supplied to the composition via `audioUrl` (uses `staticFile`).

**Server layer:** Hono HTTP + BullMQ worker in a single Node process. Caller POSTs `/render` with a `MediTrackPayload`, gets `{ jobId }` back immediately. Worker renders via Remotion, uploads MP4 to R2, POSTs callback. See §5.9.

**What does not exist yet** (Claude Code should not invent):
- `@remotion/google-fonts` — not yet installed. Required for Devanagari rendering (§5.7). Propose before adding.
- PDF parsing / OCR — reports arrive as structured JSON via the API, not as images.
- Web-app integration with meditrack.in.

**Pipeline stages** (`server/pipeline/`):
1. **Safety gates** (`safety.ts`) — reject pediatric (<18) and pregnancy panels before any LLM spend.
2. **Script generation** (`script.ts`) — OpenAI `gpt-4o` turns `{ patient, report, findings }` → `MediTrackPayload` via `prompts/draft_script.md`. JSON mode, temperature 0.3, one retry on parse failure.
3. **Script lint** (`lint.ts`) — banned diagnostic phrases, banned medications (`server/safety/banned-meds.txt`), required doctor recommendation for abnormal values, number grounding (every number in captions/charts must trace to a finding).
4. **TTS** (`voice.ts`) — ElevenLabs Multilingual v2, per-beat audio with SHA-256 caching in `/tmp/tts-cache/`, ffmpeg concatenation with 200ms silence gaps.
5. **Timing** (`timing.ts`) — recomputes `startFrame`/`endFrame` from actual audio durations, overriding LLM guesses.
6. **Render** — existing `renderVideo()` from Prompt A.
7. **Upload** — existing R2 upload from Prompt A.
8. **Callback** — existing callback POST from Prompt A.

---

## 4. Stack and rationale (current files)

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node 20 LTS | Remotion needs ≥18; 20 is current LTS. |
| Video framework | Remotion 4.0.x | React → MP4. |
| Language | TypeScript 5 | Type the payload end-to-end. No `any`. |
| Components | React 18 functional | Hooks only. |
| Styling | Inline styles + `theme.ts` | Remotion convention. |
| Fonts | `@remotion/google-fonts` | Loads Noto Sans Devanagari + Inter. **Not yet installed** — propose before adding. |
| TTS (target) | ElevenLabs Multilingual v2 | Mature SDK, good Hindi prosody. |
| Avatar/character | **In-house SVG character via React + Remotion** | No external service, no per-render cost beyond compute, no uncanny valley, no consent issues. |
| HTTP server | Hono + `@hono/node-server` | Lightweight, fast, runs on Node without adapter overhead. |
| Job queue | BullMQ + Upstash Redis | Reliable queue with retry/backoff; Upstash for managed Redis. |
| Object storage | Cloudflare R2 (`@aws-sdk/client-s3`) | S3-compatible, no egress fees, presigned URLs. |
| Validation | zod | Env vars validated on boot; request bodies validated on ingress. |
| Hosting | Fly.io (`shared-cpu-4x`, 4 GB) | Single machine in `sin` region (ElevenLabs blocks `bom`), one process runs both HTTP + worker. |

**Deliberately deferred:** Tailwind in render code, Storybook, unit tests on visual components, generic theming, mobile apps, multi-language.

---

## 5. Working in the render layer

### 5.1 Scripts

All commands run from the repo root:

```bash

npm run dev               # Remotion Studio at localhost:3000
npm run render            # full quality MP4 → out/meditrack.mp4
npm run render:lowres     # 540×960, ~4× faster
npm run render:cli        # programmatic: tsx render:cli <input> <output.mp4>
npm run tts               # generate ElevenLabs Hindi TTS → public/audio/sample.mp3
npm run server:dev        # start HTTP + worker in watch mode
npm run server:build      # tsc -p tsconfig.server.json → dist/
npm run server:start      # node dist/server/index.js (production)
npm run redis:up          # docker-compose up -d redis (local dev)
npm run redis:down        # docker-compose down
npm run test              # vitest run
```

### 5.2 Editing rules
- All measurements in real pixels at 1080×1920.
- Animations use `spring()` and `interpolate()`. No Framer Motion.
- Time in frames (30/sec).
- Every animated value spans an explicit frame range.
- Charts are SVG. No canvas, no chart libraries.
- All colors/sizes/paddings/shadows from `theme.ts`. No magic colors or sizes inline.

### 5.3 Sizing system (calibrated for arm's-length phone viewing)

| Element | Size |
|---|---|
| Hero numerals | 200–260px / weight 800 / letter-spacing −8px |
| Headline | 88–104px / weight 800 / line-height 1.05 |
| Section titles | 60–64px / weight 800 |
| Card body labels | 40–44px / weight 600 |
| Card metadata | 28–32px / weight 500 |
| Captions — current word | 92px / weight 900 |
| Captions — past words | 64px / weight 800 / 65% opacity |
| Disclaimer text | 32px / weight 500 |
| Character height | 480–540px |
| Top safe area | 100px (header starts at 110px) |
| Bottom safe area | 240px (character bottom edge ≥ 240px from canvas bottom) |
| Card padding | 40–48px |
| Card border radius | 28–32px |

### 5.4 Vertical-first chart rules
- **Big-number cards dominate** (200–260px numerals).
- **Bar charts = stack of 3 separate rotated mini-cards**, not one card with three rows.
- **Line charts** must calibrate y-axis to the data range — no auto-fit hiding movement.
- **Tables: 4 rows max.**
- **One chart per beat.**
- All cards rotate slightly (-2° to +2°). Sensitive medical values may opt out (rotation 0); default is rotated.
- **Scorecard:** vertical list of status-dot + label + value rows. Max 8 rows; overflow shows "+N और values". Default rotation 0 (readable, not playful).
- **CombinedSparkline:** left 58% shows hero numeral (colored by medical status), right 40% shows a mini sparkline with status-colored line. Falls back to bigNumber layout if history has fewer than 2 points.
- **Borderline status color:** amber (`#f59e0b`) with soft/deep variants, used for values near but not past reference thresholds.
- **Number grounding lint** covers all 5 chart kinds (bigNumber, bar, line, scorecard, combinedSparkline). Contextual time references in captions (Latin + Devanagari, including ranges like "4-6 हफ़्ते") are exempted.

### 5.5 The composition contract

`MediTrack.tsx` accepts a `payload` prop (renamed from `brief`):

```ts
type MediTrackPayload = {
  patientFirstName: string;     // "Priya"
  reportType: string;           // "Lipid Profile"
  reportDate: string;           // "18 Oct 2025"
  lang: 'hi' | 'en';            // v1 ships hi only
  disclaimer: string;           // never empty; default Hindi disclaimer
  hasCriticalValue: boolean;    // true → critical-value variant of beat 1
  audioUrl: string;             // ElevenLabs Hindi WAV/MP3
  avatarName: string;           // "डॉ. Asha"
  avatarRole: string;           // invariant: "MediTrack AI"
  beats: Beat[];
};

type Beat = {
  startFrame: number;
  endFrame: number;
  caption: string;              // Devanagari Hindi for lang=hi
  chart: ChartSpec;             // bigNumber | bar | line
  lookAt?: 'chart' | 'viewer';
};
```

`Root.tsx` sets `defaultProps={{ payload: sampleMediTrack }}` so Remotion Studio works. For programmatic renders, `src/render/renderVideo.ts` passes the payload as `inputProps`.

### 5.6 Audio path
- Master audio = ElevenLabs Hindi TTS, passed via `<Audio src={audioUrl} />` at composition root.
- The `Character` component reads audio amplitude (via Remotion's `useAudioData` + `visualizeAudio`) to drive its talking-mode mouth animation. The audio drives the character, not the other way around.
- No second audio source. No HeyGen audio to worry about (no HeyGen).

### 5.7 Hindi-specific rendering
- Devanagari loaded via `@remotion/google-fonts/NotoSansDevanagari`.
- **Captions never rotate when `lang === 'hi'`.** Devanagari conjuncts (ज्ञ, क्ष, त्र) break with rotation. Latin captions may rotate; Devanagari may not.
- Code-switching is correct, not a bug. *"Aapka LDL 142 hai"* in mixed scripts is normal.
- Twemoji loaded explicitly. System emoji on headless Chromium often renders as B&W outlines.

### 5.8 The illustrated character
- SVG-based, defined in `Character.tsx`.
- Two animation modes — ambient (always) and talking (driven by audio amplitude).
- Ambient: breathing (gentle scaleY oscillation, 4-second period), blink (every 5–8 seconds, 4 frames), idle micro-sway.
- Talking: mouth shape interpolates from "closed" to "open" based on audio amplitude. NOT lip-synced to phonemes — just generic open-close keyed to volume. This is intentional.
- Color palette pulled from `theme.ts`. Default character has warm skin tone, simple line-art style, gender-ambiguous-leaning-feminine for the "डॉ. Asha" default. **No hyperreal features.** Pixar/Headspace energy, not photoreal.
- Position: lower-right, 60px from right edge, 240px from bottom (clear of player chrome).
- Character can tilt 5–10° toward the active chart during specific beats — driven by a `lookAt: 'chart' | 'viewer'` field on each beat.

### 5.9 Working with the server layer

Local dev loop:
1. `npm run redis:up` — starts Redis via Docker.
2. `npm run server:dev` — starts Hono HTTP + BullMQ worker in watch mode.
3. Fire a test job:
   ```bash
   curl -X POST localhost:3000/render \
     -H "Authorization: Bearer dev-key" \
     -H "Content-Type: application/json" \
     -d '{ "reportId": "test-001", "callbackUrl": "https://webhook.site/<your-url>", "payload": <MediTrackPayload JSON> }'
   ```
4. Watch logs: queue → render → R2 upload → callback POST.

Architecture: one Node process, one Fly machine. The HTTP server accepts render requests and enqueues them; the BullMQ worker (concurrency: 1) dequeues and runs the pipeline: `renderVideo()` → R2 upload → callback. No separate worker app.

Env vars are validated by `server/env.ts` (zod) on boot. Missing vars → immediate exit with a list of what's wrong.

### 5.10 Production hardening

- **Graceful shutdown.** On SIGTERM/SIGINT, stops accepting HTTP + queue jobs, waits for in-flight render (up to 5 min), then exits. Safe for Fly deploys.
- **Healthcheck.** `GET /healthz` pings Redis (1s timeout). Returns 503 if unreachable, 200 with `uptime_sec` if healthy.
- **Rate limiting.** 30 requests/min/IP on `POST /render`, sliding window, in-memory. Returns 429 with `Retry-After: 60`. All traffic is meditrack_v3's, so the cap is effectively global.
- **Callbacks.** Retried on network errors/5xx; a failure callback is sent only on the final attempt (or for non-retryable errors), so the caller never sees "failed" for a job a retry will finish.
- **Right-to-delete.** `DELETE /videos/:reportId` (bearer auth) removes every video of a report from R2.
- **Structured logging.** JSON lines to stdout/stderr via `server/log.ts`. Fields: `ts`, `level`, `msg`, plus `jobId`/`reportId`/`correlationId` where applicable. Indexed by Fly's log aggregator.

---

## 6. Target architecture

The render service is built as a **single Node.js process** running Hono (HTTP) + BullMQ (worker) on Fly.io. The FastAPI/Python plan from earlier iterations is retired — everything is Node.

```
meditrack.in web app → POST /render → BullMQ queue → Worker
                                                       │
                                                       ├─ 1. (Prompt B) Generate script from Report
                                                       ├─ 2. (Prompt B) TTS via ElevenLabs
                                                       ├─ 3. Render via Remotion → MP4
                                                       ├─ 4. Upload to Cloudflare R2
                                                       └─ 5. POST callback with videoUrl
```

**Pipeline is live.** The API accepts a structured Report (`{ patient, report, findings }`), generates a Hindi script via OpenAI, lints for safety, generates TTS via ElevenLabs, recomputes beat timing from real audio durations, renders with Remotion, uploads to R2, and fires a callback. See §3 "Pipeline stages" for the full sequence.

**Remaining:** PDF parsing (reports arrive as structured JSON for now) and meditrack.in web-app integration.

### Stack
| Layer | Choice |
|---|---|
| HTTP | Hono + `@hono/node-server` |
| Queue | BullMQ + Upstash Redis |
| Render | Remotion 4 (`@remotion/renderer`) |
| Storage | Cloudflare R2 (`@aws-sdk/client-s3`) |
| LLM (prompt B) | OpenAI (`gpt-4o`, configurable via `OPENAI_MODEL` env var) |
| TTS | ElevenLabs Multilingual v2 |
| Hosting | Fly.io — `shared-cpu-4x`, 4 GB, `sin` region (app `meditrack-render-v3`) |
| Auth | Bearer token (single static secret) |
| Observability | `console.log` → Fly log aggregation |

---

## 7. v1 scope

### In
- Hindi only.
- One illustrated character (Dr. Asha default).
- Five report types: CBC, Lipid Profile, Fasting Glucose + HbA1c, Thyroid Profile, Liver Function Test.
- Watch-only on meditrack.in report detail page.
- Critical-value pathway.
- Pediatric/pregnancy stop with friendly fallback.
- Right-to-delete within 24h.

### Out
- Other languages, multiple characters, voice cloning. v2.
- Trend videos across multiple reports. v1.5.
- WhatsApp share, downloadable MP4. v1.5.
- Reports outside the supported five.
- Doctor marketplace, prescriptions, telemedicine. **Never.**
- Hospital/lab/insurance integrations. v3.
- Native mobile apps. v2.

---

## 8. Success metrics

**v1:** ≥40% play rate, ≥70% completion, ≥30% report better understanding.

**Per-video health:**
- Completion < 50% on a report type → format hypothesis broken there, redesign.
- "Forwarded to family" intent (v1.5) — proxy for utility.

---

## 9. How Claude Code should work in this repo

### 9.1 Session start
1. Confirm the request maps to **§3 (current)**, not §6 (future). Ask before bootstrapping future-state work.
2. Read the relevant files. Don't infer.
3. Surface the planned change before applying. Show diffs. Wait for confirmation on anything beyond a single-component edit.

### 9.2 Diff discipline
- Small, atomic changes.
- No sweeping refactors uninvited.
- No unrelated formatting changes in functional PRs.
- Changes >~80 lines: propose breaking up first.

### 9.3 Dependencies
- Default: don't add. Write it.
- Justified deps: propose name, weekly downloads, last publish, license, alternative.
- Animation libs other than Remotion's built-ins: rejected.
- Chart libs: rejected.
- Welcome: `@remotion/google-fonts`, the official ElevenLabs SDK.

### 9.4 Style
- TypeScript strict. No `any` outside opaque external boundaries.
- Functional components only.
- All design tokens come from `theme.ts`.
- No magic numbers in animation code without a comment explaining intent.

### 9.5 Testing posture
- Visual review through Remotion Studio.
- When the data pipeline lands (§6), evals matter (parse accuracy, safety-gate refusals, banned-phrase linter).
- No Jest/Vitest scaffolding in the current render-only repo.

### 9.6 Refuse politely
- Anything violating §2.
- Making the disclaimer conditional, optional, or beat-scoped.
- Adding medication names, dosages, or diagnostic phrasing.
- Landscape or square output.
- Lab/hospital-specific branding baked into the render template.
- Reintroducing a HeyGen / D-ID / Synthesia integration. The character is in-house SVG by design.

---

## 10. Open questions and known risks

1. **Illustrated character is a real design problem.** SVG, ambient animation, talking-mode mouth driven by audio amplitude — none of this is hard individually, but the *aesthetic judgment* (does this character feel friendly enough? old enough to be a doctor? culturally appropriate?) needs real iteration with real users. Plan for 3–5 rounds of character design before locking it in.
2. **Hindi naturalness.** Awkward over-Sanskritized Hindi will kill trust faster than any bug. Code-switching with English medical terms ("blood pressure", "cholesterol", "doctor") is correct and necessary. Script eval must include native Hindi speakers.
3. **OCR on phone-photo reports.** Tilted/shadowed/creased reports break parsers. Nudge users toward PDFs.
4. **Indian lab format diversity.** Claude Vision handles most but will fail on edges. Instrument heavily.
5. **Liability.** Disclaimer is necessary but not sufficient. Indian healthcare-tech lawyer before public launch.
6. **Cost per video.** Estimate: $0.10 LLM (parse + interpret + script) + $0.15 ElevenLabs + $0.05 compute ≈ $0.30. Ship at this cost; optimize later.
7. **Trust with elderly viewers.** Forwarded-to-parent is the biggest unlock, hardest to validate without testing on actual parents. Make that test happen early.
8. **LLM provider is OpenAI `gpt-4o` for v1.** If quality on Hindi script generation is poor, options are `gpt-5` (better, more expensive) or `gpt-4o-mini` (5× cheaper, quality risk).
9. **Number grounding covers all chart variants.** Contextual-time exemption (Latin + Devanagari) may need extension as new idiomatic Hindi patterns emerge in real usage.
10. **Deploy order matters for contract changes.** Deploy this service before meditrack_v3 whenever the request schema loosens (e.g. empty `firstName`).

---

## 11. Living document rules

- This file is the source of truth. If reality diverges, update the file in the same PR.
- §3 (current state) updates whenever a layer ships.
- §6 (target) is decision-log territory.
- §2 (principles) is the most stable section. Changes need explicit founder sign-off in commit messages.

When in doubt, re-read §2.1. The medical safety rails beat the plan.
