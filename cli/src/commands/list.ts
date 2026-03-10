import { listCasitas } from "../docker.js";

interface ListOptions {
  running?: boolean;
}

export async function listCommand(options: ListOptions) {
  let casitas = await listCasitas();

  if (options.running) {
    casitas = casitas.filter((s) => s.state === "running");
  }

  if (casitas.length === 0) {
    console.log("No casitas found.");
    return;
  }

  // Calculate column widths
  const headers = { name: "NAME", port: "PORT", status: "STATUS" };
  const widths = {
    name: Math.max(headers.name.length, ...casitas.map((s) => s.name.length)),
    port: Math.max(headers.port.length, ...casitas.map((s) => s.port.length)),
    status: Math.max(headers.status.length, ...casitas.map((s) => s.status.length)),
  };

  const row = (n: string, p: string, s: string) =>
    `${n.padEnd(widths.name)}  ${p.padEnd(widths.port)}  ${s}`;

  console.log(row(headers.name, headers.port, headers.status));
  for (const s of casitas) {
    console.log(row(s.name, s.port, s.status));
  }
}
