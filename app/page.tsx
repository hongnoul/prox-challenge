import { IntentBubbles } from "@/components/chat/intent-bubbles";
import { ProductTwinLazy } from "@/components/product-twin/product-twin-lazy";

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="onboarding-shell" aria-label="Choose how OmniPro support can help">
        <IntentBubbles />
      </section>

      <section className="product-twin-section" aria-labelledby="product-twin-heading">
        <header className="product-twin-heading">
          <div>
            <p className="machine-label">Evidence-bound front model</p>
            <h2 id="product-twin-heading">Meet the machine before you touch it.</h2>
          </div>
          <div className="product-twin-copy">
            <p>
              Explore the controls and connections named in the owner’s manual, then inspect
              what the supplied evidence does and does not support.
            </p>
            <p className="fidelity-claim">
              Source-faithful instructional reconstruction, not an exact digital twin.
            </p>
          </div>
        </header>

        <ProductTwinLazy />

        <footer className="product-twin-footnote">
          <span>13 documented front-panel parts</span>
          <span>Manual pages 8, 14, and 16</span>
          <span>Geometry and dimensions remain inferred</span>
        </footer>
      </section>
    </main>
  );
}
