// The preview GitHub Action (github-action/action.yml). Its interface follows the
// emolysis-checks reusable workflow in emolysis/.github (docs/specs/emolysis-checks.md
// there). The step scripts are run with bash, as the composite action runs them.

import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASH = ["/bin/bash", "/usr/bin/bash"].find((p) => existsSync(p));

type Step = { name?: string; uses?: string; run?: string; env?: Record<string, string> };

const action = parseYaml(readFileSync(path.join(ROOT, "github-action/action.yml"), "utf8")) as {
  name: string;
  description: string;
  inputs: Record<string, { required?: boolean; default?: string }>;
  runs: { using: string; steps: Step[] };
};
const steps = action.runs.steps;

function step(name: string): Step {
  const found = steps.find((s) => s.name === name);
  if (!found) throw new Error(`no step named ${name}`);
  return found;
}

function indexOf(name: string): number {
  return steps.findIndex((s) => s.name === name);
}

/** Runs a step's script like a composite `shell: bash` step, with `env` over the step's env. */
function runStep(s: Step, env: Record<string, string>) {
  const result = spawnSync(
    BASH!,
    ["--noprofile", "--norc", "-eo", "pipefail", "-c", String(s.run)],
    { env: { PATH: process.env["PATH"] ?? "", ...s.env, ...env }, encoding: "utf8" },
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const tempDirs: string[] = [];
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

/** A directory holding fake executables that append their arguments to `log`. */
function fakeBin(...names: string[]): { dir: string; log: string; calls: () => string[] } {
  const dir = mkdtempSync(path.join(tmpdir(), "emo-action-"));
  tempDirs.push(dir);
  const log = path.join(dir, "calls.log");
  writeFileSync(log, "");
  for (const name of names) {
    const file = path.join(dir, name);
    writeFileSync(file, `#!/bin/sh\necho "${name} $*" >> "${log}"\n`);
    chmodSync(file, 0o755);
  }
  const calls = () =>
    readFileSync(log, "utf8")
      .split("\n")
      .filter((line) => line !== "");
  return { dir, log, calls };
}

describe("GitHub Action interface", () => {
  it("is a composite action marked as a preview that is not yet available", () => {
    expect(action.name).toBe("Emolysis checks (preview)");
    expect(action.description).toMatch(/not yet available/i);
    expect(action.runs.using).toBe("composite");
  });

  it("takes the inputs of the emolysis-checks reusable workflow", () => {
    expect(Object.keys(action.inputs).sort()).toEqual(["emolysis-version", "path", "platform"]);
    expect(action.inputs["path"]).toMatchObject({ required: false, default: "." });
    expect(action.inputs["platform"]).toMatchObject({ required: false, default: "" });
    expect(action.inputs["emolysis-version"]).toMatchObject({ required: false, default: "" });
  });

  it("never expands inputs inside shell scripts", () => {
    for (const s of steps) expect(String(s.run ?? "")).not.toMatch(/\$\{\{/);
  });
});

describe("GitHub Action preview guard", () => {
  const guard = step("Preview guard");

  it("is the first step and is switched off", () => {
    expect(steps[0]).toBe(guard);
    expect(guard.env).toEqual({ EMOLYSIS_CHECKS_AVAILABLE: "false" });
  });

  it("comes before input validation and before anything is installed", () => {
    const installs = steps
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.uses !== undefined || /\binstall\b/.test(String(s.run ?? "")));
    expect(installs.map(({ s }) => s.name)).toEqual(["Set up uv", "Install the emolysis CLI"]);
    for (const { i } of installs) {
      expect(i).toBeGreaterThan(indexOf("Preview guard"));
      expect(i).toBeGreaterThan(indexOf("Validate inputs"));
    }
    expect(indexOf("Validate inputs")).toBeGreaterThan(indexOf("Preview guard"));
  });

  it.skipIf(!BASH)("fails with the not-available error while switched off", () => {
    const result = runStep(guard, {});
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("::error title=Emolysis checks are not available yet::");
  });

  it.skipIf(!BASH)("passes once switched on", () => {
    expect(runStep(guard, { EMOLYSIS_CHECKS_AVAILABLE: "true" }).status).toBe(0);
  });
});

describe.skipIf(!BASH)("GitHub Action input validation", () => {
  const validate = step("Validate inputs");
  const run = (platform: string, version: string) =>
    runStep(validate, { PLATFORM: platform, EMOLYSIS_VERSION: version });

  it.each(["", "databricks", "snowflake", "fabric"])("accepts platform %j", (platform) => {
    expect(run(platform, "").status).toBe(0);
  });

  it.each(["duckdb", "Databricks", "fabric; true", " databricks"])(
    "rejects platform %j",
    (platform) => {
      const result = run(platform, "");
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("::error::platform must be");
    },
  );

  it.each(["", "0.1.0", "1.2.3rc1", "0.1.0+local.1", "1!2.0"])("accepts version %j", (v) => {
    expect(run("", v).status).toBe(0);
  });

  it.each(["latest", "v0.1.0", ">=0.1", "0.1.0 ; true", "0.1.0\nfoo", "1.0/../x"])(
    "rejects version %j",
    (v) => {
      const result = run("", v);
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("::error::emolysis-version must be");
    },
  );
});

describe.skipIf(!BASH)("GitHub Action install and check", () => {
  it("installs the exact version when emolysis-version is set", () => {
    const bin = fakeBin("uv");
    const githubPath = path.join(bin.dir, "github_path");
    const env = { PATH: `${bin.dir}:${process.env["PATH"] ?? ""}`, GITHUB_PATH: githubPath };
    expect(
      runStep(step("Install the emolysis CLI"), { ...env, EMOLYSIS_VERSION: "0.1.0" }),
    ).toMatchObject({ status: 0 });
    expect(bin.calls()).toEqual(["uv tool install emolysis==0.1.0", "uv tool dir --bin"]);
  });

  it("installs the latest release when emolysis-version is empty", () => {
    const bin = fakeBin("uv");
    const env = { PATH: `${bin.dir}:${process.env["PATH"] ?? ""}`, GITHUB_PATH: "/dev/null" };
    expect(runStep(step("Install the emolysis CLI"), { ...env, EMOLYSIS_VERSION: "" }).status).toBe(
      0,
    );
    expect(bin.calls()).toEqual(["uv tool install emolysis", "uv tool dir --bin"]);
  });

  it("runs emo check with --platform only when platform is set", () => {
    const check = step("Run emo check");
    const bin = fakeBin("emo");
    const env = { PATH: `${bin.dir}:${process.env["PATH"] ?? ""}` };
    expect(runStep(check, { ...env, PLATFORM: "snowflake" }).status).toBe(0);
    expect(runStep(check, { ...env, PLATFORM: "" }).status).toBe(0);
    expect(bin.calls()).toEqual(["emo check --platform snowflake", "emo check"]);
  });
});
