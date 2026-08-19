import { createSession, sessionCount } from "@/lib/server/agent/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST() {
  const session = createSession();
  return Response.json({
    sessionId: session.id,
    twinState: session.twinState,
    expiresAfterIdleMinutes: 30,
    restartBehavior: "session-loss",
  }, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}

export function GET() {
  return Response.json({ activeSessions: sessionCount(), persistence: "in-memory" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
