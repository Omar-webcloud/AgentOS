import type { NextRequest } from "next/server";

/**
 * Runtime reverse proxy for `/api/*` → the AgentOS API.
 *
 * Why this exists instead of a `rewrites()` entry in `next.config.mjs`:
 * `next.config` is evaluated at BUILD time and the resolved rewrite is frozen
 * into `.next/routes-manifest.json`. An `API_URL` that is only present at
 * runtime (added to Railway/Vercel after the image was built, or set on a
 * service that was built elsewhere) is therefore ignored, and every `/api/*`
 * request silently goes to the build-time default — usually
 * `http://localhost:4000`, where nothing is listening in a deployed container.
 *
 * Resolving the upstream per request means `API_URL` behaves the way operators
 * expect: change the variable, restart the web service, and it takes effect.
 *
 * It also turns "the API is unreachable" into a visible, structured 502 that
 * the console renders as an error banner instead of an empty page.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const DEFAULT_API_URL = "http://localhost:4000";

/**
 * Hop-by-hop and length/encoding headers that must not be forwarded: `fetch`
 * and the Next.js response writer re-derive them.
 */
const STRIPPED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-length",
  // Let the upstream decide; forwarding the browser's `br, gzip` and then
  // re-serving the already-decoded body breaks content-length/encoding.
  "accept-encoding",
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
]);

function resolveApiUrl(): string {
  const raw = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  // Tolerate a trailing slash (`https://api.up.railway.app/`), which would
  // otherwise produce `//api/v1/agents` and a 404 from the API.
  return (raw || DEFAULT_API_URL).replace(/\/+$/, "");
}

function forwardable(headers: Headers, stripped: Set<string>): Headers {
  const out = new Headers();
  headers.forEach((value, key) => {
    if (!stripped.has(key.toLowerCase())) out.set(key, value);
  });
  return out;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  const apiUrl = resolveApiUrl();
  const target = `${apiUrl}/api/${(path ?? []).join("/")}${req.nextUrl.search}`;

  const headers = forwardable(req.headers, STRIPPED_REQUEST_HEADERS);
  headers.set("x-forwarded-host", req.nextUrl.host);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return Response.json(
      {
        error: "api_unreachable",
        message: `The console could not reach the AgentOS API at ${apiUrl}.`,
        detail,
        apiUrl,
        hint: "Set API_URL on the web service to the API's public URL (e.g. https://agentos-api.up.railway.app) and restart the web service.",
      },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: forwardable(upstream.headers, STRIPPED_RESPONSE_HEADERS),
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
