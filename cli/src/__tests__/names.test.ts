import { describe, it, expect, vi } from "vitest";
import { generateName } from "../names.js";

describe("generateName", () => {
  it("returns adjective-noun format", () => {
    const name = generateName();
    expect(name).toMatch(/^[a-z]+-[a-z]+$/);
  });

  it("returns deterministic output when Math.random is mocked to 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(generateName()).toBe("swift-fox");
  });

  it("returns deterministic output when Math.random is mocked to 0.999", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(generateName()).toBe("tall-cub");
  });
});
