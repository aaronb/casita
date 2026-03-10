import path from "node:path";
import fs from "node:fs";
import readline from "node:readline";
import { findCasitaByName, removeCasita, getWorkspaceRoot, getCasitasDir } from "../docker.js";

interface RmOptions {
  force?: boolean;
  clean?: boolean;
}

export async function rmCommand(name: string, options: RmOptions) {
  const casita = await findCasitaByName(name);
  if (!casita) {
    console.error(`Casita "${name}" not found.`);
    process.exit(1);
  }

  if (!options.force) {
    const confirmed = await confirm(`Remove casita "${name}"? Container will be deleted.`);
    if (!confirmed) {
      console.log("Aborted.");
      return;
    }
  }

  await removeCasita(casita.containerId);
  console.log(`Removed casita "${name}".`);

  if (options.clean) {
    const workspaceRoot = getWorkspaceRoot();
    const casitaDir = path.join(getCasitasDir(workspaceRoot), name);
    if (fs.existsSync(casitaDir)) {
      fs.rmSync(casitaDir, { recursive: true, force: true });
      console.log(`Cleaned casita data: ${casitaDir}`);
    }
  }
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}
