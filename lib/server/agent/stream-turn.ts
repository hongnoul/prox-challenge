import type { AgentEvent, AgentEventType, AgentRequest } from "@/lib/shared/contracts";
import { getAgentRuntimeStatus } from "./auth";
import { answerDeterministically } from "./deterministic-agent";
import { runLiveAgentTurn, validateEvent } from "./live-agent";
import { Semaphore } from "./semaphore";
import { getOrCreateSession, updateSession } from "./session-store";

const encoder = new TextEncoder();
const turnSemaphore = new Semaphore(Number(process.env.OMNIPRO_AGENT_CONCURRENCY ?? 2));

const encodeEvent = (event: AgentEvent) => encoder.encode(`data: ${JSON.stringify(event)}\n\n`);

export function createAgentEventStream(request: AgentRequest, requestSignal: AbortSignal) {
  const session = getOrCreateSession(request.sessionId);
  const turnRequest: AgentRequest = {
    ...request,
    twinState: {
      ...request.twinState,
      selectedEntityId: request.selectedEntityId ?? request.twinState.selectedEntityId,
    },
  };
  updateSession(session.id, { twinState: turnRequest.twinState });
  const turnId = crypto.randomUUID();
  let sequence = 0;
  let terminalSent = false;
  const timeoutController = new AbortController();
  const onAbort = () => timeoutController.abort(requestSignal.reason ?? new Error("Client disconnected"));
  if (requestSignal.aborted) onAbort();
  else requestSignal.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => timeoutController.abort(new Error("Agent turn timed out")), 45_000);

  const nextEvent = (type: AgentEventType, payload: unknown) => validateEvent({
    schemaVersion: 1,
    sessionId: session.id,
    turnId,
    sequence: ++sequence,
    type,
    timestamp: new Date().toISOString(),
    payload,
  });

  return {
    sessionId: session.id,
    stream: new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (event: AgentEvent) => {
          if (terminalSent) return;
          if (event.type === "complete" || event.type === "error") terminalSent = true;
          controller.enqueue(encodeEvent(event));
        };
        let release: (() => void) | undefined;
        try {
          release = await turnSemaphore.acquire(timeoutController.signal);
          const runtimeStatus = getAgentRuntimeStatus();
          write(nextEvent("turn-start", {
            mode: runtimeStatus.mode,
            concurrency: turnSemaphore.activeCount,
          }));

          if (runtimeStatus.mode === "deterministic") {
            if (runtimeStatus.credentialSource === "none" && process.env.OMNIPRO_AGENT_MODE !== "deterministic") {
              write(nextEvent("warning", { message: "No Claude Agent SDK credential was detected. Using the deterministic evidence engine." }));
            }
            const response = answerDeterministically(turnRequest.message, turnRequest.twinState);
            if (response.clarification) write(nextEvent("clarification-request", response.clarification));
            write(nextEvent("text-delta", { text: response.text }));
            response.evidenceIds.forEach((evidenceId) => write(nextEvent("citation", { evidenceId, label: evidenceId })));
            if (response.sceneCommands.length > 0) write(nextEvent("scene-command", { commands: response.sceneCommands }));
            if (response.artifact) write(nextEvent("artifact-request", response.artifact));
            if (response.procedureId) write(nextEvent("procedure-progress", { procedureId: response.procedureId, stepIndex: 0 }));
            write(nextEvent("complete", { stopReason: "deterministic" }));
          } else {
            await runLiveAgentTurn({
              request: turnRequest,
              appSessionId: session.id,
              sdkSessionId: session.sdkSessionId,
              turnId,
              abortController: timeoutController,
              write,
              nextEvent,
              onSdkSession: (sdkSessionId) => updateSession(session.id, { sdkSessionId }),
            });
          }
        } catch (error) {
          if (!terminalSent) {
            write(nextEvent("error", {
              code: timeoutController.signal.aborted ? "aborted" : "internal_error",
              message: error instanceof Error ? error.message : "Agent turn failed",
            }));
          }
        } finally {
          release?.();
          clearTimeout(timeout);
          requestSignal.removeEventListener("abort", onAbort);
          controller.close();
        }
      },
      cancel(reason) {
        timeoutController.abort(reason ?? new Error("Client disconnected"));
      },
    }),
  };
}
