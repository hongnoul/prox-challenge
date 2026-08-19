"use client";

import { useEffect, useId, useState } from "react";

export type EvidenceAuthority = "source-exact" | "verified-reconstruction" | "explanatory";

export interface NormalizedEvidenceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EvidenceSourceMetadata {
  id: string;
  title: string;
  path?: string;
  mediaType?: string;
  sha256?: string;
  pageCount?: number;
  authority: EvidenceAuthority;
}

export interface EvidenceViewerMetadata {
  id: string;
  sourceId: string;
  title: string;
  excerpt?: string;
  parserPageIndex?: number;
  pageLabel?: string;
  bounds?: NormalizedEvidenceBounds;
  publicAsset: string;
  assetSha256?: string;
  authority: EvidenceAuthority;
  supports?: readonly string[];
}

export interface EvidenceViewerProps {
  evidence: EvidenceViewerMetadata;
  source: EvidenceSourceMetadata;
  alt?: string;
  initiallyShowBounds?: boolean;
  className?: string;
}

export interface EvidenceAuthorityLabelProps {
  authority: EvidenceAuthority;
  prefix?: string;
}

export const EVIDENCE_AUTHORITY_DETAILS: Readonly<
  Record<EvidenceAuthority, { label: string; description: string }>
> = {
  "source-exact": {
    label: "Source",
    description: "Directly supported by the cited source.",
  },
  "verified-reconstruction": {
    label: "Verified",
    description: "Reconstructed and checked against source evidence.",
  },
  explanatory: {
    label: "Explanatory",
    description: "Added to explain the source and not presented as source-exact.",
  },
};

function percent(value: number) {
  return `${Math.round(value * 10_000) / 100}%`;
}

function pageReference(evidence: EvidenceViewerMetadata) {
  if (evidence.pageLabel) return `Page ${evidence.pageLabel}`;
  if (evidence.parserPageIndex !== undefined) return `Parsed page ${evidence.parserPageIndex + 1}`;
  return null;
}

export function EvidenceAuthorityLabel({ authority, prefix }: EvidenceAuthorityLabelProps) {
  const details = EVIDENCE_AUTHORITY_DETAILS[authority];
  return (
    <span className="evidence-authority" data-authority={authority} title={details.description}>
      {prefix ? `${prefix}: ` : null}
      <strong>{details.label}</strong>
      <span> · {details.description}</span>
    </span>
  );
}

export function EvidenceViewer({
  evidence,
  source,
  alt,
  initiallyShowBounds = true,
  className,
}: EvidenceViewerProps) {
  const headingId = useId();
  const imageRegionId = useId();
  const [showBounds, setShowBounds] = useState(initiallyShowBounds && Boolean(evidence.bounds));
  const classes = ["evidence-viewer", className].filter(Boolean).join(" ");
  const page = pageReference(evidence);
  const sourceMatches = source.id === evidence.sourceId;

  useEffect(() => {
    setShowBounds(initiallyShowBounds && Boolean(evidence.bounds));
  }, [evidence.id, evidence.bounds, initiallyShowBounds]);

  return (
    <article className={classes} aria-labelledby={headingId} data-authority={evidence.authority}>
      <header>
        <p>Evidence</p>
        <h2 id={headingId}>{evidence.title}</h2>
        <EvidenceAuthorityLabel authority={evidence.authority} prefix="Evidence authority" />
      </header>

      {!sourceMatches ? (
        <p role="alert">
          This evidence names source <code>{evidence.sourceId}</code>, but the viewer received <code>{source.id}</code>.
        </p>
      ) : null}

      <figure>
        <div
          id={imageRegionId}
          style={{ display: "inline-block", maxWidth: "100%", position: "relative" }}
        >
          <img
            src={evidence.publicAsset}
            alt={alt ?? `${evidence.title} from ${source.title}${page ? `, ${page}` : ""}`}
            style={{ display: "block", height: "auto", maxWidth: "100%" }}
          />
          {showBounds && evidence.bounds ? (
            <span
              className="evidence-bounds-overlay"
              aria-hidden="true"
              style={{
                background: "rgba(240, 90, 40, 0.16)",
                border: "3px solid #f05a28",
                boxSizing: "border-box",
                height: percent(evidence.bounds.height),
                left: percent(evidence.bounds.x),
                pointerEvents: "none",
                position: "absolute",
                top: percent(evidence.bounds.y),
                width: percent(evidence.bounds.width),
              }}
            />
          ) : null}
        </div>
        <figcaption>
          <cite>{source.title}</cite>
          {page ? ` · ${page}` : ""}
        </figcaption>
      </figure>

      {evidence.bounds ? (
        <div>
          <button
            type="button"
            aria-controls={imageRegionId}
            aria-pressed={showBounds}
            onClick={() => setShowBounds((visible) => !visible)}
          >
            {showBounds ? "Hide cited region" : "Show cited region"}
          </button>
          <output aria-live="polite">
            Cited region {showBounds ? "shown" : "hidden"}: left {percent(evidence.bounds.x)}, top {percent(evidence.bounds.y)}, width {percent(evidence.bounds.width)}, height {percent(evidence.bounds.height)}.
          </output>
        </div>
      ) : (
        <p>No bounded source region was supplied for this evidence.</p>
      )}

      {evidence.excerpt ? (
        <section aria-label="Source excerpt">
          <h3>Excerpt</h3>
          <blockquote>{evidence.excerpt}</blockquote>
        </section>
      ) : null}

      <dl>
        <dt>Source</dt>
        <dd>{source.title}</dd>
        <dt>Source authority</dt>
        <dd>
          <EvidenceAuthorityLabel authority={source.authority} />
        </dd>
        {page ? (
          <>
            <dt>Location</dt>
            <dd>{page}</dd>
          </>
        ) : null}
        {source.mediaType ? (
          <>
            <dt>Media type</dt>
            <dd>{source.mediaType}</dd>
          </>
        ) : null}
        {source.path ? (
          <>
            <dt>Source path</dt>
            <dd>
              <code>{source.path}</code>
            </dd>
          </>
        ) : null}
        <dt>Evidence ID</dt>
        <dd>
          <code>{evidence.id}</code>
        </dd>
      </dl>

      {evidence.supports && evidence.supports.length > 0 ? (
        <section aria-label="Claims supported by this evidence">
          <h3>Supports</h3>
          <ul>
            {evidence.supports.map((claim) => (
              <li key={claim}>{claim}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
