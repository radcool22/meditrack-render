# Brief — 10s sample composition

This is the Remotion composition for a 10-second Brief, as described in `CLAUDE.md` §7.8. It's the exact code the render worker runs — with two asset URLs stubbed out.

## What's real and what's stubbed

| Layer | Status |
|---|---|
| Background, header, charts, captions, outro | **Real** — renders as-is |
| Avatar bubble | **Stubbed** — falls back to a circular "PS" monogram when `avatarVideoUrl` is empty. Swap in a HeyGen MP4 URL to see the real avatar. |
| Master audio (TTS) | **Stubbed** — silent when `audioUrl` is empty. Swap in an ElevenLabs WAV/MP3 URL for voiced output. |

These two stubs are the only things separating this sample from a production render. Everything else — composition logic, chart animations, timing, layout — is the real code.

## Preview it

```bash
cd brief-sample
npm install
npm run dev        # opens Remotion Studio at http://localhost:3000
```

Remotion Studio gives you a scrubbable timeline — drag through the 10 seconds and see every frame.

## Render it to MP4

```bash
npm run render              # full 1080x1920 at CRF 22
npm run render:lowres       # 540x960 — faster for iteration
```

Output lands at `out/brief.mp4`.

## To make it a real Brief

In `src/data/sampleBrief.ts`, populate:

```ts
audioUrl: "https://<your-r2-bucket>/tts/priya-abc123.wav",
avatarVideoUrl: "https://<your-r2-bucket>/heygen/priya-abc123.mp4",
```

In production this payload is assembled by `api/pipeline/render.py` from the preceding pipeline stages (query → profile → draft → voice → avatar) and handed to the Remotion worker, as described in `CLAUDE.md` §7.

## What the 10 seconds contain

1. **0–2.5s — Hook.** Big-number card: "2.1%" checkout conversion, −0.8pp delta.
2. **2.5–6s — What changed.** Horizontal bar chart showing mobile as the whole drop.
3. **6–10s — Why + ask.** Line chart of mobile latency, Tuesday spike highlighted, ending in the "View source query →" outro.

This maps to the **Hook → What changed → Why → Ask** structure encoded in the `draft_brief.md` prompt (`CLAUDE.md` §7.3).
