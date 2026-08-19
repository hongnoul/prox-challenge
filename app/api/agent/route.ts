import { agentRequestSchema } from "@/lib/shared/contracts";
import { createAgentEventStream } from "@/lib/server/agent/stream-turn";
import { hasSameOrigin, sessionFromRequest } from "@/lib/server/security/session";
import {
  clientAddress,
  consumeRateLimit,
  positiveInteger,
  rateLimitHeaders,
  SharedRateLimitUnavailableError,
  type RateLimitResult,
} from "@/lib/server/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_REQUEST_BYTES = 16_384;

async function consumeAgentLimits(request: Request, sessionId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const sessionLimit = positiveInteger(process.env.AGENT_RATE_LIMIT_MAX, 10);
  const sessionWindowSeconds = positiveInteger(process.env.AGENT_RATE_LIMIT_WINDOW_SECONDS, 10 * 60);
  const sessionResult = await consumeRateLimit(
    `agent:session:${sessionId}`,
    sessionLimit,
    sessionWindowSeconds * 1_000,
    now,
  );
  if (!sessionResult.allowed) return sessionResult;

  const addressLimit = positiveInteger(process.env.AGENT_IP_DAILY_LIMIT_MAX, 60);
  const addressResult = await consumeRateLimit(
    `agent:address:${clientAddress(request)}`,
    addressLimit,
    24 * 60 * 60 * 1_000,
    now,
  );
  return addressResult.allowed ? sessionResult : addressResult;
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Cross-origin agent requests are not allowed" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "Request body is too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
      return Response.json({ error: "Request body is too large" }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = agentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid agent request", issues: parsed.error.issues }, { status: 400 });
  }

  const authSession = await sessionFromRequest(request);
  if (!authSession) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  let rateLimit: RateLimitResult;
  try {
    rateLimit = await consumeAgentLimits(request, authSession.sessionId);
  } catch (error) {
    if (error instanceof SharedRateLimitUnavailableError) {
      return Response.json({ error: "Agent rate limiting is temporarily unavailable" }, { status: 503 });
    }
    throw error;
  }
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Agent request limit reached. Try again after the cooldown." },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  const { stream, sessionId } = createAgentEventStream(parsed.data, request.signal);
  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-OmniPro-Session": sessionId,
      ...rateLimitHeaders(rateLimit),
    },
  });
}
