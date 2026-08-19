"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ChatCitation = {
  evidenceId: string;
  label: string;
};

export type ChatClarification = {
  question: string;
  fields: string[];
};

export type ClarificationValues = Record<string, string>;

export type WorkspaceMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: "streaming" | "complete" | "error";
  citations: ChatCitation[];
  warnings: string[];
  clarification?: ChatClarification;
  error?: { message: string; code: string };
};

type ChatPanelProps = {
  messages: WorkspaceMessage[];
  suggestions: string[];
  isSending: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
  onOpenEvidence: (evidenceId: string) => void;
  onClarify: (values: ClarificationValues) => void;
};

function ClarificationForm({
  clarification,
  disabled,
  onClarify,
}: {
  clarification: ChatClarification;
  disabled: boolean;
  onClarify: (values: ClarificationValues) => void;
}) {
  const [values, setValues] = useState<ClarificationValues>({});
  const complete = clarification.fields.every((field) => values[field]?.trim());

  return (
    <form
      className="clarification-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (complete && !disabled) onClarify(values);
      }}
    >
      {clarification.fields.map((field) => {
        const label = field.replaceAll(/([A-Z])/g, " $1");
        if (field === "process") {
          return (
            <label key={field}>
              <span>{label}</span>
              <select value={values[field] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}>
                <option value="">Choose process</option>
                <option value="mig">MIG</option>
                <option value="flux-core">Flux-core</option>
                <option value="tig">TIG</option>
                <option value="stick">Stick</option>
              </select>
            </label>
          );
        }
        if (field === "inputVoltage") {
          return (
            <label key={field}>
              <span>{label}</span>
              <select value={values[field] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}>
                <option value="">Choose input</option>
                <option value="120">120 V</option>
                <option value="240">240 V</option>
              </select>
            </label>
          );
        }
        if (field === "torchConnection" || field === "groundConnection") {
          return (
            <label key={field}>
              <span>{label}</span>
              <select value={values[field] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}>
                <option value="">Choose polarity</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </select>
            </label>
          );
        }
        return (
          <label key={field}>
            <span>{label}</span>
            <input
              value={values[field] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
              autoComplete="off"
            />
          </label>
        );
      })}
      <button type="submit" disabled={!complete || disabled}>Confirm setup</button>
    </form>
  );
}

export function ChatPanel({
  messages,
  suggestions,
  isSending,
  onSend,
  onStop,
  onOpenEvidence,
  onClarify,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const messageSignature = useMemo(
    () => messages.map(({ id, text, status }) => `${id}:${text.length}:${status}`).join("|"),
    [messages],
  );
  const announcement = useMemo(() => {
    const last = messages.at(-1);
    if (!last || last.role !== "assistant" || last.status === "streaming") return "";
    if (last.error) return `Agent error: ${last.error.message}`;
    return last.text ? `Agent response complete: ${last.text}` : "Agent response complete.";
  }, [messages]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    feedEndRef.current?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [messageSignature]);

  useEffect(() => {
    const focusComposer = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        composerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusComposer);
    return () => window.removeEventListener("keydown", focusComposer);
  }, []);

  const submit = (value = draft) => {
    const message = value.trim();
    if (!message || isSending) return;
    setDraft("");
    onSend(message);
  };

  return (
    <section className="chat-panel" id="workspace-chat" aria-labelledby="chat-title">
      <header className="panel-heading">
        <div>
          <p className="eyebrow">Grounded conversation</p>
          <h2 id="chat-title">Product copilot</h2>
        </div>
        <span className="keyboard-hint"><kbd>⌘</kbd><kbd>K</kbd></span>
      </header>

      <div className="sr-only" aria-live="polite">{announcement}</div>
      <div className="chat-feed" role="log" aria-live="off" aria-relevant="additions">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty-mark" aria-hidden="true">⌁</span>
            <h3>Start with the work in front of you.</h3>
            <p>I’ll keep source facts, reconstruction, and explanation visibly separate.</p>
            <div className="prompt-suggestions" aria-label="Suggested questions">
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => submit(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message) => (
          <article key={message.id} className="chat-message" data-role={message.role} data-status={message.status}>
            <p className="message-role">{message.role === "user" ? "You" : "OmniPro"}</p>
            {message.text ? <p className="message-text">{message.text}</p> : null}

            {message.warnings.map((warning) => (
              <div className="message-warning" role="note" key={warning}>
                <strong>Operating note</strong>
                <span>{warning}</span>
              </div>
            ))}

            {message.clarification ? (
              <div className="clarification-card">
                <strong>One detail before I continue</strong>
                <p>{message.clarification.question}</p>
                {message.clarification.fields.length > 0 ? (
                  <ClarificationForm
                    clarification={message.clarification}
                    disabled={isSending}
                    onClarify={onClarify}
                  />
                ) : null}
              </div>
            ) : null}

            {message.error ? (
              <div className="message-error" role="alert">
                <strong>Turn interrupted</strong>
                <span>{message.error.message}</span>
                <code>{message.error.code}</code>
              </div>
            ) : null}

            {message.citations.length > 0 ? (
              <div className="message-citations" aria-label="Sources">
                {message.citations.map((citation) => (
                  <button
                    key={citation.evidenceId}
                    type="button"
                    onClick={() => onOpenEvidence(citation.evidenceId)}
                    aria-label={`Open source ${citation.label}`}
                  >
                    <span aria-hidden="true">↗</span>
                    {citation.label}
                  </button>
                ))}
              </div>
            ) : null}

            {message.status === "streaming" ? <span className="stream-cursor" aria-label="Response streaming" /> : null}
          </article>
        ))}
        <div ref={feedEndRef} />
      </div>

      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="agent-message">Ask about the OmniPro 220</label>
        <textarea
          ref={composerRef}
          id="agent-message"
          rows={1}
          value={draft}
          maxLength={4000}
          placeholder="Ask about a setup, part, rating, or problem…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        {isSending ? (
          <button type="button" className="composer-stop" onClick={onStop}>
            <span aria-hidden="true" /> Stop
          </button>
        ) : (
          <button type="submit" className="composer-send" disabled={!draft.trim()} aria-label="Send message">
            ↑
          </button>
        )}
        <p>Enter to send · Shift + Enter for a new line</p>
      </form>
    </section>
  );
}
