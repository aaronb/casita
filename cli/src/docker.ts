import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";

export const LABEL_PREFIX = "casita";
export const CONTAINER_PREFIX = "casita";
export const CASITAS_DIR = ".casitas";

export interface CasitaInfo {
  name: string;
  containerId: string;
  port: string;
  status: string;
  state: "running" | "exited";
}

/**
 * Traverse parent directories from `startDir` looking for a `.casitas/` directory.
 * Returns the directory containing `.casitas/`, or null if none found.
 */
export function findWorkspaceRoot(startDir: string = process.cwd()): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, CASITAS_DIR))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}

/**
 * Get or create the workspace root. Finds existing `.casitas/` dir by traversing up,
 * or creates one in the current directory.
 */
export function getWorkspaceRoot(startDir: string = process.cwd()): string {
  return findWorkspaceRoot(startDir) || startDir;
}

/**
 * Get the casitas data directory for a workspace.
 */
export function getCasitasDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, CASITAS_DIR);
}

/**
 * Find casita names registered in this workspace's `.casitas/` directory.
 */
function getLocalCasitaNames(workspaceRoot: string): string[] {
  const dir = getCasitasDir(workspaceRoot);
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

export async function listCasitas(): Promise<CasitaInfo[]> {
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
 * Find a casita for the current workspace by checking which casita names
 * exist in the local `.casitas/` directory and matching against Docker containers.
 */
export async function findCasitaForWorkspace(workspaceRoot: string): Promise<CasitaInfo | null> {
  const localNames = getLocalCasitaNames(workspaceRoot);
  if (localNames.length === 0) return null;

  const allCasitas = await listCasitas();
  for (const name of localNames) {
    const match = allCasitas.find((s) => s.name === name);
    if (match) return match;
  }
  return null;
}

export async function findCasitaByName(name: string): Promise<CasitaInfo | null> {
  const casitas = await listCasitas();
  return casitas.find((s) => s.name === name) || null;
}

export async function removeCasita(containerId: string): Promise<void> {
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
