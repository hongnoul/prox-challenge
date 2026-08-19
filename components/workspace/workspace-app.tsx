"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IntentBubbles, intentOptions, type IntentId } from "@/components/chat/intent-bubbles";
import { ProductTwinLazy } from "@/components/product-twin/product-twin-lazy";
import { ArtifactSurface, type WorkspaceArtifact } from "./artifact-surface";
import { ChatPanel, type ClarificationValues, type WorkspaceMessage } from "./chat-panel";
import { EvidenceDrawer } from "./evidence-drawer";
import { EntityInspector } from "./entity-inspector";
import {
  createAppSession,
  loadEntity,
  loadProductSummary,
  mergeSelectedEntity,
  type EntityResponse,
  type ProductSummary,
} from "@/lib/client/api";
import { AgentStreamError, streamAgentTurn } from "@/lib/client/agent-stream";
import {
  createInitialTwinState,
  type AgentEvent,
  type SceneCommand,
  type TwinState,
} from "@/lib/shared/contracts";
import { applyTwinPatch } from "@/lib/shared/domain";

const suggestionsByIntent: Record<IntentId, string[]> = {
  explore: [
    "Show me the front panel controls",
    "Where is the negative output socket?",
    "Open the welding process selection chart",
  ],
  guide: [
    "Guide me through a TIG setup",
    "Explain MIG polarity before I connect the leads",
    "What is the published duty cycle at 200 A?",
  ],
  diagnose: [
    "Help me diagnose porosity in a MIG weld",
    "I have porosity with flux-core wire",
    "Check whether my polarity is correct",
  ],
};

type ProcedureState = {
  procedureId: string;
  stepIndex: number;
};

type SessionStatus = "starting" | "ready" | "on-demand";

type PayloadByType = {
  "text-delta": { text: string };
  warning: { message: string };
  citation: { evidenceId: string; label: string };
  "clarification-request": { question: string; fields: string[] };
  "scene-command": { commands: SceneCommand[] };
  "artifact-request": Omit<WorkspaceArtifact, "id">;
  "procedure-progress": { procedureId: string; stepIndex: number };
  error: { message: string; code: string };
};

function payloadFor<K extends keyof PayloadByType>(event: AgentEvent): PayloadByType[K] {
  return event.payload as PayloadByType[K];
}

function procedureLabel(id: string): string {
  return id.replace(/^procedure-/, "").replaceAll("-", " ");
}

function applyConfirmedValues(state: TwinState, values: ClarificationValues): TwinState {
  const next: TwinState = { ...state, revision: state.revision + 1 };
  const source = "user-confirmed" as const;

  for (const [field, value] of Object.entries(values)) {
    if (!value.trim()) continue;
    switch (field) {
      case "process":
        if (["mig", "flux-core", "tig", "stick"].includes(value)) {
          next.process = { value: value as TwinState["process"]["value"], source };
        }
        break;
      case "inputVoltage":
        if (value === "120" || value === "240") {
          next.inputVoltage = { value: Number(value) as 120 | 240, source };
        }
        break;
      case "material":
        next.material = { value, source };
        break;
      case "wireOrElectrode":
        next.wireOrElectrode = { value, source };
        break;
      case "shieldingGas":
        next.shieldingGas = { value, source };
        break;
      case "torchConnection":
        if (value === "positive" || value === "negative") next.torchConnection = { value, source };
        break;
      case "groundConnection":
        if (value === "positive" || value === "negative") next.groundConnection = { value, source };
        break;
      default:
        break;
    }
  }
  return next;
}

function LogoutButton({ className }: { className?: string }) {
  return (
    <form className={className} action="/api/auth/logout" method="post">
      <button type="submit">Lock workspace</button>
    </form>
  );
}

