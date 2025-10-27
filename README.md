This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy on Cloudflare

When you're ready to deploy to production, you can follow these steps: https://docs.layercode.com/how-tos/deploy-nextjs-to-cloudflare

So that user conversation history is correctly stored, you must configure Cloudflare KV store. Run the following, and ensure your wrangler.jsonc is updated with the correct KV binding info.

```bash
npx wrangler kv namespace create MESSAGES_KV
```
