#!/usr/bin/env node
import { Command } from "commander";
import { runCommand } from "./commands/run.js";
import { listCommand } from "./commands/list.js";
import { browserCommand } from "./commands/browser.js";

const program = new Command();

program
  .name("sandbox")
  .description("Manage AI agent sandbox containers")
  .version("0.1.0");

program
  .command("run")
  .description("Start a sandbox container")
  .argument("[name]", "Sandbox name (auto-generated if omitted)")
  .option("-p, --port <port>", "Host port for noVNC (Docker auto-assigns if omitted)")
  .option("-i, --image <image>", "Docker image name", "agent-sandbox")
  .action(async (name, options) => {
    // Extract args after "--" from process.argv
    const dashDash = process.argv.indexOf("--");
    const claudeArgs = dashDash !== -1 ? process.argv.slice(dashDash + 1) : [];
    await runCommand(name, claudeArgs, options);
  });

program
  .command("list")
  .description("List running sandboxes")
  .action(listCommand);

program
  .command("browser")
  .description("Open noVNC in default browser")
  .argument("[name]", "Sandbox name (inferred if only one running)")
  .action(browserCommand);

program.parse();
