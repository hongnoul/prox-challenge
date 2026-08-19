import type { EntityResponse } from "@/lib/client/api";

type EntityInspectorProps = {
  entityId: string | null;
  result: EntityResponse | null;
  loading: boolean;
  error: string | null;
  onOpenEvidence: (evidenceId: string) => void;
};

export function EntityInspector({
  entityId,
  result,
  loading,
  error,
  onOpenEvidence,
}: EntityInspectorProps) {
  if (!entityId) return null;

  return (
    <section className="entity-card" aria-labelledby="selected-entity-title" aria-busy={loading}>
      <p className="eyebrow">Click to explain</p>
      {loading ? <p className="entity-status" role="status">Loading documented part…</p> : null}
      {error ? <p className="entity-status" role="alert">{error}</p> : null}
      {result ? (
        <>
          <div className="entity-card-heading">
            <div>
              <h2 id="selected-entity-title">{result.entity.name}</h2>
              <span>{result.entity.category}</span>
            </div>
          </div>
          <div className="entity-purpose">
            <span>Purpose</span>
            <p>{result.entity.description}</p>
          </div>
          {result.facts.length > 0 ? (
            <div className="entity-facts">
              <span>Linked facts</span>
              <ul>
                {result.facts.map((fact) => <li key={fact.id}>{fact.statement}</li>)}
              </ul>
            </div>
          ) : (
            <p className="entity-no-facts">No additional verified facts are linked to this part.</p>
          )}
          <div className="entity-evidence" aria-label="Part evidence">
            {result.evidence.map((evidence) => (
              <button key={evidence.id} type="button" onClick={() => onOpenEvidence(evidence.id)}>
                <span aria-hidden="true">↗</span>
                <span>{evidence.title}</span>
                <small>{evidence.authority.replaceAll("-", " ")}</small>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
