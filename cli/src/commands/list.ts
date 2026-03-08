import { listSandboxes } from "../docker.js";

interface ListOptions {
  running?: boolean;
}

export async function listCommand(options: ListOptions) {
  let sandboxes = await listSandboxes();

  if (options.running) {
    sandboxes = sandboxes.filter((s) => s.state === "running");
  }

  if (sandboxes.length === 0) {
    console.log("No sandboxes found.");
    return;
  }

  // Calculate column widths
  const headers = { name: "NAME", port: "PORT", status: "STATUS" };
  const widths = {
    name: Math.max(headers.name.length, ...sandboxes.map((s) => s.name.length)),
    port: Math.max(headers.port.length, ...sandboxes.map((s) => s.port.length)),
    status: Math.max(headers.status.length, ...sandboxes.map((s) => s.status.length)),
  };

  const row = (n: string, p: string, s: string) =>
    `${n.padEnd(widths.name)}  ${p.padEnd(widths.port)}  ${s}`;

  console.log(row(headers.name, headers.port, headers.status));
  for (const s of sandboxes) {
    console.log(row(s.name, s.port, s.status));
  }
}
