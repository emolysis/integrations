// CI wiring: the required `gate` job and plugin validation, which must run in CI.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASH = ["/bin/bash", "/usr/bin/bash"].find((p) => existsSync(p));

function yaml<T>(file: string): T {
  return parseYaml(readFileSync(path.join(ROOT, file), "utf8")) as T;
}

type Step = { name?: string; uses?: string; run?: string };
type Job = { name?: string; steps: Step[] };

describe("ci.yml", () => {
  const ci = yaml<{ jobs: Record<string, Job> }>(".github/workflows/ci.yml");
  const gate = ci.jobs["gate"];

  it("has a job with id gate and no other display name (the required check)", () => {
    expect(gate).toBeDefined();
    expect([undefined, "gate"]).toContain(gate!.name);
  });

  it("runs task setup then task gate", () => {
    const runs = gate!.steps.map((s) => s.run).filter((r) => r !== undefined);
    expect(runs.slice(-2)).toEqual(["task setup", "task gate"]);
  });

  it("installs a pinned claude CLI before the gate so plugin validation runs", () => {
    const install = gate!.steps.findIndex((s) =>
      /^npm install --global @anthropic-ai\/claude-code@\d+\.\d+\.\d+$/.test(s.run ?? ""),
    );
    const run = gate!.steps.findIndex((s) => s.run === "task gate");
    expect(install).toBeGreaterThanOrEqual(0);
    expect(install).toBeLessThan(run);
  });
});

describe.skipIf(!BASH)("task plugin:validate without the claude CLI", () => {
  const taskfile = yaml<{ tasks: Record<string, { cmds: string[] }> }>("Taskfile.yml");
  const script = taskfile.tasks["plugin:validate"]!.cmds[0]!;
  // A PATH with no claude on it; the script itself uses only shell builtins.
  const emptyPath = mkdtempSync(path.join(tmpdir(), "no-claude-"));
  afterAll(() => rmSync(emptyPath, { recursive: true, force: true }));
  const run = (env: Record<string, string>) =>
    spawnSync(BASH!, ["--noprofile", "--norc", "-c", script], {
      env: { PATH: emptyPath, ...env },
      encoding: "utf8",
      cwd: ROOT,
    });

  it("fails in CI", () => {
    const result = run({ CI: "true" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("claude CLI not found");
  });

  it("skips with a message locally", () => {
    const result = run({});
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("skipped plugin validation");
  });
});
