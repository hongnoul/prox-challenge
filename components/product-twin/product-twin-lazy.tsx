"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ProductTwinViewerProps } from "./product-twin-viewer";

function ProductTwinPlaceholder() {
  return (
    <div className="product-twin-loading" role="status">
      Loading the interactive reconstruction…
    </div>
  );
}

const ProductTwinViewer = dynamic(
  () => import("./product-twin-viewer").then((module) => module.ProductTwinViewer),
  {
    ssr: false,
    loading: ProductTwinPlaceholder,
  },
);

export function ProductTwinLazy(props: ProductTwinViewerProps) {
  const boundaryRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary) return;
    const observedBoundary: HTMLDivElement = boundary;

    let observer: IntersectionObserver | undefined;
    let activated = false;

    const cleanup = () => {
      observer?.disconnect();
      window.removeEventListener("scroll", loadWhenNearViewport);
      window.removeEventListener("resize", loadWhenNearViewport);
    };

    const activate = () => {
      if (activated) return;
      activated = true;
      cleanup();
      setShouldLoad(true);
    };

    function loadWhenNearViewport() {
      const bounds = observedBoundary.getBoundingClientRect();
      if (bounds.top <= window.innerHeight + 320 && bounds.bottom >= -320) activate();
    }

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) activate();
        },
        { rootMargin: "320px 0px" },
      );
      observer.observe(observedBoundary);
    }

    window.addEventListener("scroll", loadWhenNearViewport, { passive: true });
    window.addEventListener("resize", loadWhenNearViewport);
    loadWhenNearViewport();

    return cleanup;
  }, []);

  return (
    <div ref={boundaryRef}>
      {shouldLoad ? <ProductTwinViewer {...props} /> : <ProductTwinPlaceholder />}
    </div>
  );
}
