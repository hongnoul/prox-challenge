import {
  agentEventSchema,
  type AgentEvent,
  type AgentRequest,
} from "@/lib/shared/contracts";

export type StreamAgentOptions = {
  request: AgentRequest;
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
};

export class AgentStreamError extends Error {
  readonly code: string;

  constructor(message: string, code = "stream_error") {
    super(message);
    this.name = "AgentStreamError";
    this.code = code;
  }
}

function parseEventBlock(block: string): AgentEvent | null {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return null;

  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    throw new AgentStreamError("The agent returned malformed streaming data.", "invalid_json");
  }

  const parsed = agentEventSchema.safeParse(value);
  if (!parsed.success) {
    throw new AgentStreamError("The agent returned an unsupported event.", "invalid_event");
  }
  return parsed.data;
}

async function errorFromResponse(response: Response): Promise<AgentStreamError> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string") {
      return new AgentStreamError(body.error, `http_${response.status}`);
    }
  } catch {
    // Use the status-based message below when the body is not JSON.
  }
  return new AgentStreamError(`Agent request failed (${response.status}).`, `http_${response.status}`);
}

export async function streamAgentTurn({
  request,
  signal,
  onEvent,
}: StreamAgentOptions): Promise<{ sessionId: string | null }> {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw await errorFromResponse(response);
  if (!response.body) throw new AgentStreamError("The agent response did not include a stream.", "missing_stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const event = parseEventBlock(block);
      if (event) onEvent(event);
    }

    if (done) break;
  }

  if (buffer.trim()) {
    const event = parseEventBlock(buffer);
    if (event) onEvent(event);
  }

  return { sessionId: response.headers.get("X-OmniPro-Session") };
}
