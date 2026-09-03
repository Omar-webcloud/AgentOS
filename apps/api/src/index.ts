import Fastify from "fastify";
import cors from "@fastify/cors";
import { createDb } from "@agentos/db";
import { createGateway } from "@agentos/llm-gateway";
import { ToolRuntime } from "@agentos/tool-runtime";
import { AgentRuntime, RuntimeRepository } from "@agentos/runtime";
import { ControlPlane } from "./control-plane.js";
import { registerAuth } from "./auth.js";
import { registerRoutes } from "./routes.js";
import { backfillEmptyOrganizations, seed } from "./seed.js";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";

/**
 * Resolves the LLM provider configuration from the environment.
 *
 * Hugging Face exposes an OpenAI-compatible router, so an HF token plugs into
 * the same OpenAI provider — only the base URL differs. The legacy
 * `api-inference.huggingface.co` host is decommissioned, so the router is the
 * default when an HF key is used.
 */
function resolveLLMConfig(): {
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  geminiApiKey?: string;
  grokApiKey?: string;
} {
  const hfApiKey =
    process.env.HUGGINGFACE_API_KEY ??
    process.env.HF_TOKEN ??
    process.env.HUGGINGFACE_HUB_API_TOKEN;

  const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  const grokApiKey = process.env.GROK_API_KEY ?? process.env.XAI_API_KEY;

  const config: {
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    geminiApiKey?: string;
    grokApiKey?: string;
  } = {};

  if (process.env.OPENAI_API_KEY) {
    config.openaiApiKey = process.env.OPENAI_API_KEY;
    config.openaiBaseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  } else if (hfApiKey) {
    config.openaiApiKey = hfApiKey;
    config.openaiBaseUrl = process.env.OPENAI_BASE_URL ?? "https://router.huggingface.co/v1";
  }
  if (geminiApiKey) config.geminiApiKey = geminiApiKey;
  if (grokApiKey) config.grokApiKey = grokApiKey;
  return config;
}

const db = createDb();
seed(db);
// Repair organizations that predate the starter-portfolio seeding (e.g. an
// account created before it existed, or a database reset by an older build).
// Without this those accounts show an empty agent list with no obvious cause.
const backfilled = backfillEmptyOrganizations(db);
if (backfilled > 0) {
  console.log(`[seed] backfilled starter agents into ${backfilled} organization(s)`);
}

const cp = new ControlPlane(db);
const repo = new RuntimeRepository(db);
const gateway = createGateway(resolveLLMConfig());
const toolRuntime = new ToolRuntime();

const runtime = new AgentRuntime({
  repo,
  gateway,
  tools: toolRuntime,
  getTool: (id) => cp.getTool(id),
  getAgent: (id) => cp.getAgent(id),
  getVersion: (id) => cp.getVersion(id),
  environment: (process.env.ENVIRONMENT as any) ?? "production",
});

const app = Fastify({ logger: true });
app.register(cors, { origin: true });

registerAuth(app, { loadUser: (id) => cp.getUser(id) });
registerRoutes(app, {
  db,
  cp,
  repo,
  runtime,
  environment: (process.env.ENVIRONMENT as any) ?? "production",
  providers: gateway.providers.map((p) => p.name),
  databasePath: db.path,
});

app.listen({ port: PORT, host: HOST }).then((addr) => {
  app.log.info(`AgentOS API listening on ${addr}`);
});
