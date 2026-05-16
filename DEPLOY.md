# Deploying meditrack-render

App: `meditrack-render` on Fly.io (bom region)
Dashboard: https://fly.io/apps/meditrack-render

## Pre-deploy checklist

```bash
npm run typecheck          # both tsconfig.json and tsconfig.server.json
npm run test               # vitest — 4 integration tests
git status                 # nothing uncommitted, no .env files staged
fly auth whoami            # confirm you're authed to the right org
```

## Deploy

```bash
fly deploy
```

Rolling strategy — the new machine starts, passes healthcheck, then the old one drains. In-flight renders finish before the old machine dies.

## Watch logs (first 5 minutes)

```bash
fly logs --app meditrack-render
```

Look for:
- `"msg":"HTTP listening"` — server booted
- `"msg":"Render worker started"` — worker is accepting jobs
- Healthcheck 200s (Fly polls `/healthz` every 30s)

Red flags (roll back immediately):
- `FATAL: prompts/draft_script.md not found` or `banned-meds.txt not found` — missing COPY in Dockerfile
- `Missing or invalid environment variables` — a secret wasn't set
- Repeated `"msg":"Job failed"` — something broke in the pipeline

## Roll back

```bash
fly releases --app meditrack-render          # find the last good version
fly deploy --image registry.fly.io/meditrack-render:deployment-<ID>
# or
fly releases revert <version-number> --app meditrack-render
```

## When to roll back

- /healthz returning 503 for > 2 minutes
- > 30% of renders failing (watch `"msg":"Pipeline failed"` in logs)
- Any `FATAL` log on boot
- 5xx responses on POST /render that weren't happening before deploy

Don't debug in production. Roll back, then reproduce locally.