export function WorkspaceApp() {
  const [intent, setIntent] = useState<IntentId | null>(null);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [twinState, setTwinState] = useState<TwinState>(() => createInitialTwinState());
  const [sceneCommands, setSceneCommands] = useState<SceneCommand[]>([]);
  const [commandRevision, setCommandRevision] = useState(0);
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([]);
  const [procedure, setProcedure] = useState<ProcedureState | null>(null);
  const [procedureNotice, setProcedureNotice] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<EntityResponse | null>(null);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityError, setEntityError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("starting");
  const [isSending, setIsSending] = useState(false);

  const twinStateRef = useRef(twinState);
  const sessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<ReturnType<typeof createAppSession> | null>(null);
  const turnControllerRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    twinStateRef.current = twinState;
  }, [twinState]);

  const ensureSession = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    sessionPromiseRef.current ??= createAppSession();
    try {
      const session = await sessionPromiseRef.current;
      sessionIdRef.current = session.sessionId;
      setTwinState((current) => {
        const next = current.revision === 0 && current.selectedEntityId === null
          ? session.twinState
          : current;
        twinStateRef.current = next;
        return next;
      });
      setSessionStatus("ready");
      return session.sessionId;
    } catch {
      sessionPromiseRef.current = null;
      setSessionStatus("on-demand");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!intent) return;
    void ensureSession();
    const controller = new AbortController();
    loadProductSummary(controller.signal).then(setProduct).catch(() => undefined);
    return () => controller.abort();
  }, [ensureSession, intent]);

  useEffect(() => {
    const entityId = twinState.selectedEntityId;
    if (!entityId) {
      setSelectedEntity(null);
      setEntityError(null);
      setEntityLoading(false);
      return;
    }

    const controller = new AbortController();
    setSelectedEntity(null);
    setEntityError(null);
    setEntityLoading(true);
    loadEntity(entityId, controller.signal)
      .then(setSelectedEntity)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setEntityError(reason instanceof Error ? reason.message : "Could not explain the selected part.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setEntityLoading(false);
      });
    return () => controller.abort();
  }, [twinState.selectedEntityId]);

  const patchMessage = useCallback((id: string, patch: (message: WorkspaceMessage) => WorkspaceMessage) => {
    setMessages((current) => current.map((message) => message.id === id ? patch(message) : message));
  }, []);

  const handleEvent = useCallback((event: AgentEvent, assistantId: string) => {
    sessionIdRef.current = event.sessionId;
    setSessionStatus("ready");

    switch (event.type) {
      case "text-delta": {
        const { text } = payloadFor<"text-delta">(event);
        patchMessage(assistantId, (message) => ({ ...message, text: message.text + text }));
        break;
      }
      case "warning": {
        const { message: warning } = payloadFor<"warning">(event);
        patchMessage(assistantId, (message) => ({
          ...message,
          warnings: message.warnings.includes(warning) ? message.warnings : [...message.warnings, warning],
        }));
        break;
      }
      case "citation": {
        const citation = payloadFor<"citation">(event);
        patchMessage(assistantId, (message) => ({
          ...message,
          citations: message.citations.some(({ evidenceId: id }) => id === citation.evidenceId)
            ? message.citations
            : [...message.citations, citation],
        }));
        break;
      }
      case "clarification-request": {
        const clarification = payloadFor<"clarification-request">(event);
        patchMessage(assistantId, (message) => ({ ...message, clarification }));
        break;
      }
      case "scene-command": {
        const { commands } = payloadFor<"scene-command">(event);
        setSceneCommands(commands);
        setCommandRevision((revision) => revision + 1);
        break;
      }
      case "artifact-request": {
        const artifact = payloadFor<"artifact-request">(event);
        setArtifacts((current) => [
          { ...artifact, id: `${event.turnId}-${event.sequence}` },
          ...current,
        ].slice(0, 3));
        break;
      }
      case "procedure-progress": {
        const nextProcedure = payloadFor<"procedure-progress">(event);
        if (typeof nextProcedure.procedureId !== "string" || !Number.isInteger(nextProcedure.stepIndex)) break;
        setProcedure(nextProcedure);
        setProcedureNotice(null);
        setTwinState((current) => {
          if (current.activeProcedureId === nextProcedure.procedureId) return current;
          const next = {
            ...current,
            revision: current.revision + 1,
            activeProcedureId: nextProcedure.procedureId,
          };
          twinStateRef.current = next;
          return next;
        });
        break;
      }
      case "error": {
        const error = payloadFor<"error">(event);
        patchMessage(assistantId, (message) => ({ ...message, status: "error", error }));
        break;
      }
      case "complete":
        patchMessage(assistantId, (message) => ({ ...message, status: "complete" }));
        break;
      default:
        break;
    }
  }, [patchMessage]);

  const sendMessage = useCallback(async (text: string) => {
    if (isSending) return;
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const userMessage: WorkspaceMessage = {
      id: userId,
      role: "user",
      text,
      status: "complete",
      citations: [],
      warnings: [],
    };
    const assistantMessage: WorkspaceMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      status: "streaming",
      citations: [],
      warnings: [],
    };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setIsSending(true);
    streamingMessageIdRef.current = assistantId;
    const controller = new AbortController();
    turnControllerRef.current = controller;

    const sessionId = await ensureSession();
    try {
      const result = await streamAgentTurn({
        request: {
          ...(sessionId ? { sessionId } : {}),
          message: text,
          selectedEntityId: twinStateRef.current.selectedEntityId,
          twinState: twinStateRef.current,
        },
        signal: controller.signal,
        onEvent: (event) => handleEvent(event, assistantId),
      });
      if (result.sessionId) sessionIdRef.current = result.sessionId;
      patchMessage(assistantId, (message) => message.status === "streaming"
        ? { ...message, status: "complete" }
        : message);
    } catch (reason) {
      if (controller.signal.aborted) {
        patchMessage(assistantId, (message) => ({
          ...message,
          text: message.text || "Response stopped.",
          status: "complete",
        }));
      } else {
        const error = reason instanceof AgentStreamError
          ? { message: reason.message, code: reason.code }
          : { message: reason instanceof Error ? reason.message : "The agent turn failed.", code: "client_error" };
        patchMessage(assistantId, (message) => ({ ...message, status: "error", error }));
      }
    } finally {
      if (turnControllerRef.current === controller) turnControllerRef.current = null;
      if (streamingMessageIdRef.current === assistantId) streamingMessageIdRef.current = null;
      setIsSending(false);
    }
  }, [ensureSession, handleEvent, isSending, patchMessage]);

  const stopTurn = useCallback(() => {
    turnControllerRef.current?.abort("Stopped by user");
  }, []);

  const confirmClarification = useCallback((values: ClarificationValues) => {
    const next = applyConfirmedValues(twinStateRef.current, values);
    twinStateRef.current = next;
    setTwinState(next);
    const summary = Object.entries(values)
      .map(([field, value]) => `${field.replaceAll(/([A-Z])/g, " $1")}: ${value}`)
      .join(", ");
    void sendMessage(`Confirmed setup — ${summary}. Please continue.`);
  }, [sendMessage]);

  const selectEntity = useCallback((selectedEntityId: string | null) => {
    setTwinState((current) => {
      const next = mergeSelectedEntity(current, selectedEntityId);
      twinStateRef.current = next;
      return next;
    });
  }, []);

  const activeIntent = intentOptions.find(({ id }) => id === intent);
  const activeProcedure = product?.procedures.find(({ id }) => id === procedure?.procedureId);

  const stageProcedureStep = useCallback((stepIndex: number) => {
    if (!procedure) return;
    const selectedProcedure = product?.procedures.find(({ id }) => id === procedure.procedureId);
    if (!selectedProcedure) return;
    const boundedIndex = Math.max(0, Math.min(stepIndex, selectedProcedure.steps.length - 1));
    const step = selectedProcedure.steps[boundedIndex];
    setProcedure({ procedureId: selectedProcedure.id, stepIndex: boundedIndex });
    setSceneCommands(step.sceneCommands);
    setCommandRevision((revision) => revision + 1);
    setProcedureNotice(null);
  }, [procedure, product]);

  const confirmProcedureStep = useCallback(() => {
    if (!procedure || !activeProcedure) return;
    const step = activeProcedure.steps[procedure.stepIndex];
    if (!step) return;
    const current = twinStateRef.current;
    let next: TwinState;

    if (step.proposedTwinPatch) {
      const applied = applyTwinPatch(current, {
        expectedRevision: current.revision,
        patch: step.proposedTwinPatch,
        source: "user-confirmed",
        confirmed: true,
      });
      if (!applied.applied) {
        setProcedureNotice(applied.messages.join(" "));
        return;
      }
      next = applied.state;
    } else {
      next = { ...current, revision: current.revision + 1 };
    }

    next = {
      ...next,
      activeProcedureId: activeProcedure.id,
      completedStepIds: [...new Set([...next.completedStepIds, step.id])],
    };
    twinStateRef.current = next;
    setTwinState(next);

    if (procedure.stepIndex >= activeProcedure.steps.length - 1) {
      setProcedureNotice("Procedure complete. The twin reflects only the steps you confirmed.");
      return;
    }
    stageProcedureStep(procedure.stepIndex + 1);
  }, [activeProcedure, procedure, stageProcedureStep]);

  if (!intent) {
    return (
      <main className="onboarding-shell">
        <LogoutButton className="onboarding-logout" />
        <IntentBubbles onSelectIntent={setIntent} />
      </main>
    );
  }

  return (
    <main className="workspace-shell">
      <a className="skip-link" href="#workspace-chat">Skip to conversation</a>
      <header className="workspace-topbar">
        <div className="workspace-brand">
          <span aria-hidden="true">V</span>
          <div>
            <strong>OmniPro 220</strong>
            <small>Product twin workspace</small>
          </div>
        </div>

        <nav className="workspace-modes" aria-label="Workspace intent">
          {intentOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={intent === option.id}
              data-active={intent === option.id || undefined}
              onClick={() => setIntent(option.id)}
            >
              {option.id}
            </button>
          ))}
        </nav>

        <div className="workspace-account">
          <div className="workspace-session" data-status={sessionStatus}>
            <span aria-hidden="true" />
            {sessionStatus === "starting" ? "Starting session" : sessionStatus === "ready" ? "Session ready" : "Session on demand"}
          </div>
          <LogoutButton className="workspace-logout" />
        </div>
      </header>

      <div className="workspace-contextbar">
        <div>
          <span>{activeIntent?.label}</span>
          <strong>{activeIntent?.response}</strong>
        </div>
        <button type="button" onClick={() => setIntent(null)}>Change starting point</button>
      </div>

      <div className="workspace-grid">
        <ChatPanel
          messages={messages}
          suggestions={suggestionsByIntent[intent]}
          isSending={isSending}
          onSend={sendMessage}
          onStop={stopTurn}
          onOpenEvidence={setEvidenceId}
          onClarify={confirmClarification}
        />

        <section className="twin-panel" aria-labelledby="twin-panel-title">
          <header className="panel-heading twin-panel-heading">
            <div>
              <p className="eyebrow">Verified reconstruction</p>
              <h2 id="twin-panel-title">Interactive machine</h2>
            </div>
            <div className="twin-selection-status">
              <span>Selected</span>
              <strong>{twinState.selectedEntityId?.replaceAll("-", " ") ?? "No part"}</strong>
            </div>
          </header>
          <div className="workspace-twin-stage">
            <ProductTwinLazy
              selectedEntityId={twinState.selectedEntityId}
              sceneCommands={sceneCommands}
              commandRevision={commandRevision}
              onSelectEntity={selectEntity}
            />
          </div>
        </section>

        <aside className="workspace-rail" aria-label="Procedure and artifact workspace">
          <EntityInspector
            entityId={twinState.selectedEntityId}
            result={selectedEntity}
            loading={entityLoading}
            error={entityError}
            onOpenEvidence={setEvidenceId}
          />

          <section className="state-card">
            <header>
              <div>
                <p className="eyebrow">Twin state</p>
                <h2>Known setup</h2>
              </div>
              <span>r{twinState.revision}</span>
            </header>
            <dl className="twin-state-list">
              <div><dt>Process</dt><dd>{twinState.process.value ?? "Not set"}</dd></div>
              <div><dt>Input</dt><dd>{twinState.inputVoltage.value ? `${twinState.inputVoltage.value} V` : "Not set"}</dd></div>
              <div><dt>Material</dt><dd>{twinState.material.value ?? "Not set"}</dd></div>
            </dl>
          </section>

          {procedure ? (
            <section className="procedure-card" aria-labelledby="procedure-title">
              <p className="eyebrow">Procedure staged</p>
              <h2 id="procedure-title">{activeProcedure?.title ?? procedureLabel(procedure.procedureId)}</h2>
              <p>{activeProcedure?.summary ?? "The agent has opened a source-backed procedure."}</p>
              <div className="procedure-progress" aria-label={`Procedure step ${procedure.stepIndex + 1}${activeProcedure ? ` of ${activeProcedure.steps.length}` : ""}`}>
                <span style={{ width: activeProcedure ? `${Math.min(100, ((procedure.stepIndex + 1) / activeProcedure.steps.length) * 100)}%` : "18%" }} />
              </div>
              <small>Step {procedure.stepIndex + 1}{activeProcedure ? ` of ${activeProcedure.steps.length}` : ""} ready</small>
              {activeProcedure?.steps[procedure.stepIndex] ? (
                <div className="procedure-step" aria-live="polite">
                  <strong>{activeProcedure.steps[procedure.stepIndex].title}</strong>
                  <p>{activeProcedure.steps[procedure.stepIndex].instruction}</p>
                  {activeProcedure.steps[procedure.stepIndex].warning ? (
                    <p className="procedure-warning" role="note">{activeProcedure.steps[procedure.stepIndex].warning}</p>
                  ) : null}
                  <div className="procedure-evidence" aria-label="Evidence for this step">
                    {activeProcedure.steps[procedure.stepIndex].evidenceIds.map((id) => (
                      <button key={id} type="button" onClick={() => setEvidenceId(id)}>View source</button>
                    ))}
                  </div>
                  <div className="procedure-actions">
                    <button type="button" onClick={() => stageProcedureStep(procedure.stepIndex - 1)} disabled={procedure.stepIndex === 0}>Back</button>
                    <button type="button" onClick={() => stageProcedureStep(procedure.stepIndex)}>Repeat focus</button>
                    <button type="button" onClick={confirmProcedureStep}>Confirm step</button>
                  </div>
                </div>
              ) : null}
              {procedureNotice ? <p className="procedure-notice" role="status">{procedureNotice}</p> : null}
            </section>
          ) : null}

          {artifacts.length > 0 ? artifacts.map((artifact) => (
            <ArtifactSurface
              key={artifact.id}
              artifact={artifact}
              onDismiss={(id) => setArtifacts((current) => current.filter((item) => item.id !== id))}
              onOpenEvidence={setEvidenceId}
              troubleshootingPath={product?.troubleshootingPaths.find(({ id }) => id === artifact.props.pathId)}
            />
          )) : (
            <section className="rail-empty">
              <p className="eyebrow">Artifact surface</p>
              <h2>Nothing open yet</h2>
              <p>Calculations, polarity diagrams, diagnostic paths, and source comparisons appear here when they clarify the answer.</p>
            </section>
          )}
        </aside>
      </div>

      <EvidenceDrawer evidenceId={evidenceId} onClose={() => setEvidenceId(null)} />
    </main>
  );
}
