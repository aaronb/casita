import { listSandboxes } from "../docker.js";

export async function listCommand() {
  const sandboxes = await listSandboxes();

  if (sandboxes.length === 0) {
    console.log("No running sandboxes.");
    return;
  }

  // Calculate column widths
  const headers = { name: "NAME", port: "PORT", workspace: "WORKSPACE", status: "STATUS" };
  const widths = {
    name: Math.max(headers.name.length, ...sandboxes.map((s) => s.name.length)),
    port: Math.max(headers.port.length, ...sandboxes.map((s) => s.port.length)),
    workspace: Math.max(headers.workspace.length, ...sandboxes.map((s) => s.workspace.length)),
    status: Math.max(headers.status.length, ...sandboxes.map((s) => s.status.length)),
  };

  const row = (n: string, p: string, w: string, s: string) =>
    `${n.padEnd(widths.name)}  ${p.padEnd(widths.port)}  ${w.padEnd(widths.workspace)}  ${s}`;

  console.log(row(headers.name, headers.port, headers.workspace, headers.status));
  for (const s of sandboxes) {
    console.log(row(s.name, s.port, s.workspace, s.status));
  }
}
