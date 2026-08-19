import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { productPackageSchema, type ProductPackage, type SceneCommand } from "../lib/shared/contracts/product";
import { productPackageSource } from "../products/omnipro-220/product-src/product-source";

const projectRoot = process.cwd();
const outputDirectory = join(projectRoot, "products/omnipro-220/product-dist/v1");
const packagePath = join(outputDirectory, "package.json");
const manifestPath = join(outputDirectory, "package-manifest.json");
const generateAssets = process.argv.includes("--assets");
const checkOnly = process.argv.includes("--check");

const sha256 = (content: Buffer | string) => createHash("sha256").update(content).digest("hex");
const fileSha256 = async (path: string) => sha256(await readFile(path));

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { cwd: projectRoot, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  }
}

async function materializeAsset(
  asset: (typeof productPackageSource.evidence)[number]["asset"],
  destination: string,
  temporaryDirectory: string,
) {
  await mkdir(dirname(destination), { recursive: true });
  if (asset.kind === "copy") {
    await copyFile(join(projectRoot, asset.sourcePath), destination);
    return;
  }

  const basename = join(temporaryDirectory, `page-${asset.page}`);
  run("pdftoppm", [
    "-f",
    String(asset.page),
    "-l",
    String(asset.page),
    "-singlefile",
    "-scale-to",
    "1600",
    "-png",
    join(projectRoot, asset.sourcePath),
    basename,
  ]);
  run("magick", [`${basename}.png`, "-quality", "84", destination]);
}

function assertReferences(productPackage: ProductPackage) {
  const uniqueIds = (label: string, ids: string[]) => {
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) throw new Error(`${label} contains duplicate ids: ${[...new Set(duplicates)].join(", ")}`);
  };
  const assertKnown = (label: string, ids: string[], known: Set<string>) => {
    const missing = ids.filter((id) => !known.has(id));
    if (missing.length > 0) throw new Error(`${label} references unknown ids: ${missing.join(", ")}`);
  };

  uniqueIds("sources", productPackage.sources.map(({ id }) => id));
  uniqueIds("evidence", productPackage.evidence.map(({ id }) => id));
  uniqueIds("entities", productPackage.entities.map(({ id }) => id));
  uniqueIds("facts", productPackage.facts.map(({ id }) => id));
  uniqueIds("procedures", productPackage.procedures.map(({ id }) => id));
  uniqueIds("scene bindings", productPackage.sceneBindings.map(({ id }) => id));
  uniqueIds("acceptance cases", productPackage.acceptanceCases.map(({ id }) => id));

  const sourceIds = new Set(productPackage.sources.map(({ id }) => id));
  const evidenceIds = new Set(productPackage.evidence.map(({ id }) => id));
  const entityIds = new Set(productPackage.entities.map(({ id }) => id));
  const factIds = new Set(productPackage.facts.map(({ id }) => id));
  const procedureIds = new Set(productPackage.procedures.map(({ id }) => id));
  const sceneBindingIds = new Set(productPackage.sceneBindings.map(({ id }) => id));

  productPackage.evidence.forEach((evidence) => assertKnown(`evidence ${evidence.id}`, [evidence.sourceId], sourceIds));
  productPackage.entities.forEach((entity) => {
    assertKnown(`entity ${entity.id}`, entity.evidenceIds, evidenceIds);
    if (entity.sceneBindingId) assertKnown(`entity ${entity.id}`, [entity.sceneBindingId], sceneBindingIds);
  });
  productPackage.facts.forEach((fact) => {
    assertKnown(`fact ${fact.id}`, fact.evidenceIds, evidenceIds);
    assertKnown(`fact ${fact.id}`, fact.entityIds, entityIds);
  });
  productPackage.sceneBindings.forEach((binding) => {
    assertKnown(`scene binding ${binding.id}`, [binding.entityId], entityIds);
    assertKnown(`scene binding ${binding.id}`, binding.evidenceIds, evidenceIds);
  });

  const commandEntityIds = (command: SceneCommand) => {
    if (command.type === "reset-scene") return [];
    if (command.type === "animate-connection") return [command.fromEntityId, command.toEntityId];
    return [command.entityId];
  };
  productPackage.procedures.forEach((procedure) => {
    assertKnown(`procedure ${procedure.id}`, procedure.evidenceIds, evidenceIds);
    procedure.steps.forEach((step) => {
      assertKnown(`procedure step ${step.id}`, step.evidenceIds, evidenceIds);
      assertKnown(`procedure step ${step.id}`, step.sceneCommands.flatMap(commandEntityIds), entityIds);
    });
  });

  productPackage.troubleshootingPaths.forEach((path) => {
    const nodeIds = new Set(path.nodes.map(({ id }) => id));
    assertKnown(`troubleshooting path ${path.id}`, [path.startNodeId], nodeIds);
    path.nodes.forEach((node) => {
      assertKnown(`troubleshooting node ${node.id}`, node.evidenceIds, evidenceIds);
      assertKnown(`troubleshooting node ${node.id}`, Object.values(node.next), nodeIds);
    });
  });

  productPackage.acceptanceCases.forEach((testCase) => {
    assertKnown(`acceptance case ${testCase.id}`, testCase.expectedEvidenceIds, evidenceIds);
    assertKnown(`acceptance case ${testCase.id}`, testCase.expectedFactIds, factIds);
    if (testCase.expectedProcedureId) assertKnown(`acceptance case ${testCase.id}`, [testCase.expectedProcedureId], procedureIds);
  });
}

