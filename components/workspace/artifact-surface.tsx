import type { ReactNode } from "react";

export type WorkspaceArtifact = {
  id: string;
  artifactType: "duty-cycle" | "polarity" | "troubleshooting" | "source-comparison";
  props: Record<string, unknown>;
};

type ArtifactSurfaceProps = {
  artifact: WorkspaceArtifact;
  onDismiss: (id: string) => void;
  onOpenEvidence: (evidenceId: string) => void;
};

const titleByType: Record<WorkspaceArtifact["artifactType"], string> = {
  "duty-cycle": "Published duty cycle",
  polarity: "Connection polarity",
  troubleshooting: "Diagnostic path",
  "source-comparison": "Source comparison",
};

function textProp(props: Record<string, unknown>, key: string): string | null {
  const value = props[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="artifact-stat">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function DutyCycleArtifact({ props }: { props: Record<string, unknown> }) {
  const duty = Number(props.dutyCyclePercent ?? 0);
  const weld = textProp(props, "weldMinutes") ?? "—";
  const rest = textProp(props, "restMinutes") ?? "—";
  const amperage = textProp(props, "amperage");
  const safeDuty = Number.isFinite(duty) ? Math.min(100, Math.max(0, duty)) : 0;

  return (
    <>
      <div className="duty-cycle-ring" style={{ "--duty": `${safeDuty}%` } as React.CSSProperties}>
        <strong>{safeDuty}%</strong>
        <span>of 10 min</span>
      </div>
      <dl className="artifact-stats">
        {amperage ? <Stat label="Output">{amperage} A</Stat> : null}
        <Stat label="Weld">{weld} min</Stat>
        <Stat label="Rest">{rest} min</Stat>
      </dl>
      <p className="artifact-note">Published operating point. No interpolation is applied.</p>
    </>
  );
}

function PolarityArtifact({ props }: { props: Record<string, unknown> }) {
  const process = textProp(props, "process") ?? "Documented process";
  const electrode = textProp(props, "wire") ?? textProp(props, "torch") ?? "—";
  const ground = textProp(props, "ground") ?? "—";

  return (
    <>
      <p className="artifact-kicker">{process.replaceAll("-", " ")}</p>
      <div className="polarity-diagram" aria-label={`${process} polarity: electrode ${electrode}, ground ${ground}`}>
        <div><span>Electrode path</span><strong>{electrode}</strong></div>
        <i aria-hidden="true" />
        <div><span>Ground clamp</span><strong>{ground}</strong></div>
      </div>
      <p className="artifact-note">Verify the process before moving either lead.</p>
    </>
  );
}

function TroubleshootingArtifact({ props }: { props: Record<string, unknown> }) {
  const process = textProp(props, "process") ?? "wire welding";
  const path = textProp(props, "pathId") ?? "documented path";
  return (
    <div className="diagnostic-path">
      <p><span>Context</span><strong>{process.replaceAll("-", " ")}</strong></p>
      <div aria-hidden="true" />
      <p><span>Evidence path</span><strong>{path.replace(/^troubleshoot-/, "").replaceAll("-", " ")}</strong></p>
      <small>Continue in chat so each check can be confirmed before the next one.</small>
    </div>
  );
}

function SourceComparisonArtifact({
  props,
  onOpenEvidence,
}: {
  props: Record<string, unknown>;
  onOpenEvidence: (evidenceId: string) => void;
}) {
  const evidenceId = textProp(props, "evidenceId");
  return (
    <div className="source-comparison">
      <div>
        <span className="authority-chip" data-authority="source-exact">Source exact</span>
        <strong>Original page region</strong>
        <p>Unmodified product documentation and its recorded bounds.</p>
      </div>
      <div>
        <span className="authority-chip" data-authority="explanatory">Explanation</span>
        <strong>Agent guidance</strong>
        <p>Interpretation stays separate from the authoritative source.</p>
      </div>
      {evidenceId ? (
        <button type="button" className="text-button" onClick={() => onOpenEvidence(evidenceId)}>
          Inspect exact source
        </button>
      ) : null}
    </div>
  );
}

export function ArtifactSurface({ artifact, onDismiss, onOpenEvidence }: ArtifactSurfaceProps) {
  return (
    <article className="artifact-card" aria-labelledby={`artifact-${artifact.id}`}>
      <header>
        <div>
          <p className="eyebrow">Working artifact</p>
          <h3 id={`artifact-${artifact.id}`}>{titleByType[artifact.artifactType]}</h3>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={`Close ${titleByType[artifact.artifactType]}`}
          onClick={() => onDismiss(artifact.id)}
        >
          ×
        </button>
      </header>
      <div className="artifact-body">
        {artifact.artifactType === "duty-cycle" ? <DutyCycleArtifact props={artifact.props} /> : null}
        {artifact.artifactType === "polarity" ? <PolarityArtifact props={artifact.props} /> : null}
        {artifact.artifactType === "troubleshooting" ? <TroubleshootingArtifact props={artifact.props} /> : null}
        {artifact.artifactType === "source-comparison" ? (
          <SourceComparisonArtifact props={artifact.props} onOpenEvidence={onOpenEvidence} />
        ) : null}
      </div>
    </article>
  );
}
