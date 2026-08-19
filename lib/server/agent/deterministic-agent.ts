import type { ArtifactRequest } from "./types";
import type { SceneCommand } from "@/lib/shared/contracts";
import type { TwinState } from "@/lib/shared/contracts/twin-state";
import { calculatePublishedDutyCycle } from "@/lib/shared/domain";
import { productStore, type ProductStore } from "@/lib/server/product/store";

export type GroundedResponse = {
  text: string;
  evidenceIds: string[];
  factIds: string[];
  procedureId?: string;
  clarification?: { question: string; fields: string[] };
  sceneCommands: SceneCommand[];
  artifact?: ArtifactRequest;
};

const unique = <T>(values: T[]) => [...new Set(values)];

export function answerDeterministically(
  message: string,
  twinState: TwinState,
  store: ProductStore = productStore,
): GroundedResponse {
  const query = message.toLowerCase();

  if ((query.includes("setting") || query.includes("settings"))
    && (query.includes("1/8") || query.includes("steel"))) {
    const fields = ["process", "inputVoltage", "wireOrElectrode", "shieldingGas"]
      .filter((field) => {
        const value = twinState[field as keyof TwinState];
        return typeof value === "object" && value !== null && "value" in value && value.value === null;
      });
    return {
      text: "I need a little more machine context before recommending settings. The manual's selection chart remains available as the exact visual source.",
      evidenceIds: ["ev-selection-chart"],
      factIds: [],
      clarification: {
        question: "Which welding process, input voltage, wire or electrode, and shielding-gas setup are you using?",
        fields,
      },
      sceneCommands: [],
      artifact: { artifactType: "source-comparison", props: { evidenceId: "ev-selection-chart" } },
    };
  }

  if (query.includes("duty") || query.includes("200a") || query.includes("200 a")) {
    const result = calculatePublishedDutyCycle(store.productPackage.facts, {
      process: "mig",
      inputVoltage: 240,
      amperage: 200,
    });
    if (!result) throw new Error("Published duty-cycle case is missing from the product package");
    return {
      text: `At 240 V and 200 A, the published MIG duty cycle is ${result.dutyCyclePercent}%. In a ten-minute period, that is ${result.weldMinutes} minutes welding and ${result.restMinutes} minutes resting. This is a published rating, not an interpolation.`,
      evidenceIds: result.evidenceIds,
      factIds: ["fact-mig-240v-200a-duty", "fact-mig-240v-200a-work-time"],
      sceneCommands: [],
      artifact: { artifactType: "duty-cycle", props: result },
    };
  }

  if (query.includes("porosity") || query.includes("holes in") || query.includes("cavities")) {
    const fluxCore = query.includes("flux") || twinState.process.value === "flux-core";
    return {
      text: fluxCore
        ? "For self-shielded flux-core porosity, first verify DCEN polarity, then clean the workpiece and wire, maintain steady travel, and reduce excessive CTWD. The manual's shielding-gas checks are marked MIG only, so do not apply them to self-shielded flux-core."
        : "For wire-weld porosity, check polarity first. For gas-shielded MIG, also verify gas flow, gas type, and a clean nozzle. Then clean the workpiece and wire, maintain steady travel, and reduce excessive CTWD.",
      evidenceIds: unique(["ev-wire-porosity-p37", fluxCore ? "ev-flux-dcen-p13" : "ev-mig-dcep-p14"]),
      factIds: unique(["fact-wire-porosity-causes", fluxCore ? "fact-flux-dcen" : "fact-mig-dcep"]),
      sceneCommands: fluxCore
        ? [{ type: "highlight-part", entityId: "front-negative-socket", emphasis: "warning" }]
        : [{ type: "highlight-part", entityId: "front-positive-socket", emphasis: "warning" }],
      artifact: { artifactType: "troubleshooting", props: { pathId: "troubleshoot-wire-porosity", process: fluxCore ? "flux-core" : "mig" } },
    };
  }

  if (query.includes("selection chart") || query.includes("process chart")) {
    return {
      text: "Here is the source-exact welding process selection chart. It is visual-only source evidence, so I am showing the original rather than replacing it with generated prose.",
      evidenceIds: ["ev-selection-chart"],
      factIds: [],
      sceneCommands: [],
      artifact: { artifactType: "source-comparison", props: { evidenceId: "ev-selection-chart" } },
    };
  }

  if (query.includes("tig")) {
    const procedure = store.getProcedure("procedure-tig-setup");
    if (!procedure) throw new Error("TIG procedure is missing from the product package");
    return {
      text: "For the documented TIG setup, power off and unplug first. Connect the TIG torch to the negative socket and the ground clamp to the positive socket. Use 100% argon. The foot pedal is optional and sold separately.",
      evidenceIds: procedure.evidenceIds,
      factIds: ["fact-tig-connections", "fact-tig-argon", "fact-tig-foot-pedal-optional"],
      procedureId: procedure.id,
      sceneCommands: procedure.steps.flatMap(({ sceneCommands }) => sceneCommands),
      artifact: { artifactType: "polarity", props: { process: "tig", torch: "negative", ground: "positive" } },
    };
  }

  if (query.includes("flux") || query.includes("dcen")) {
    const procedure = store.getProcedure("procedure-flux-polarity");
    if (!procedure) throw new Error("Flux-core procedure is missing from the product package");
    return {
      text: "Self-shielded flux-core uses DCEN: connect the wire feed power cable to negative and the ground clamp to positive.",
      evidenceIds: procedure.evidenceIds,
      factIds: ["fact-flux-dcen"],
      procedureId: procedure.id,
      sceneCommands: procedure.steps.flatMap(({ sceneCommands }) => sceneCommands),
      artifact: { artifactType: "polarity", props: { process: "flux-core", wire: "negative", ground: "positive" } },
    };
  }

  if (query.includes("mig") || query.includes("dcep") || query.includes("solid wire")) {
    const procedure = store.getProcedure("procedure-mig-polarity");
    if (!procedure) throw new Error("MIG procedure is missing from the product package");
    return {
      text: "Gas-shielded solid-core MIG uses DCEP: connect the wire feed power cable to positive and the ground clamp to negative.",
      evidenceIds: procedure.evidenceIds,
      factIds: ["fact-mig-dcep"],
      procedureId: procedure.id,
      sceneCommands: procedure.steps.flatMap(({ sceneCommands }) => sceneCommands),
      artifact: { artifactType: "polarity", props: { process: "mig", wire: "positive", ground: "negative" } },
    };
  }

  const entity = store.productPackage.entities.find(({ id, name, aliases }) =>
    query.includes(id) || query.includes(name.toLowerCase()) || aliases.some((alias) => query.includes(alias.toLowerCase())),
  );
  if (entity) {
    return {
      text: `${entity.name}: ${entity.description}`,
      evidenceIds: entity.evidenceIds,
      factIds: [],
      sceneCommands: [{ type: "focus-part", entityId: entity.id }, { type: "highlight-part", entityId: entity.id }],
    };
  }

  const results = store.searchKnowledge(message, 3);
  if (results.length > 0) {
    return {
      text: results.map(({ title, summary }) => `${title}: ${summary}`).join("\n\n"),
      evidenceIds: unique(results.flatMap(({ evidenceIds }) => evidenceIds)),
      factIds: results.filter(({ kind }) => kind === "fact").map(({ id }) => id),
      sceneCommands: [],
    };
  }

  return {
    text: "I could not resolve that request to verified OmniPro source evidence. Try naming a process, control, connection, symptom, or source chart.",
    evidenceIds: [],
    factIds: [],
    sceneCommands: [],
  };
}

