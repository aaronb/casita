import { execa } from "execa";

export const LABEL_PREFIX = "sandbox";
export const CONTAINER_PREFIX = "agent-sandbox";

export interface SandboxInfo {
  name: string;
  containerId: string;
  port: string;
  workspace: string;
  status: string;
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
    "ps",
    "--filter", `label=${LABEL_PREFIX}.name`,
    "--format", "{{json .}}",
  ]);

  if (!stdout.trim()) return [];

  return Promise.all(
    stdout.trim().split("\n").map(async (line) => {
      const container = JSON.parse(line);
      const labels = await getContainerLabels(container.ID);
      let port = "unknown";
      try {
        port = await getHostPort(container.ID, 6080);
      } catch {}
      return {
        name: labels[`${LABEL_PREFIX}.name`] || "unknown",
        containerId: container.ID,
        port,
        workspace: labels[`${LABEL_PREFIX}.workspace`] || "unknown",
        status: container.Status || container.State || "unknown",
      };
    })
  );
}

async function getContainerLabels(containerId: string): Promise<Record<string, string>> {
  const { stdout } = await execa("docker", [
    "inspect",
    "--format", "{{json .Config.Labels}}",
    containerId,
  ]);
  return JSON.parse(stdout);
}
