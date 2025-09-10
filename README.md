## Runbook

This app is a Next.js 15 project with a Layercode voice agent backend deployed on Cloudflare Workers via OpenNext.

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Cloudflare Wrangler (for preview/deploy): `npm i -g wrangler`
- Accounts/keys:
  - OPENAI API key
  - Layercode API key and an Agent ID

### Environment variables

Create a `.env.local` in the project root for local dev:

```bash
OPENAI_API_KEY=your-openai-key
LAYERCODE_API_KEY=your-layercode-api-key
# Optional but recommended if you enable signature verification in /api/agent
LAYERCODE_WEBHOOK_SECRET=your-layercode-webhook-secret
```

These are used by:
- `app/api/authorize/route.ts` → `LAYERCODE_API_KEY`
- `app/api/agent/route.ts` → `OPENAI_API_KEY`, `LAYERCODE_WEBHOOK_SECRET`

Note: signature enforcement in `/api/agent` is currently commented out; set `LAYERCODE_WEBHOOK_SECRET` and uncomment to enforce.

### Install dependencies

```bash
npm install
```

### Run locally (Next.js dev server)

```bash
npm run dev
```

Open http://localhost:3000. The UI will call `POST /api/authorize` to obtain a Layercode session and then stream audio via `POST /api/agent`.

### Cloudflare preview (edge runtime)

Set secrets in your Cloudflare project (used by the Worker built by OpenNext):

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put LAYERCODE_API_KEY
wrangler secret put LAYERCODE_WEBHOOK_SECRET
```

Then run:

```bash
npm run preview
```

This builds to `.open-next/` and starts a Wrangler preview Worker serving the app.

### Deploy to Cloudflare

```bash
wrangler login
npm run deploy
```

The deploy command builds with OpenNext and publishes the Worker defined in `wrangler.jsonc`.

### Useful scripts

- `npm run dev` — Next.js dev server (Node)
- `npm run build` — Next.js production build
- `npm run start` — Next.js production server (Node)
- `npm run preview` — OpenNext build + Wrangler preview
- `npm run deploy` — OpenNext build + Cloudflare deploy
- `npm run cf-typegen` — Generate Cloudflare `env` type definitions

### Configuration

- Edit `layercode.config.json` to change the system prompt and the welcome message.
- OpenNext Cloudflare config is in `open-next.config.ts` and Worker settings in `wrangler.jsonc`.

### API overview

- `POST /api/authorize` — Exchanges `{ agent_id }` for a Layercode web session using `LAYERCODE_API_KEY`.
- `POST /api/agent` — Layercode webhook handler that streams model responses via OpenAI (`OPENAI_API_KEY`).

### Troubleshooting

- Missing `LAYERCODE_API_KEY` or `agent_id` → requests to `/api/authorize` will fail.
- 401/403 from Layercode → verify API key and agent permissions; ensure you are targeting the correct environment.
- No audio/response → check `OPENAI_API_KEY`, browser console, and server logs.
