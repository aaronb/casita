import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { generateName } from "../names.js";
import {
  CONTAINER_PREFIX,
  LABEL_PREFIX,
  findCasitaByName,
  findCasitaForWorkspace,
  listCasitas,
  getWorkspaceRoot,
  getCasitasDir,
} from "../docker.js";

interface RunOptions {
  port?: string;
  image?: string;
}

// Shared config directory in user's home, mounted into all casitas.
function getSharedConfigDir(): string {
  const dir = path.join(os.homedir(), ".casita");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const VALID_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

function validateName(name: string): void {
  if (!VALID_NAME_RE.test(name) || name.length > 64) {
    console.error(`Invalid casita name "${name}". Names must match /^[a-z0-9][a-z0-9-]*$/ and be at most 64 characters.`);
    process.exit(1);
  }
}

export async function runCommand(name: string | undefined, claudeArgs: string[], options: RunOptions) {
  if (name) validateName(name);
  const workspaceRoot = getWorkspaceRoot();

  // Look up existing casita
  const existing = name
    ? await findCasitaByName(name)
    : await findCasitaForWorkspace(workspaceRoot);

  if (existing) {
    if (existing.state === "running") {
      console.log(`Casita: ${existing.name} (running, attaching shell)`);
      console.log();
      await execa("docker", ["exec", "-it", `${CONTAINER_PREFIX}-${existing.name}`, "bash"], {
        stdio: "inherit",
      });
      return;
    }

    // Stopped — restart
    console.log(`Casita: ${existing.name} (resuming)`);
    console.log(`Use "casita browser ${existing.name}" to open noVNC`);
    console.log();
    try {
      await execa("docker", ["start", "-ai", `${CONTAINER_PREFIX}-${existing.name}`], {
        stdio: "inherit",
      });
    } catch (err: any) {
      if (err.stderr && /port.*already|address already in use/i.test(err.stderr)) {
        console.error(`\nError: Port conflict when restarting casita. Remove and recreate it:`);
        console.error(`  casita rm ${existing.name}`);
        console.error(`  casita run`);
        process.exit(1);
      }
      throw err;
    }
    return;
  }

  // Create new casita
  const casitaName = name || await generateUniqueName();
  const containerName = `${CONTAINER_PREFIX}-${casitaName}`;
  const image = options.image || "casita";

  const casitasDir = getCasitasDir(workspaceRoot);
  const homeDir = path.resolve(casitasDir, casitaName, "home");
  fs.mkdirSync(path.join(homeDir, ".claude"), { recursive: true });

  const sharedConfigDir = getSharedConfigDir();

  const portMapping = options.port ? `127.0.0.1:${options.port}:6080` : "127.0.0.1::6080";

  console.log(`Casita: ${casitaName} (new)`);
  console.log(`Workspace: ${workspaceRoot}`);
  console.log(`Use "casita browser ${casitaName}" to open noVNC`);
  console.log();

  const args = [
    "run", "-it",
    "--name", containerName,
    "--shm-size=2g",
    "-p", portMapping,
    "-v", `${homeDir}:/home/claude`,
    "-v", `${sharedConfigDir}:/home/claude/.casita-shared`,
    "-v", `${workspaceRoot}:/workspace`,
    "--label", `${LABEL_PREFIX}.name=${casitaName}`,
    image,
    ...claudeArgs,
  ];

  await execa("docker", args, { stdio: "inherit" });
}

async function generateUniqueName(): Promise<string> {
  const casitas = await listCasitas();
  const usedNames = new Set(casitas.map((c) => c.name));
  for (let i = 0; i < 10; i++) {
    const candidate = generateName();
    if (!usedNames.has(candidate)) return candidate;
  }
  // Fallback: use timestamp suffix
  return `${generateName()}-${Date.now()}`;
}
