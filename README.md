# AI Ad Editor

Transcript-driven AI ad editor for managed creators — **internal tool**, Phase 1 foundation scaffold.

Turns raw long-form creator footage into short-form ad creatives: transcribe → LLM proposes an edit decision list (EDL) → render cuts with captions → human reviews in a transcript editor → export. (See the scope of work for the full design.)

## What's in this scaffold

This is the **Foundation + typed seams** build. The whole pipeline loop runs end-to-end with **mock providers** — no API keys required — so you can exercise the data model, the EDL contract, and the state machine before wiring real vendors.

- **App shell** (`src/app`) — dashboard, creators, projects, project detail, assets. Auth is intentionally out of scope but the layout is structured for it.
- **Data model** (`src/db/schema.ts`) — `Creator → Project → SourceAsset → Transcript → EditDecisionList → RenderJob → OutputVariant`, on Drizzle + libSQL/SQLite.
- **EDL contract** (`src/domain/edl.ts`) — the strict-JSON Zod schema the renderer consumes, plus transcript schema. Overlap/ordering validation included.
- **Job state machine** (`src/domain/jobState.ts`) — `uploaded → transcribing → ready_for_analysis → analyzed → rendering → review → exported` (+ `failed`/retry), with guarded transitions.
- **Provider seams** (`src/lib/providers`) — `AsrProvider` / `LlmProvider` / `RenderProvider` interfaces with mock implementations and an env-driven registry. Swap in AssemblyAI/Deepgram, Anthropic/OpenAI, and ffmpeg/Remotion here.
- **Orchestrator** (`src/lib/pipeline.ts`) — runs the loop and persists results. Stands in for the durable queue + workers (Temporal/Redis) until that's wired.

## Tech

Next.js (App Router) · TypeScript · Tailwind v4 · Drizzle ORM · libSQL/SQLite · Zod.

## Getting started

```bash
npm install
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
npm run db:push               # create the SQLite schema (local.db)
npm run db:seed               # load 2 creators, 2 projects, 3 assets
npm run dev                   # http://localhost:3000
```

Open a project → click **Run pipeline** on an asset to run transcribe → analyze → render with the mocks. The asset advances through the state machine, proposed EDL variants appear, and a rendered output variant is recorded.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Push schema to the DB (no migration files) |
| `npm run db:generate` / `db:migrate` | Generate + apply SQL migrations |
| `npm run db:seed` | Load sample data |
| `npm run db:studio` | Drizzle Studio |

## Wiring real providers

1. Add an implementation next to the mock (e.g. `src/lib/providers/asr/assemblyai.ts`) that satisfies the interface in `types.ts`.
2. Register it in `src/lib/providers/index.ts` under the matching `*_PROVIDER` case.
3. Set the env var (`ASR_PROVIDER=…`, etc.) and add the API key to `.env`.

The LLM provider **must** validate its output against `EdlSchema` (and ideally repair-retry) before returning — the renderer trusts that the EDL is well-formed.

### ElevenLabs Scribe (ASR) — wired

The transcription step can run on **ElevenLabs Scribe** ([`src/lib/providers/asr/elevenlabs.ts`](src/lib/providers/asr/elevenlabs.ts)) — word-level timestamps + speaker diarization, no SDK dependency (raw `fetch`).

```bash
# .env
ASR_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=sk_...
STORAGE_DIR=./storage     # local stand-in for object storage
```

- Scribe accepts audio **and** video, so the source upload goes straight in.
- The provider resolves the asset from `STORAGE_DIR` + the asset's `storageKey`. Drop a real media file there matching the seeded key (e.g. `./storage/uploads/jamie_raw_morning_routine.mp4`), or seed an asset whose `storageKey` is an `https://` URL — then Scribe fetches it via `cloud_storage_url`.
- The raw Scribe response is mapped to the internal transcript shape and validated against `TranscriptSchema` (spacing tokens and tagged audio events are dropped; words are grouped into per-speaker, sentence-ish segments for the review editor).

The rest of the loop (LLM analysis, render) stays on mocks until you wire those too.

### Claude (LLM / EDL) — wired

The analysis step can run on **Claude Opus 4.8** ([`src/lib/providers/llm/anthropic.ts`](src/lib/providers/llm/anthropic.ts)) — the strongest model for this structured-reasoning task.

```bash
# .env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-opus-4-8     # optional override
```

How it works:
- **Structured outputs** — a JSON Schema is handed to the API (`output_format`), so the model's response is schema-constrained at generation time rather than coaxed with "respond in JSON" prompting.
- **Adaptive thinking** — the model reasons about hook selection and pacing before emitting the EDL.
- **Prompt caching** — the stable system prompt (the EDL contract) is cached, so repeated analyses across a project only pay for the volatile transcript.
- **Repair-retry + real validation** — every returned variant is re-validated against `EdlSchema` (segment overlap/ordering, `sourceEnd > sourceStart`, etc.). If a variant fails, the provider sends the model a correction turn and tries once more; only valid EDLs reach the renderer.

(Uses the official `@anthropic-ai/sdk`. The JSON Schema is hand-written rather than via the SDK's `betaZodOutputFormat` helper, which requires zod v4 — this project is on zod v3; validation still runs through our zod-v3 `EdlSchema`.)

## Deploy to Railway (with Turso)

Railway's container filesystem is ephemeral, so production uses **Turso** (hosted libSQL) instead of a local SQLite file. No code change is needed — the app already reads `DATABASE_URL` + `DATABASE_AUTH_TOKEN`.

### 1. Create the Turso database (once)

```bash
# install + login (https://docs.turso.tech)
turso db create ai-ad-editor
turso db show ai-ad-editor --url          # -> libsql://ai-ad-editor-<org>.turso.io
turso db tokens create ai-ad-editor       # -> the auth token
```

### 2. Push schema + seed into Turso (from your machine)

```powershell
$env:DATABASE_URL = "libsql://ai-ad-editor-<org>.turso.io"
$env:DATABASE_AUTH_TOKEN = "<token>"
npm run db:push
npm run db:seed
```

### 3. Push to GitHub

```bash
git push -u origin main      # after creating an empty GitHub repo and adding it as origin
```

### 4. Connect on Railway

1. Railway → **New Project → Deploy from GitHub repo** → pick this repo. It auto-detects Next.js (Nixpacks; `railway.json` pins the build/start).
2. Add **Variables**:
   - `DATABASE_URL` = your Turso URL
   - `DATABASE_AUTH_TOKEN` = your Turso token
   - *(optional, to enable real providers)* `ASR_PROVIDER=elevenlabs` + `ELEVENLABS_API_KEY`, `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`
3. Railway builds (`next build`) and starts (`next start -H 0.0.0.0`, binding `$PORT`). Open the generated domain.

With no provider keys set, the deployed app runs on the **mock** providers — fully browsable, including `/review`.

> **Note:** uploaded/rendered media still writes to the local `STORAGE_DIR`, which is ephemeral on Railway. Real ingest/render needs object storage (S3/R2/GCS) — tracked as a follow-up, not wired yet.

## Deliberately out of scope (this engagement)

Auto-publishing to ad platforms · music licensing · performance analytics · billing / multi-tenant SaaS · native mobile · full NLE parity. The MVP loop also runs inline in the API route for demo purposes — production must move transcription/rendering onto the job queue (never inline in a web request).
