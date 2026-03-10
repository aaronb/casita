import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("execa", () => ({ execa: vi.fn() }));

import { execa } from "execa";
import {
  findWorkspaceRoot,
  getHostPort,
  listCasitas,
  findCasitaByName,
  removeCasita,
} from "../docker.js";
import fs from "node:fs";

const mockExeca = vi.mocked(execa);

describe("findWorkspaceRoot", () => {
  it("finds .casitas in parent directory", () => {
    vi.spyOn(fs, "existsSync").mockImplementation((p) =>
      String(p).endsWith("/parent/.casitas")
    );
    expect(findWorkspaceRoot("/parent/child")).toBe("/parent");
  });

  it("returns null when no .casitas found", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(findWorkspaceRoot("/some/deep/path")).toBeNull();
  });
});

describe("getHostPort", () => {
  it("parses port from docker port output", async () => {
    mockExeca.mockResolvedValueOnce({ stdout: "0.0.0.0:32768\n" } as any);
    const port = await getHostPort("abc123", 6080);
    expect(port).toBe("32768");
    expect(mockExeca).toHaveBeenCalledWith("docker", ["port", "abc123", "6080"]);
  });

  it("throws on bad output", async () => {
    mockExeca.mockResolvedValueOnce({ stdout: "bad-output" } as any);
    await expect(getHostPort("abc123", 6080)).rejects.toThrow("Could not determine host port");
  });
});

describe("listCasitas", () => {
  it("returns parsed CasitaInfo array", async () => {
    const psLine = JSON.stringify({ ID: "abc123", State: "running", Status: "Up 2 hours", Labels: "casita.name=swift-fox" });
    mockExeca
      // docker ps
      .mockResolvedValueOnce({ stdout: psLine } as any)
      // docker port
      .mockResolvedValueOnce({ stdout: "0.0.0.0:32768\n" } as any);

    const result = await listCasitas();
    expect(result).toEqual([
      {
        name: "swift-fox",
        containerId: "abc123",
        port: "32768",
        status: "Up 2 hours",
        state: "running",
      },
    ]);
  });

  it("returns empty array for empty stdout", async () => {
    mockExeca.mockResolvedValueOnce({ stdout: "" } as any);
    expect(await listCasitas()).toEqual([]);
  });

  it("sets port to '--' for exited containers", async () => {
    const psLine = JSON.stringify({ ID: "def456", State: "exited", Status: "Exited (0)", Labels: "casita.name=calm-owl" });
    mockExeca
      .mockResolvedValueOnce({ stdout: psLine } as any);

    const result = await listCasitas();
    expect(result[0].port).toBe("--");
    expect(result[0].state).toBe("exited");
  });
});

describe("findCasitaByName", () => {
  it("returns matching casita", async () => {
    const psLine = JSON.stringify({ ID: "abc123", State: "running", Status: "Up", Labels: "casita.name=swift-fox" });
    mockExeca
      .mockResolvedValueOnce({ stdout: psLine } as any)
      .mockResolvedValueOnce({ stdout: "0.0.0.0:8080\n" } as any);

    const result = await findCasitaByName("swift-fox");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("swift-fox");
  });

  it("returns null when not found", async () => {
    mockExeca.mockResolvedValueOnce({ stdout: "" } as any);
    expect(await findCasitaByName("nonexistent")).toBeNull();
  });
});

describe("removeCasita", () => {
  it("calls docker rm -f with container id", async () => {
    mockExeca.mockResolvedValueOnce({} as any);
    await removeCasita("abc123");
    expect(mockExeca).toHaveBeenCalledWith("docker", ["rm", "-f", "abc123"]);
  });
});
