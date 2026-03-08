import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { generateName } from "../names.js";
import {
  CONTAINER_PREFIX,
  LABEL_PREFIX,
  findSandboxByName,
  findSandboxByWorkspace,
} from "../docker.js";

interface RunOptions {
  port?: string;
  image?: string;
}

// Shared config directory in user's home, mounted into all sandboxes.
function getSharedConfigDir(): string {
  const dir = path.join(os.homedir(), ".claude-sandbox");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function runCommand(name: string | undefined, claudeArgs: string[], options: RunOptions) {
  // Look up existing sandbox
  const existing = name
    ? await findSandboxByName(name)
    : await findSandboxByWorkspace(process.cwd());

  if (existing) {
    if (existing.state === "running") {
      console.log(`Sandbox: ${existing.name} (running, attaching shell)`);
      console.log();
      await execa("docker", ["exec", "-it", `${CONTAINER_PREFIX}-${existing.name}`, "bash"], {
        stdio: "inherit",
      });
      return;
    }

    // Stopped — restart
    console.log(`Sandbox: ${existing.name} (resuming)`);
    console.log(`Use "sandbox browser ${existing.name}" to open noVNC`);
    console.log();
    try {
      await execa("docker", ["start", "-ai", `${CONTAINER_PREFIX}-${existing.name}`], {
        stdio: "inherit",
      });
    } catch (err: any) {
      if (err.stderr && /port.*already|address already in use/i.test(err.stderr)) {
        console.error(`\nError: Port conflict when restarting sandbox. Remove and recreate it:`);
        console.error(`  sandbox rm ${existing.name}`);
        console.error(`  sandbox run`);
        process.exit(1);
      }
      throw err;
    }
    return;
  }

  // Create new sandbox
  const sandboxName = name || await generateUniqueName();
  const containerName = `${CONTAINER_PREFIX}-${sandboxName}`;
  const image = options.image || "agent-sandbox";

  const projectRoot = path.resolve(import.meta.dirname, "../..");
  const sandboxesDir = path.resolve(projectRoot, "..", ".sandboxes");
  const homeDir = path.resolve(sandboxesDir, sandboxName, "home");
  fs.mkdirSync(path.join(homeDir, ".claude"), { recursive: true });

  const sharedConfigDir = getSharedConfigDir();

  const workspace = process.cwd();
  const portMapping = options.port ? `${options.port}:6080` : "6080";

  console.log(`Sandbox: ${sandboxName} (new)`);
  console.log(`Use "sandbox browser ${sandboxName}" to open noVNC`);
  console.log();

  const args = [
    "run", "-it",
    "--name", containerName,
    "--shm-size=2g",
    "-p", portMapping,
    "-v", `${homeDir}:/home/claude`,
    "-v", `${sharedConfigDir}:/home/claude/.claude-shared`,
    "-v", `${workspace}:/workspace`,
    "--label", `${LABEL_PREFIX}.name=${sandboxName}`,
    "--label", `${LABEL_PREFIX}.workspace=${workspace}`,
    image,
    ...claudeArgs,
  ];

  await execa("docker", args, { stdio: "inherit" });
}

async function generateUniqueName(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = generateName();
    const existing = await findSandboxByName(candidate);
    if (!existing) return candidate;
  }
  // Fallback: use timestamp suffix
  return `${generateName()}-${Date.now()}`;
}
