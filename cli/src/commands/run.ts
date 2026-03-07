import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { generateName } from "../names.js";
import { CONTAINER_PREFIX, LABEL_PREFIX } from "../docker.js";

interface RunOptions {
  port?: string;
  image?: string;
}

// Shared config directory in user's home, mounted into all sandboxes.
// Currently used for OAuth credentials; can be extended for other config.
function getSharedConfigDir(): string {
  const dir = path.join(os.homedir(), ".claude-sandbox");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function runCommand(name: string | undefined, claudeArgs: string[], options: RunOptions) {
  const sandboxName = name || generateName();
  const containerName = `${CONTAINER_PREFIX}-${sandboxName}`;
  const image = options.image || "agent-sandbox";

  const projectRoot = path.resolve(import.meta.dirname, "../..");
  const sandboxesDir = path.resolve(projectRoot, "..", ".sandboxes");
  const homeDir = path.resolve(sandboxesDir, sandboxName, "home");
  fs.mkdirSync(path.join(homeDir, ".claude"), { recursive: true });

  const sharedConfigDir = getSharedConfigDir();

  const workspace = process.cwd();
  const portMapping = options.port ? `${options.port}:6080` : "6080";

  console.log(`Sandbox: ${sandboxName}`);
  console.log(`Use "sandbox browser ${sandboxName}" to open noVNC`);
  console.log();

  const args = [
    "run", "-it", "--rm",
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
