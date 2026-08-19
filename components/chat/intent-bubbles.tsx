"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export type IntentId = "explore" | "guide" | "diagnose";

type IntentOption = {
  id: IntentId;
  label: string;
  response: string;
};

export const intentOptions: IntentOption[] = [
  {
    id: "explore",
    label: "Explore the machine",
    response: "Inspect controls, connections, and the exact evidence behind each part.",
  },
  {
    id: "guide",
    label: "Guide me through a job",
    response: "Start with the job, material, process, or connection you need to set up.",
  },
  {
    id: "diagnose",
    label: "Diagnose a problem",
    response: "Show the weld, the setup, or the part of the machine causing trouble.",
  },
];

type IntentBubblesProps = {
  onSelectIntent?: (intent: IntentId) => void;
};

export function IntentBubbles({ onSelectIntent }: IntentBubblesProps = {}) {
  const [selectedIntent, setSelectedIntent] = useState<IntentId | null>(null);
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

    // Background tabs and headless assistive browsers may throttle GSAP's
    // animation frame. Never let an entrance animation hide real controls.
    const revealFallback = window.setTimeout(() => {
      gsap.set([...pills, ...labels], { autoAlpha: 1, scale: 1, y: 0 });
    }, 1_500);

    return () => {
      window.clearTimeout(revealFallback);
      context.revert();
    };
  }, []);

  useEffect(() => {
    const response = responseRef.current;
    if (!response || !selectedIntent) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.fromTo(
      response,
      { autoAlpha: 0, y: 6 },
      { autoAlpha: 1, y: 0, duration: 0.32, ease: "power2.out" },
    );
  }, [selectedIntent]);

  const activeIntent = intentOptions.find((intent) => intent.id === selectedIntent);

  return (
    <section className="intent-picker" aria-labelledby="intent-heading">
      <p className="machine-label">OmniPro 220 · Product Twin</p>
      <h1 id="intent-heading">What brings you to the welder today?</h1>

      <div className="intent-row" aria-label="Choose how you want help">
        <span className="intent-leading">I want to</span>
        {intentOptions.map((intent, index) => {
          const isSelected = selectedIntent === intent.id;

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
              onClick={() => {
                setSelectedIntent(intent.id);
                onSelectIntent?.(intent.id);
              }}
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
        {activeIntent?.response ??
          "Choose the closest starting point. You can change direction at any time."}
      </p>
    </section>
  );
}
