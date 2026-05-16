# Runbook — meditrack-render

Fly dashboard: https://fly.io/apps/meditrack-render
R2 dashboard: https://dash.cloudflare.com — Storage > R2 > meditrack-videos
Upstash dashboard: https://console.upstash.com
OpenAI usage: https://platform.openai.com/usage
ElevenLabs usage: https://elevenlabs.io/app/subscription

---

## 1. Service down (app not responding)

**Symptoms:** POST /render times out or connection refused. Fly dashboard shows 0 running machines.

**Diagnose:**
```bash
fly status --app meditrack-render
fly logs --app meditrack-render | head -50
```

**Resolve:**
```bash
fly machine restart --app meditrack-render    # restart the machine
# if it won't start:
fly logs --app meditrack-render               # check for boot crash (missing env var, missing file)
fly secrets list --app meditrack-render       # verify all secrets are set
```

**Escalate:** If machine starts but healthcheck fails → check Redis (see incident 2).

---

## 2. All renders failing

**Symptoms:** Every job logs `"msg":"Pipeline failed"`. Callbacks all report `status: "failed"`.

**Diagnose:** Check the `error` field in logs:
```bash
fly logs --app meditrack-render | grep "Pipeline failed"
```

| Error code | Likely cause | Fix |
|---|---|---|
| `script_generation_failed` | OpenAI API key expired or quota hit | Check https://platform.openai.com/usage. Rotate key: `fly secrets set OPENAI_API_KEY=<new>` |
| `tts_failed` | ElevenLabs key expired or out of credits | Check https://elevenlabs.io/app/subscription. Rotate: `fly secrets set ELEVENLABS_API_KEY=<new>` |
| `render_failed` | Remotion/Chromium crash (usually OOM) | Check `fly logs` for `SIGKILL` or `OOMKilled`. Scale up: edit `fly.toml` → `memory = "4gb"` → `fly deploy` |

**Redis down:**
```bash
fly logs --app meditrack-render | grep "redis"
# If healthcheck shows {"ok":false,"redis":"unreachable"}:
# Check Upstash dashboard for status/outage
```

---

## 3. Some renders failing intermittently

**Symptoms:** Some callbacks succeed, some fail. No pattern in logs.

**Diagnose:**
```bash
fly logs --app meditrack-render | grep "Pipeline failed" | tail -20
```

Check for patterns:
- Same `reportId` failing repeatedly → likely a specific report triggers a lint rule or LLM edge case
- `script_safety_violation` or `script_number_hallucination` → the LLM produced bad output for that report. Check the specific error message for which rule fired
- `tts_failed` on specific beats → ElevenLabs rate limit. The pipeline retries once with 2s backoff; if it still fails, wait and retry the job

---

## 4. Rate limiter rejecting legit traffic

**Symptoms:** meditrack_v3 backend gets 429 responses from POST /render.

**Current limit:** 10 requests/min/IP, in-memory sliding window (`server/rate-limit.ts`).

**Quick fix:** Edit `MAX_REQUESTS` in `server/rate-limit.ts`, commit, deploy. No restart needed for in-memory state — deploy resets the counters.

**If meditrack_v3 sends from a fixed IP:** The rate limiter reads `x-forwarded-for`. Fly's proxy sets this. If all traffic comes from one IP, the limit applies globally. Raise the limit or add an IP allowlist in `rate-limit.ts`.

---

## 5. Out of disk space

**Symptoms:** Renders fail with `ENOSPC`. Fly machine logs show disk full.

**Cause:** TTS cache at `/tmp/tts-cache/` grows over time. Job temp dirs at `/tmp/meditrack-*` should auto-clean (see `server/pipeline/run.ts` finally block) but may leak on hard crashes.

**Fix:**
```bash
fly ssh console --app meditrack-render
# Inside the machine:
du -sh /tmp/tts-cache/        # check cache size
rm -rf /tmp/tts-cache/*       # clear TTS cache (regenerates on next render)
rm -rf /tmp/meditrack-*       # clear leaked job dirs
```

---

## 6. Costs spiking

**Symptoms:** OpenAI or ElevenLabs bill is higher than expected.

**Check spend:**
- OpenAI: https://platform.openai.com/usage (filter by date)
- ElevenLabs: https://elevenlabs.io/app/subscription (character usage)

**Emergency stop** (stop all renders without taking down the HTTP server):
```bash
fly ssh console --app meditrack-render
# Kill the Node process — Fly will restart it, but queued jobs stay in Redis
kill 1
```

Or scale to zero temporarily:
```bash
fly scale count 0 --app meditrack-render
# Re-enable:
fly scale count 1 --app meditrack-render
```

**Find the bug:** Check if one report is being re-rendered in a loop (retry storm). Look for repeated `reportId` values:
```bash
fly logs --app meditrack-render | grep "Processing job" | tail -50
```

---

## 7. Bad render in production

**Symptoms:** User reports a video with wrong content, hallucinated numbers, or missing disclaimer.

**Find the video:**
```bash
# R2 objects are stored as {reportId}/{jobId}.mp4
# Find the jobId from the callback log or the caller's records
fly logs --app meditrack-render | grep "<reportId>"
```

**Delete from R2:**
Go to https://dash.cloudflare.com → Storage → R2 → meditrack-videos → navigate to `{reportId}/` → delete the `.mp4` file.

**Regenerate:** Have meditrack_v3 re-POST the render request for that reportId. The pipeline will generate a new script, new audio, new video.

**If it's a systematic issue** (same bad output for a class of reports): check `prompts/draft_script.md` for prompt gaps, check `server/pipeline/lint.ts` for missing safety rules, and add a new lint rule before redeploying.
