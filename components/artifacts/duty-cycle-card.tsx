"use client";

export type DutyCycleRating =
  | {
      status: "published";
      inputVoltage: number;
      amperage: number;
      dutyCyclePercent: number;
      periodMinutes?: number;
      process?: string;
      evidenceId?: string;
    }
  | {
      status: "unsupported";
      inputVoltage?: number;
      amperage?: number;
      process?: string;
      reason?: string;
      evidenceId?: string;
    };

export interface DutyCycleCardProps {
  rating: DutyCycleRating;
  title?: string;
  className?: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

export function DutyCycleCard({
  rating,
  title = "Duty-cycle rating",
  className,
}: DutyCycleCardProps) {
  const classes = ["duty-cycle-card", className].filter(Boolean).join(" ");

  if (rating.status === "unsupported") {
    return (
      <article className={classes} data-rating-status="unsupported">
        <header>
          <p>Duty cycle</p>
          <h2>{title}</h2>
          <p role="status">
            <strong>Unsupported combination</strong>
          </p>
        </header>

        <p>
          {rating.reason ??
            "No published duty-cycle rating is available for this combination. Do not interpolate a value from another voltage or amperage."}
        </p>

        <dl>
          {rating.process ? (
            <>
              <dt>Process</dt>
              <dd>{rating.process}</dd>
            </>
          ) : null}
          {rating.inputVoltage !== undefined ? (
            <>
              <dt>Input voltage</dt>
              <dd>{formatNumber(rating.inputVoltage)} V</dd>
            </>
          ) : null}
          {rating.amperage !== undefined ? (
            <>
              <dt>Output current</dt>
              <dd>{formatNumber(rating.amperage)} A</dd>
            </>
          ) : null}
        </dl>

        {rating.evidenceId ? (
          <p>
            Evidence reference: <code>{rating.evidenceId}</code>
          </p>
        ) : null}
      </article>
    );
  }

  const periodMinutes = rating.periodMinutes ?? 10;
  const weldMinutes = periodMinutes * (rating.dutyCyclePercent / 100);
  const restMinutes = periodMinutes - weldMinutes;

  return (
    <article className={classes} data-rating-status="published">
      <header>
        <p>Duty cycle</p>
        <h2>{title}</h2>
        <p role="status">
          <strong>Published rating</strong>
        </p>
      </header>

      <p>
        <strong>{formatNumber(rating.dutyCyclePercent)}%</strong> at{" "}
        {formatNumber(rating.amperage)} A on {formatNumber(rating.inputVoltage)} V input
      </p>

      <meter
        min={0}
        max={periodMinutes}
        value={weldMinutes}
        aria-label={`${formatNumber(weldMinutes)} minutes welding in a ${formatNumber(periodMinutes)} minute period`}
      >
        {formatNumber(weldMinutes)} of {formatNumber(periodMinutes)} minutes welding
      </meter>

      <dl>
        {rating.process ? (
          <>
            <dt>Process</dt>
            <dd>{rating.process}</dd>
          </>
        ) : null}
        <dt>Weld time</dt>
        <dd>{formatNumber(weldMinutes)} min</dd>
        <dt>Required rest time</dt>
        <dd>{formatNumber(restMinutes)} min</dd>
        <dt>Rating period</dt>
        <dd>{formatNumber(periodMinutes)} min</dd>
      </dl>

      <p>This is a published operating point, not a continuous-output claim.</p>

      {rating.evidenceId ? (
        <p>
          Evidence reference: <code>{rating.evidenceId}</code>
        </p>
      ) : null}
    </article>
  );
}
