import open from "open";
import { listSandboxes } from "../docker.js";

export async function browserCommand(name: string | undefined) {
  const sandboxes = (await listSandboxes()).filter((s) => s.state === "running");

  if (sandboxes.length === 0) {
    console.error("No running sandboxes.");
    process.exit(1);
  }

  let sandbox;
  if (name) {
    sandbox = sandboxes.find((s) => s.name === name);
    if (!sandbox) {
      console.error(`Sandbox "${name}" not found. Running sandboxes: ${sandboxes.map((s) => s.name).join(", ")}`);
      process.exit(1);
    }
  } else if (sandboxes.length === 1) {
    sandbox = sandboxes[0];
  } else {
    console.error(`Multiple sandboxes running. Specify a name: ${sandboxes.map((s) => s.name).join(", ")}`);
    process.exit(1);
  }

  const url = `http://localhost:${sandbox.port}/vnc.html`;
  console.log(`Opening ${url}`);
  await open(url);
}
