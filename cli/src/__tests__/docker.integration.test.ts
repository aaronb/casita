import { describe, it, expect, afterAll } from "vitest";
import { execa } from "execa";
import {
  listCasitas,
  findCasitaByName,
  getHostPort,
  removeCasita,
  LABEL_PREFIX,
  CONTAINER_PREFIX,
} from "../docker.js";

const TEST_NAME = `integration-test-${Date.now()}`;
const CONTAINER_NAME = `${CONTAINER_PREFIX}-${TEST_NAME}`;

let containerId: string | undefined;

afterAll(async () => {
  // Cleanup: ensure the test container is removed even if a test fails
  if (containerId) {
    await execa("docker", ["rm", "-f", containerId]).catch(() => {});
  }
});

describe("docker integration", () => {
  it("creates a casita container with the expected label", async () => {
    const result = await execa("docker", [
      "run", "-d",
      "--name", CONTAINER_NAME,
      "--label", `${LABEL_PREFIX}.name=${TEST_NAME}`,
      "-p", "127.0.0.1::80",
      "alpine",
      "sh", "-c", "while true; do sleep 3600; done",
    ]);
    containerId = result.stdout.trim();
    expect(containerId).toBeTruthy();
  });

  it("listCasitas includes the test container", async () => {
    const casitas = await listCasitas();
    const found = casitas.find((c) => c.name === TEST_NAME);
    expect(found).toBeDefined();
    expect(containerId!.startsWith(found!.containerId)).toBe(true);
    expect(found!.state).toBe("running");
  });

  it("findCasitaByName returns the test container", async () => {
    const casita = await findCasitaByName(TEST_NAME);
    expect(casita).not.toBeNull();
    expect(casita!.name).toBe(TEST_NAME);
    expect(casita!.state).toBe("running");
  });

  it("getHostPort returns a valid port", async () => {
    // The container exposes port 80 (mapped to a random host port)
    const port = await getHostPort(containerId!, 80);
    expect(Number(port)).toBeGreaterThan(0);
    expect(Number(port)).toBeLessThan(65536);
  });

  it("removeCasita removes the container", async () => {
    await removeCasita(containerId!);

    // Verify it's gone
    const casita = await findCasitaByName(TEST_NAME);
    expect(casita).toBeNull();

    // Prevent afterAll from trying to remove again
    containerId = undefined;
  });
});
