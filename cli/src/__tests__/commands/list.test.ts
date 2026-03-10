import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("execa", () => ({ execa: vi.fn() }));

import { execa } from "execa";
import { listCommand } from "../../commands/list.js";

const mockExeca = vi.mocked(execa);

describe("listCommand", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("prints 'No casitas found.' when list is empty", async () => {
    mockExeca.mockResolvedValueOnce({ stdout: "" } as any);
    await listCommand({});
    expect(logSpy).toHaveBeenCalledWith("No casitas found.");
  });

  it("prints table with headers and rows", async () => {
    const line1 = JSON.stringify({ ID: "a1", State: "running", Status: "Up 1 hour" });
    const line2 = JSON.stringify({ ID: "b2", State: "exited", Status: "Exited (0)" });
    mockExeca
      // docker ps
      .mockResolvedValueOnce({ stdout: `${line1}\n${line2}` } as any)
      // inspect a1 (Promise.all: both inspects before ports)
      .mockResolvedValueOnce({ stdout: JSON.stringify({ "casita.name": "swift-fox" }) } as any)
      // inspect b2
      .mockResolvedValueOnce({ stdout: JSON.stringify({ "casita.name": "calm-owl" }) } as any)
      // port a1
      .mockResolvedValueOnce({ stdout: "0.0.0.0:32768\n" } as any);

    await listCommand({});

    const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("NAME");
    expect(output).toContain("PORT");
    expect(output).toContain("STATUS");
    expect(output).toContain("swift-fox");
    expect(output).toContain("32768");
    expect(output).toContain("calm-owl");
  });

  it("filters to running containers with running option", async () => {
    const line1 = JSON.stringify({ ID: "a1", State: "running", Status: "Up" });
    const line2 = JSON.stringify({ ID: "b2", State: "exited", Status: "Exited" });
    mockExeca
      .mockResolvedValueOnce({ stdout: `${line1}\n${line2}` } as any)
      // inspects first (Promise.all)
      .mockResolvedValueOnce({ stdout: JSON.stringify({ "casita.name": "swift-fox" }) } as any)
      .mockResolvedValueOnce({ stdout: JSON.stringify({ "casita.name": "calm-owl" }) } as any)
      // then port for running container
      .mockResolvedValueOnce({ stdout: "0.0.0.0:32768\n" } as any);

    await listCommand({ running: true });

    const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("swift-fox");
    expect(output).not.toContain("calm-owl");
  });
});
