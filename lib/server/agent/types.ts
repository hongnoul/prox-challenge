import type { z } from "zod";
import { artifactRequestSchema } from "@/lib/shared/contracts";

export type ArtifactRequest = z.infer<typeof artifactRequestSchema>;
