import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = join(projectRoot, ".next", "standalone");

function copyDirectory(source, destination) {
  if (!existsSync(source)) return;

  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true, force: true });
}

copyDirectory(
  join(projectRoot, ".next", "static"),
  join(standaloneRoot, ".next", "static"),
);
copyDirectory(join(projectRoot, "public"), join(standaloneRoot, "public"));

console.log("Prepared standalone static and public assets.");
