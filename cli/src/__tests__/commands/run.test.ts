import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("execa", () => ({ execa: vi.fn() }));

import { execa } from "execa";
import fs from "node:fs";
import os from "node:os";
import { runCommand } from "../../commands/run.js";

const mockExeca = vi.mocked(execa);

function mockNoExistingCasita() {
  // findCasitaForWorkspace → getLocalCasitaNames → existsSync(.casitas) = false
  // so it returns null without calling docker
}

function mockExistingCasita(name: string, state: "running" | "exited", id = "abc123") {
  const line = JSON.stringify({ ID: id, State: state, Status: state === "running" ? "Up" : "Exited", Labels: `casita.name=${name}` });
  mockExeca
    .mockResolvedValueOnce({ stdout: line } as any);
  if (state === "running") {
    mockExeca.mockResolvedValueOnce({ stdout: "0.0.0.0:8080\n" } as any);
  }
}

describe("runCommand", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    // Default: no .casitas directory
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined as any);
    vi.spyOn(fs, "readdirSync").mockReturnValue([] as any);
    vi.spyOn(os, "homedir").mockReturnValue("/home/testuser");
  });

  it("creates new casita with docker run when none exists", async () => {
    mockNoExistingCasita();
    // listCasitas for generateUniqueName → findCasitaByName
    mockExeca.mockResolvedValueOnce({ stdout: "" } as any);
    // docker run
    mockExeca.mockResolvedValueOnce({} as any);

    await runCommand(undefined, [], {});

    const runCall = mockExeca.mock.calls.find((c) => c[1]?.[0] === "run");
    expect(runCall).toBeDefined();
    const args = runCall![1] as string[];
    expect(args).toContain("run");
    expect(args).toContain("-it");
    expect(args).toContain("--shm-size=2g");
    expect(args).toContain("casita"); // default image
    expect(args.some((a) => a.startsWith("casita.name="))).toBe(true);
  });

  it("attaches shell to running casita", async () => {
    mockExistingCasita("swift-fox", "running");
    // docker exec
    mockExeca.mockResolvedValueOnce({} as any);

    await runCommand("swift-fox", [], {});

    expect(mockExeca).toHaveBeenCalledWith(
      "docker",
      ["exec", "-it", "casita-swift-fox", "bash"],
      { stdio: "inherit" }
    );
  });

  it("restarts stopped casita", async () => {
    mockExistingCasita("swift-fox", "exited");
    // docker start
    mockExeca.mockResolvedValueOnce({} as any);

    await runCommand("swift-fox", [], {});

    expect(mockExeca).toHaveBeenCalledWith(
      "docker",
      ["start", "-ai", "casita-swift-fox"],
      { stdio: "inherit" }
    );
  });

  it("handles port conflict on restart", async () => {
    mockExistingCasita("swift-fox", "exited");
    // docker start fails with port conflict
    mockExeca.mockRejectedValueOnce({
      stderr: "Error: port is already allocated",
    });

    await expect(runCommand("swift-fox", [], {})).rejects.toThrow("process.exit");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Port conflict")
    );
  });

  it("passes explicit name and port options", async () => {
    // With explicit name, it calls findCasitaByName first
    mockExeca.mockResolvedValueOnce({ stdout: "" } as any); // listCasitas returns empty
    // Then falls through to create new
    // generateUniqueName won't be called since name is explicit
    mockExeca.mockResolvedValueOnce({} as any); // docker run

    await runCommand("my-casita", [], { port: "9090", image: "my-image" });

    const runCall = mockExeca.mock.calls.find((c) => c[1]?.[0] === "run");
    expect(runCall).toBeDefined();
    const args = runCall![1] as string[];
    expect(args).toContain("127.0.0.1:9090:6080");
    expect(args).toContain("my-image");
    expect(args).toContain("casita-my-casita");
  });
});
