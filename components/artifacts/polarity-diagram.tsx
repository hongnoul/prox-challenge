"use client";

import { useId } from "react";

export type PolarityProcess = "tig" | "mig" | "flux-core";
export type TerminalPolarity = "positive" | "negative";

export interface PolarityConfiguration {
  process: PolarityProcess;
  processLabel: string;
  electrodeLabel: string;
  electrodeConnection: TerminalPolarity;
  groundConnection: TerminalPolarity;
}

export interface PolarityDiagramProps {
  process: PolarityProcess;
  electrodeConnection?: TerminalPolarity;
  groundConnection?: TerminalPolarity;
  electrodeLabel?: string;
  evidenceId?: string;
  className?: string;
}

export const POLARITY_CONFIGURATIONS: Readonly<Record<PolarityProcess, PolarityConfiguration>> = {
  tig: {
    process: "tig",
    processLabel: "TIG",
    electrodeLabel: "TIG torch",
    electrodeConnection: "negative",
    groundConnection: "positive",
  },
  mig: {
    process: "mig",
    processLabel: "Gas-shielded MIG",
    electrodeLabel: "Wire feed",
    electrodeConnection: "positive",
    groundConnection: "negative",
  },
  "flux-core": {
    process: "flux-core",
    processLabel: "Self-shielded flux-core",
    electrodeLabel: "Wire feed",
    electrodeConnection: "negative",
    groundConnection: "positive",
  },
};

function terminalSymbol(polarity: TerminalPolarity) {
  return polarity === "positive" ? "+" : "−";
}

function terminalName(polarity: TerminalPolarity) {
  return polarity === "positive" ? "Positive (+)" : "Negative (−)";
}

export function PolarityDiagram({
  process,
  electrodeConnection,
  groundConnection,
  electrodeLabel,
  evidenceId,
  className,
}: PolarityDiagramProps) {
  const titleId = useId();
  const descriptionId = useId();
  const defaults = POLARITY_CONFIGURATIONS[process];
  const electrode = electrodeConnection ?? defaults.electrodeConnection;
  const ground = groundConnection ?? defaults.groundConnection;
  const leadLabel = electrodeLabel ?? defaults.electrodeLabel;
  const currentType = electrode === "negative" ? "DCEN" : "DCEP";
  const hasConflict = electrode === ground;
  const classes = ["polarity-diagram", className].filter(Boolean).join(" ");
  const electrodeTerminalY = electrode === "positive" ? 78 : 162;
  const groundTerminalY = ground === "positive" ? 78 : 162;

  return (
    <figure className={classes} data-process={process}>
      <svg
        viewBox="0 0 640 240"
        width="100%"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{`${defaults.processLabel} polarity diagram`}</title>
        <desc id={descriptionId}>
          {`${leadLabel} connects to the ${electrode} terminal. Ground clamp connects to the ${ground} terminal.`}
        </desc>

        <rect x="245" y="28" width="150" height="184" rx="12" fill="none" stroke="currentColor" strokeWidth="3" />
        <text x="320" y="54" textAnchor="middle" fill="currentColor" fontSize="16">
          Welder
        </text>

        <circle cx="270" cy="78" r="19" fill="none" stroke="currentColor" strokeWidth="3" />
        <text x="270" y="85" textAnchor="middle" fill="currentColor" fontSize="25" aria-hidden="true">
          +
        </text>
        <circle cx="270" cy="162" r="19" fill="none" stroke="currentColor" strokeWidth="3" />
        <text x="270" y="169" textAnchor="middle" fill="currentColor" fontSize="25" aria-hidden="true">
          −
        </text>

        <rect x="18" y="88" width="154" height="64" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="95" y="115" textAnchor="middle" fill="currentColor" fontSize="15">
          {leadLabel}
        </text>
        <text x="95" y="136" textAnchor="middle" fill="currentColor" fontSize="14">
          {terminalSymbol(electrode)} terminal
        </text>
        <path
          d={`M 172 120 C 210 120, 220 ${electrodeTerminalY}, 251 ${electrodeTerminalY}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />

        <rect x="468" y="88" width="154" height="64" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="545" y="115" textAnchor="middle" fill="currentColor" fontSize="15">
          Ground clamp
        </text>
        <text x="545" y="136" textAnchor="middle" fill="currentColor" fontSize="14">
          {terminalSymbol(ground)} terminal
        </text>
        <path
          d={`M 468 120 C 430 120, 420 ${groundTerminalY}, 289 ${groundTerminalY}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />
      </svg>

      <figcaption>
        <strong>{defaults.processLabel}</strong>: {currentType}, with {leadLabel.toLowerCase()} on {terminalName(electrode)} and ground clamp on {terminalName(ground)}.
      </figcaption>

      <dl>
        <dt>Electrode lead</dt>
        <dd>{terminalName(electrode)}</dd>
        <dt>Ground clamp</dt>
        <dd>{terminalName(ground)}</dd>
        <dt>Polarity</dt>
        <dd>{currentType}</dd>
      </dl>

      {hasConflict ? (
        <p role="alert">
          <strong>Review this configuration:</strong> both leads cannot occupy the same terminal.
        </p>
      ) : null}

      {evidenceId ? (
        <p>
          Evidence reference: <code>{evidenceId}</code>
        </p>
      ) : null}
    </figure>
  );
}
