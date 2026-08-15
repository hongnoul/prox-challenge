import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

type Intent = "weld" | "troubleshoot" | "learn";

type IntentOption = {
  id: Intent;
  label: string;
  response: string;
};

const intents: IntentOption[] = [
  {
    id: "weld",
    label: "Weld or repair something",
    response: "Start with a photo or a short description of the job.",
  },
  {
    id: "troubleshoot",
    label: "Troubleshoot a problem",
    response: "Show the weld, the setup, or the part of the welder giving you trouble.",
  },
  {
    id: "learn",
    label: "Learn the OmniPro",
    response: "Explore setup, controls, welding processes, and safety at your pace.",
  },
];

export default function IntentBubbles() {
  const [selected, setSelected] = useState<Intent | null>(null);
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const labelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const responseRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const pills = pillRefs.current.filter(Boolean) as HTMLButtonElement[];
    const labels = labelRefs.current.filter(Boolean) as HTMLSpanElement[];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      gsap.set([...pills, ...labels], { autoAlpha: 1, scale: 1, y: 0 });
      return;
    }

    const context = gsap.context(() => {
      gsap.set(pills, {
        autoAlpha: 0,
        scale: 0,
        transformOrigin: "50% 50%",
      });
      gsap.set(labels, { autoAlpha: 0, y: 16 });

      pills.forEach((pill, index) => {
        const delay = index * 0.1 + gsap.utils.random(-0.04, 0.04);
        const timeline = gsap.timeline({ delay });

        timeline.to(pill, {
          autoAlpha: 1,
          scale: 1,
          duration: 0.5,
          ease: "back.out(1.5)",
        });
        timeline.to(
          labels[index],
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            ease: "power3.out",
          },
          "-=0.42",
        );
      });
    });

    return () => context.revert();
  }, []);

  useEffect(() => {
    if (!responseRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.fromTo(
      responseRef.current,
      { autoAlpha: 0, y: 6 },
      { autoAlpha: 1, y: 0, duration: 0.32, ease: "power2.out" },
    );
  }, [selected]);

  const activeIntent = intents.find((intent) => intent.id === selected);

  return (
    <section className="intent-picker" aria-labelledby="intent-heading">
      <p className="machine-label">Vulcan · OmniPro 220</p>
      <h1 id="intent-heading">What brings you to the welder today?</h1>

      <div className="intent-row" aria-label="Choose how you want help">
        <span className="intent-leading">I want to</span>
        {intents.map((intent, index) => {
          const isSelected = selected === intent.id;

          return (
            <button
              key={intent.id}
              ref={(element) => {
                pillRefs.current[index] = element;
              }}
              type="button"
              className="intent-pill"
              aria-pressed={isSelected}
              data-selected={isSelected || undefined}
              onClick={() => setSelected(intent.id)}
              style={{ opacity: 0 }}
            >
              <span
                ref={(element) => {
                  labelRefs.current[index] = element;
                }}
              >
                {intent.label}
              </span>
            </button>
          );
        })}
      </div>

      <p ref={responseRef} className="intent-response" aria-live="polite">
        {activeIntent?.response ?? "Choose the closest starting point. You can change direction at any time."}
      </p>
    </section>
  );
}