async function compile() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "omnipro-product-"));
  try {
    const sources = await Promise.all(productPackageSource.sources.map(async (source) => ({
      ...source,
      sha256: await fileSha256(join(projectRoot, source.path)),
    })));

    const evidence = [];
    for (const sourceEvidence of productPackageSource.evidence) {
      const { asset, ...metadata } = sourceEvidence;
      const destination = join(projectRoot, "public", metadata.publicAsset.slice(1));
      if (generateAssets) await materializeAsset(asset, destination, temporaryDirectory);
      if (!existsSync(destination)) {
        throw new Error(`Missing published evidence asset ${metadata.publicAsset}. Run npm run product:compile.`);
      }
      evidence.push({ ...metadata, assetSha256: await fileSha256(destination) });
    }

    const productPackage = productPackageSchema.parse({ ...productPackageSource, sources, evidence });
    assertReferences(productPackage);

    const serializedPackage = `${JSON.stringify(productPackage, null, 2)}\n`;
    const manifest = {
      schemaVersion: 1,
      packageVersion: productPackage.packageVersion,
      packageSha256: sha256(serializedPackage),
      sourceHashes: Object.fromEntries(productPackage.sources.map((source) => [source.id, source.sha256])),
      assetHashes: Object.fromEntries(productPackage.evidence.map((item) => [item.id, item.assetSha256])),
    };
    const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;

    if (checkOnly) {
      const [existingPackage, existingManifest] = await Promise.all([
        readFile(packagePath, "utf8"),
        readFile(manifestPath, "utf8"),
      ]);
      if (existingPackage !== serializedPackage || existingManifest !== serializedManifest) {
        throw new Error("Compiled product package is stale. Run npm run product:compile and commit the results.");
      }
    } else {
      await mkdir(outputDirectory, { recursive: true });
      await Promise.all([
        writeFile(packagePath, serializedPackage),
        writeFile(manifestPath, serializedManifest),
      ]);
    }

    console.log(`OmniPro package ${productPackage.packageVersion}: ${productPackage.sources.length} sources, ${productPackage.evidence.length} evidence regions, ${productPackage.facts.length} verified facts, ${productPackage.acceptanceCases.length} acceptance cases.`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

compile().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
