import Fastify from "fastify";
import cors from "@fastify/cors";
import { createDb } from "@agentos/db";
import { createGateway } from "@agentos/llm-gateway";
import { ToolRuntime } from "@agentos/tool-runtime";
import { AgentRuntime, RuntimeRepository } from "@agentos/runtime";
import { ControlPlane } from "./control-plane.js";
import { registerAuth } from "./auth.js";
import { registerRoutes } from "./routes.js";
import { seed } from "./seed.js";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";

const db = createDb();
seed(db);

const cp = new ControlPlane(db);
const repo = new RuntimeRepository(db);
const gateway = createGateway({
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
});
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
registerRoutes(app, { db, cp, repo, runtime, environment: (process.env.ENVIRONMENT as any) ?? "production" });

app.listen({ port: PORT, host: HOST }).then((addr) => {
  app.log.info(`AgentOS API listening on ${addr}`);
});
