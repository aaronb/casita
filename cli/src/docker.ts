import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";

export const LABEL_PREFIX = "sandbox";
export const CONTAINER_PREFIX = "agent-sandbox";
export const SANDBOXES_DIR = ".sandboxes";

export interface SandboxInfo {
  name: string;
  containerId: string;
  port: string;
  status: string;
  state: "running" | "exited";
}

/**
 * Traverse parent directories from `startDir` looking for a `.sandboxes/` directory.
 * Returns the directory containing `.sandboxes/`, or null if none found.
 */
export function findWorkspaceRoot(startDir: string = process.cwd()): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, SANDBOXES_DIR))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}

/**
 * Get or create the workspace root. Finds existing `.sandboxes/` dir by traversing up,
 * or creates one in the current directory.
 */
export function getWorkspaceRoot(startDir: string = process.cwd()): string {
  return findWorkspaceRoot(startDir) || startDir;
}

/**
 * Get the sandboxes data directory for a workspace.
 */
export function getSandboxesDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, SANDBOXES_DIR);
}

/**
 * Find sandbox names registered in this workspace's `.sandboxes/` directory.
 */
function getLocalSandboxNames(workspaceRoot: string): string[] {
  const dir = getSandboxesDir(workspaceRoot);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

export async function getHostPort(container: string, containerPort: number): Promise<string> {
  const { stdout } = await execa("docker", [
    "port", container, String(containerPort),
  ]);
  const match = stdout.trim().split("\n")[0].match(/:(\d+)$/);
  if (!match) throw new Error(`Could not determine host port for ${container}:${containerPort}`);
  return match[1];
}

export async function listSandboxes(): Promise<SandboxInfo[]> {
  const { stdout } = await execa("docker", [
    "ps", "-a",
    "--filter", `label=${LABEL_PREFIX}.name`,
    "--format", "{{json .}}",
  ]);

  if (!stdout.trim()) return [];

  return Promise.all(
    stdout.trim().split("\n").map(async (line) => {
      const container = JSON.parse(line);
      const labels = await getContainerLabels(container.ID);
      const isRunning = (container.State || "").toLowerCase() === "running";
      let port = "--";
      if (isRunning) {
        try {
          port = await getHostPort(container.ID, 6080);
        } catch {}
      }
      return {
        name: labels[`${LABEL_PREFIX}.name`] || "unknown",
        containerId: container.ID,
        port,
        status: container.Status || container.State || "unknown",
        state: isRunning ? "running" as const : "exited" as const,
      };
    })
  );
}

/**
 * Find a sandbox for the current workspace by checking which sandbox names
 * exist in the local `.sandboxes/` directory and matching against Docker containers.
 */
export async function findSandboxForWorkspace(workspaceRoot: string): Promise<SandboxInfo | null> {
  const localNames = getLocalSandboxNames(workspaceRoot);
  if (localNames.length === 0) return null;

  const allSandboxes = await listSandboxes();
  for (const name of localNames) {
    const match = allSandboxes.find((s) => s.name === name);
    if (match) return match;
  }
  return null;
}

export async function findSandboxByName(name: string): Promise<SandboxInfo | null> {
  const sandboxes = await listSandboxes();
  return sandboxes.find((s) => s.name === name) || null;
}

export async function removeSandbox(containerId: string): Promise<void> {
  await execa("docker", ["rm", "-f", containerId]);
}

async function getContainerLabels(containerId: string): Promise<Record<string, string>> {
  const { stdout } = await execa("docker", [
    "inspect",
    "--format", "{{json .Config.Labels}}",
    containerId,
  ]);
  return JSON.parse(stdout);
}
