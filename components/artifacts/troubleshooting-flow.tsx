"use client";

import { useEffect, useId, useMemo, useState } from "react";

export type TroubleshootingNodeKind = "question" | "check" | "resolution";

export interface TroubleshootingNode {
  id: string;
  kind: TroubleshootingNodeKind;
  text: string;
  evidenceIds?: readonly string[];
  next?: Readonly<Record<string, string>>;
}

export interface TroubleshootingPath {
  id: string;
  symptom: string;
  summary: string;
  startNodeId: string;
  nodes: readonly TroubleshootingNode[];
}

export interface TroubleshootingFlowProps {
  path: TroubleshootingPath;
  answerLabels?: Readonly<Record<string, string>>;
  className?: string;
  onNodeChange?: (node: TroubleshootingNode, visitedNodeIds: readonly string[]) => void;
  onResolution?: (node: TroubleshootingNode, visitedNodeIds: readonly string[]) => void;
  onEvidenceSelect?: (evidenceId: string) => void;
}

function optionLabel(option: string) {
  return option
    .split(/[-_\s]+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (["mig", "tig", "ctwd", "dcen", "dcep"].includes(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function nodeKindLabel(kind: TroubleshootingNodeKind) {
  if (kind === "resolution") return "Resolution";
  if (kind === "check") return "Check";
  return "Question";
}

export function TroubleshootingFlow({
  path,
  answerLabels,
  className,
  onNodeChange,
  onResolution,
  onEvidenceSelect,
}: TroubleshootingFlowProps) {
  const headingId = useId();
  const nodeDescriptionId = useId();
  const [history, setHistory] = useState<string[]>([path.startNodeId]);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const classes = ["troubleshooting-flow", className].filter(Boolean).join(" ");

  const nodeMap = useMemo(
    () => new Map(path.nodes.map((node) => [node.id, node] as const)),
    [path.nodes],
  );

  useEffect(() => {
    setHistory([path.startNodeId]);
    setConfigurationError(null);
  }, [path.id, path.startNodeId]);

  const currentNodeId = history.at(-1) ?? path.startNodeId;
  const currentNode = nodeMap.get(currentNodeId);

  useEffect(() => {
    if (currentNode) onNodeChange?.(currentNode, history);
  }, [currentNode, history, onNodeChange]);

  function chooseNext(option: string, targetNodeId: string) {
    const targetNode = nodeMap.get(targetNodeId);
    if (!targetNode) {
      setConfigurationError(`The “${optionLabel(option)}” branch points to an unknown step.`);
      return;
    }

    const nextHistory = [...history, targetNodeId];
    setConfigurationError(null);
    setHistory(nextHistory);
    if (targetNode.kind === "resolution") onResolution?.(targetNode, nextHistory);
  }

  function goBack() {
    setConfigurationError(null);
    setHistory((visited) => (visited.length > 1 ? visited.slice(0, -1) : visited));
  }

  function restart() {
    setConfigurationError(null);
    setHistory([path.startNodeId]);
  }

  if (!currentNode) {
    return (
      <section className={classes} aria-labelledby={headingId}>
        <h2 id={headingId}>{path.symptom}</h2>
        <p role="alert">
          This troubleshooting path cannot start because <code>{path.startNodeId}</code> is not present in its compiled nodes.
        </p>
      </section>
    );
  }

  const choices = Object.entries(currentNode.next ?? {});

  return (
    <section className={classes} aria-labelledby={headingId} data-node-kind={currentNode.kind}>
      <header>
        <p>Troubleshooting</p>
        <h2 id={headingId}>{path.symptom}</h2>
        <p>{path.summary}</p>
      </header>

      <nav aria-label="Visited troubleshooting steps">
        <ol>
          {history.map((nodeId, index) => {
            const visitedNode = nodeMap.get(nodeId);
            const isCurrent = index === history.length - 1;
            return (
              <li key={`${nodeId}-${index}`} aria-current={isCurrent ? "step" : undefined}>
                {visitedNode ? `${nodeKindLabel(visitedNode.kind)} ${index + 1}` : `Step ${index + 1}`}
              </li>
            );
          })}
        </ol>
      </nav>

      <article aria-labelledby={nodeDescriptionId}>
        <p>{nodeKindLabel(currentNode.kind)}</p>
        <h3 id={nodeDescriptionId}>{currentNode.text}</h3>

        {choices.length > 0 ? (
          <fieldset>
            <legend>Choose the result to continue</legend>
            <ul>
              {choices.map(([option, targetNodeId]) => (
                <li key={option}>
                  <button type="button" onClick={() => chooseNext(option, targetNodeId)}>
                    {answerLabels?.[option] ?? optionLabel(option)}
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : (
          <p role="status">
            <strong>{currentNode.kind === "resolution" ? "Path complete" : "No further compiled steps"}</strong>
          </p>
        )}

        {currentNode.evidenceIds && currentNode.evidenceIds.length > 0 ? (
          <aside aria-label="Evidence for this step">
            <h4>Evidence</h4>
            <ul>
              {currentNode.evidenceIds.map((evidenceId) => (
                <li key={evidenceId}>
                  {onEvidenceSelect ? (
                    <button type="button" onClick={() => onEvidenceSelect(evidenceId)}>
                      {evidenceId}
                    </button>
                  ) : (
                    <code>{evidenceId}</code>
                  )}
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </article>

      {configurationError ? <p role="alert">{configurationError}</p> : null}

      <footer>
        <button type="button" onClick={goBack} disabled={history.length <= 1}>
          Previous step
        </button>
        <button type="button" onClick={restart} disabled={history.length <= 1 && !configurationError}>
          Start over
        </button>
      </footer>
    </section>
  );
}
