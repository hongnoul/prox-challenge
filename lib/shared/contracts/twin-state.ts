import { z } from "zod";
import { twinPatchSchema } from "./product";

export const twinValueSourceSchema = z.enum([
  "user-declared",
  "user-confirmed",
  "recommended",
  "simulated",
]);

const stateValue = <T extends z.ZodType>(value: T) => z.object({
  value: value.nullable(),
  source: twinValueSourceSchema.nullable(),
});

export const twinStateSchema = z.object({
  revision: z.number().int().nonnegative(),
  process: stateValue(z.enum(["mig", "flux-core", "tig", "stick"])),
  inputVoltage: stateValue(z.union([z.literal(120), z.literal(240)])),
  material: stateValue(z.string()),
  wireOrElectrode: stateValue(z.string()),
  shieldingGas: stateValue(z.string()),
  torchConnection: stateValue(z.enum(["positive", "negative"])),
  groundConnection: stateValue(z.enum(["positive", "negative"])),
  selectedEntityId: z.string().nullable(),
  activeProcedureId: z.string().nullable(),
  completedStepIds: z.array(z.string()),
});

export const twinPatchRequestSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  patch: twinPatchSchema,
  source: twinValueSourceSchema,
  confirmed: z.boolean().default(false),
});

const emptyValue = { value: null, source: null } as const;

export const createInitialTwinState = (): TwinState => ({
  revision: 0,
  process: { ...emptyValue },
  inputVoltage: { ...emptyValue },
  material: { ...emptyValue },
  wireOrElectrode: { ...emptyValue },
  shieldingGas: { ...emptyValue },
  torchConnection: { ...emptyValue },
  groundConnection: { ...emptyValue },
  selectedEntityId: null,
  activeProcedureId: null,
  completedStepIds: [],
});

export type TwinPatchRequest = z.infer<typeof twinPatchRequestSchema>;
export type TwinState = z.infer<typeof twinStateSchema>;
export type TwinValueSource = z.infer<typeof twinValueSourceSchema>;
