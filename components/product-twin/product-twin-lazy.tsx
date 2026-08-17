"use client";

import dynamic from "next/dynamic";

const ProductTwinViewer = dynamic(
  () => import("./product-twin-viewer").then((module) => module.ProductTwinViewer),
  {
    ssr: false,
    loading: () => (
      <div className="product-twin-loading" role="status">
        Loading the interactive reconstruction…
      </div>
    ),
  },
);

export function ProductTwinLazy() {
  return <ProductTwinViewer />;
}
