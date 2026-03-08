import path from "node:path";
import fs from "node:fs";
import readline from "node:readline";
import { findSandboxByName, removeSandbox, getWorkspaceRoot, getSandboxesDir } from "../docker.js";

interface RmOptions {
  force?: boolean;
  clean?: boolean;
}

export async function rmCommand(name: string, options: RmOptions) {
  const sandbox = await findSandboxByName(name);
  if (!sandbox) {
    console.error(`Sandbox "${name}" not found.`);
    process.exit(1);
  }

  if (!options.force) {
    const confirmed = await confirm(`Remove sandbox "${name}"? Container will be deleted.`);
    if (!confirmed) {
      console.log("Aborted.");
      return;
    }
  }

  await removeSandbox(sandbox.containerId);
  console.log(`Removed sandbox "${name}".`);

  if (options.clean) {
    const workspaceRoot = getWorkspaceRoot();
    const sandboxDir = path.join(getSandboxesDir(workspaceRoot), name);
    if (fs.existsSync(sandboxDir)) {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
      console.log(`Cleaned sandbox data: ${sandboxDir}`);
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
