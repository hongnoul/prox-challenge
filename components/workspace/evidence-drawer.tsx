"use client";

import { useEffect, useRef, useState } from "react";
import { loadEvidence, type EvidenceResponse } from "@/lib/client/api";

type EvidenceDrawerProps = {
  evidenceId: string | null;
  onClose: () => void;
};

function authorityLabel(value: string): string {
  return value.replaceAll("-", " ");
}

export function EvidenceDrawer({ evidenceId, onClose }: EvidenceDrawerProps) {
  const [result, setResult] = useState<EvidenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!evidenceId) {
      setResult(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setResult(null);
    setError(null);
    loadEvidence(evidenceId, controller.signal)
      .then(setResult)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Could not load source evidence.");
        }
      });
    window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => controller.abort();
  }, [evidenceId]);

  useEffect(() => {
    if (!evidenceId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [evidenceId, onClose]);

  if (!evidenceId) return null;

  const { evidence, source } = result ?? {};
  const bounds = evidence?.bounds;

  return (
    <div
      className="evidence-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="evidence-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-title"
        aria-describedby="evidence-description"
      >
        <header className="evidence-header">
          <div>
            <p className="eyebrow">Evidence record · {evidenceId}</p>
            <h2 id="evidence-title">{evidence?.title ?? "Loading exact source…"}</h2>
          </div>
          <button ref={closeRef} type="button" className="icon-button" aria-label="Close evidence" onClick={onClose}>
            ×
          </button>
        </header>

        {error ? (
          <div className="evidence-error" role="alert">
            <strong>Source unavailable</strong>
            <p>{error}</p>
          </div>
        ) : null}

        {!result && !error ? <div className="evidence-loading" role="status">Retrieving verified source…</div> : null}

        {evidence ? (
          <div className="evidence-content">
            <div className="evidence-authority-row">
              <span className="authority-chip" data-authority={evidence.authority}>
                {authorityLabel(evidence.authority)}
              </span>
              {source ? (
                <span className="authority-chip" data-authority={source.authority}>
                  Source: {authorityLabel(source.authority)}
                </span>
              ) : null}
            </div>

            <figure className="evidence-figure">
              <div className="evidence-image-frame">
                {/* The route returns an immutable, source-bound public asset. */}
                <img src={evidence.publicAsset} alt={`${evidence.title}, exact source image`} />
                {bounds ? (
                  <span
                    className="evidence-bounds"
                    aria-label="Cited region"
                    style={{
                      left: `${bounds.x * 100}%`,
                      top: `${bounds.y * 100}%`,
                      width: `${bounds.width * 100}%`,
                      height: `${bounds.height * 100}%`,
                    }}
                  />
                ) : null}
              </div>
              <figcaption>
                {source?.title ?? "Verified source asset"}
                {evidence.pageLabel ? ` · page ${evidence.pageLabel}` : ""}
              </figcaption>
            </figure>

            <section className="evidence-transcript" aria-labelledby="evidence-transcript-title">
              <p className="eyebrow" id="evidence-transcript-title">Source detail</p>
              <p id="evidence-description">{evidence.excerpt ?? "This record is visual source evidence; no transcript replaces the image above."}</p>
            </section>

            <section className="evidence-supports" aria-labelledby="evidence-supports-title">
              <p className="eyebrow" id="evidence-supports-title">Supports</p>
              <ul>
                {evidence.supports.map((support) => <li key={support}>{support}</li>)}
              </ul>
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
