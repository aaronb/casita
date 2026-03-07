import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";
import { generateName } from "../names.js";
import { CONTAINER_PREFIX, LABEL_PREFIX } from "../docker.js";

interface RunOptions {
  port?: string;
  image?: string;
}

export async function runCommand(name: string | undefined, claudeArgs: string[], options: RunOptions) {
  const sandboxName = name || generateName();
  const containerName = `${CONTAINER_PREFIX}-${sandboxName}`;
  const image = options.image || "agent-sandbox";

  const projectRoot = path.resolve(import.meta.dirname, "../..");
  const homeDir = path.resolve(projectRoot, "..", ".sandboxes", sandboxName, "home");
  fs.mkdirSync(homeDir, { recursive: true });

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
    "-v", `${workspace}:/workspace`,
    "--label", `${LABEL_PREFIX}.name=${sandboxName}`,
    "--label", `${LABEL_PREFIX}.workspace=${workspace}`,
    image,
    ...claudeArgs,
  ];

  await execa("docker", args, { stdio: "inherit" });
}
