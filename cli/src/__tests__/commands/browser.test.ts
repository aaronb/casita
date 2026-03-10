import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("execa", () => ({ execa: vi.fn() }));
vi.mock("open", () => ({ default: vi.fn() }));

import { execa } from "execa";
import open from "open";
import { browserCommand } from "../../commands/browser.js";

const mockExeca = vi.mocked(execa);
const mockOpen = vi.mocked(open);

function mockRunningCasita(name: string, port: string, id = "abc123") {
  const line = JSON.stringify({ ID: id, State: "running", Status: "Up", Labels: `casita.name=${name}` });
  mockExeca
    .mockResolvedValueOnce({ stdout: line } as any)
    .mockResolvedValueOnce({ stdout: `0.0.0.0:${port}\n` } as any);
}

describe("browserCommand", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  it("opens correct URL for single running casita", async () => {
    mockRunningCasita("swift-fox", "32768");
    await browserCommand(undefined);
    expect(mockOpen).toHaveBeenCalledWith("http://localhost:32768/vnc.html");
    expect(logSpy).toHaveBeenCalledWith("Opening http://localhost:32768/vnc.html");
  });

  it("opens correct URL for named casita", async () => {
    mockRunningCasita("calm-owl", "9999");
    await browserCommand("calm-owl");
    expect(mockOpen).toHaveBeenCalledWith("http://localhost:9999/vnc.html");
  });

  it("errors when no running casitas", async () => {
    mockExeca.mockResolvedValueOnce({ stdout: "" } as any);
    await expect(browserCommand(undefined)).rejects.toThrow("process.exit");
    expect(errorSpy).toHaveBeenCalledWith("No running casitas.");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("errors when multiple casitas and no name specified", async () => {
    const line1 = JSON.stringify({ ID: "a1", State: "running", Status: "Up", Labels: "casita.name=swift-fox" });
    const line2 = JSON.stringify({ ID: "b2", State: "running", Status: "Up", Labels: "casita.name=calm-owl" });
    mockExeca
      .mockResolvedValueOnce({ stdout: `${line1}\n${line2}` } as any)
      // ports (Promise.all)
      .mockResolvedValueOnce({ stdout: "0.0.0.0:1111\n" } as any)
      .mockResolvedValueOnce({ stdout: "0.0.0.0:2222\n" } as any);

    await expect(browserCommand(undefined)).rejects.toThrow("process.exit");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Multiple casitas running")
    );
  });
});
