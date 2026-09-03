# AgentOS

**An outline for agents.**

Sign up with ChatGPT, Gemini, or Grok — using the Google account you already
have. AgentOS does one thing: **trigger the tasks those agents know how to do.**

It is not a chatbot. It is not a full automation platform. It is a shared
outline of agents, and a button that fires them.

---

## What it is

1. **Sign in with Google.** Continue with ChatGPT, Gemini, or Grok. All three
   use your Google account.
2. **Read the outline.** Each agent is a nested list of the work it will do.
3. **Trigger.** Pick a brain, hit trigger. That's the product.

The runtime underneath still authorizes tools, pauses for human approval, and
writes a trace — so a trigger is real work, not a demo click. You just never
have to operate the rest of the stack.

## Quickstart

Requires **Node.js ≥ 22.13**.

```bash
npm install

# terminal 1 — API (Fastify, port 4000)
npm run dev:api

# terminal 2 — web console (Next.js, port 3000)
npm run dev:web
```

Open http://localhost:3000.

- **Sign up:** pick ChatGPT, Gemini, or Grok and choose a Google account.
- **Demo email (optional):** `admin@agentos.dev` / `demo1234` — already has all
  three brains connected.

The database is SQLite (`apps/api/data/agentos.db`) and is seeded on first boot.

### Run the tests

```bash
npm test
```

## Brains

| Brain | Sign-in | Optional API key |
| --- | --- | --- |
| **ChatGPT** | Google | `OPENAI_API_KEY` |
| **Gemini** | Google | `GEMINI_API_KEY` |
| **Grok** | Google | `GROK_API_KEY` / `XAI_API_KEY` |

Without keys, triggers still complete against a deterministic mock provider so
the outline works with zero setup. Set `GOOGLE_CLIENT_ID` to require a real
Google ID token; otherwise the console uses a Google-style account picker.

## Architecture

The outline is the product. Under it, the original execution slice is intact:

```
Google sign-in  →  Outline  →  Trigger  →  ChatGPT / Gemini / Grok
                                              →  Run  →  Trace
                                              →  Tool  →  Approval
```

Packages under `packages/`: `core`, `db`, `llm-gateway`, `policy-engine`,
`tool-runtime`, `runtime`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Node.js, TypeScript, Fastify
- **Storage:** SQLite (`node:sqlite`)
- **Models:** ChatGPT, Gemini, Grok (mock fallback)

## License

Private portfolio project.
