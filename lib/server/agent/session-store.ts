import type { TwinState } from "@/lib/shared/contracts/twin-state";
import { createInitialTwinState } from "@/lib/shared/contracts/twin-state";

type SessionRecord = {
  id: string;
  createdAt: number;
  lastAccessedAt: number;
  sdkSessionId?: string;
  twinState: TwinState;
};

const SESSION_TTL_MS = 30 * 60 * 1_000;
const sessions = new Map<string, SessionRecord>();

function removeExpiredSessions(now = Date.now()) {
  for (const [id, session] of sessions) {
    if (now - session.lastAccessedAt > SESSION_TTL_MS) sessions.delete(id);
  }
}

export function createSession(): SessionRecord {
  removeExpiredSessions();
  const now = Date.now();
  const session: SessionRecord = {
    id: crypto.randomUUID(),
    createdAt: now,
    lastAccessedAt: now,
    twinState: createInitialTwinState(),
  };
  sessions.set(session.id, session);
  return structuredClone(session);
}

export function getOrCreateSession(id?: string): SessionRecord {
  removeExpiredSessions();
  if (id) {
    const existing = sessions.get(id);
    if (existing) {
      existing.lastAccessedAt = Date.now();
      return structuredClone(existing);
    }
  }
  return createSession();
}

export function updateSession(id: string, patch: Partial<Pick<SessionRecord, "sdkSessionId" | "twinState">>) {
  const existing = sessions.get(id);
  if (!existing) return;
  Object.assign(existing, patch, { lastAccessedAt: Date.now() });
}

export function sessionCount() {
  removeExpiredSessions();
  return sessions.size;
}

