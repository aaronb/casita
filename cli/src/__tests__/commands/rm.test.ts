import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("execa", () => ({ execa: vi.fn() }));

import { execa } from "execa";
import fs from "node:fs";
import readline from "node:readline";
import { rmCommand } from "../../commands/rm.js";

const mockExeca = vi.mocked(execa);

function mockCasitaLookup(name: string, id = "abc123") {
  const line = JSON.stringify({ ID: id, State: "running", Status: "Up", Labels: `casita.name=${name}` });
  mockExeca
    .mockResolvedValueOnce({ stdout: line } as any)
    .mockResolvedValueOnce({ stdout: "0.0.0.0:8080\n" } as any);
}

function mockReadline(answer: string) {
  vi.spyOn(readline, "createInterface").mockReturnValue({
    question: (_q: string, cb: (answer: string) => void) => cb(answer),
    close: vi.fn(),
  } as any);
}

describe("rmCommand", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  it("removes without prompt when --force", async () => {
    mockCasitaLookup("swift-fox");
    // docker rm -f
    mockExeca.mockResolvedValueOnce({} as any);

    await rmCommand("swift-fox", { force: true });
    expect(logSpy).toHaveBeenCalledWith('Removed casita "swift-fox".');
    expect(mockExeca).toHaveBeenCalledWith("docker", ["rm", "-f", "abc123"]);
  });

  it("errors when casita not found", async () => {
    mockExeca.mockResolvedValueOnce({ stdout: "" } as any);
    await expect(rmCommand("nonexistent", {})).rejects.toThrow("process.exit");
    expect(errorSpy).toHaveBeenCalledWith('Casita "nonexistent" not found.');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("cleans casita data dir with --clean", async () => {
    mockCasitaLookup("swift-fox");
    mockExeca.mockResolvedValueOnce({} as any); // docker rm

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const rmSyncSpy = vi.spyOn(fs, "rmSync").mockImplementation(() => {});

    await rmCommand("swift-fox", { force: true, clean: true });
    expect(rmSyncSpy).toHaveBeenCalledWith(
      expect.stringContaining("swift-fox"),
      { recursive: true, force: true }
    );
  });

  it("aborts when user declines confirmation", async () => {
    mockCasitaLookup("swift-fox");
    mockReadline("n");

    await rmCommand("swift-fox", {});
    expect(logSpy).toHaveBeenCalledWith("Aborted.");
    // Should NOT have called docker rm
    expect(mockExeca).not.toHaveBeenCalledWith("docker", ["rm", "-f", expect.anything()]);
  });

  it("proceeds when user confirms", async () => {
    mockCasitaLookup("swift-fox");
    mockReadline("y");
    mockExeca.mockResolvedValueOnce({} as any); // docker rm

    await rmCommand("swift-fox", {});
    expect(logSpy).toHaveBeenCalledWith('Removed casita "swift-fox".');
  });
});
