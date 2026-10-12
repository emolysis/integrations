import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXIT_NOT_FOUND, INSTALL_URL, main, missingMessage } from "../src/main.js";

function capture(): { write(text: string): boolean; text(): string } {
  const chunks: string[] = [];
  return {
    write: (text) => {
      chunks.push(text);
      return true;
    },
    text: () => chunks.join(""),
  };
}

/** Writes an executable `emo` shell script into a fresh directory and returns the directory. */
function fakeEmo(body: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "emo-main-"));
  const file = path.join(dir, "emo");
  writeFileSync(file, `#!/bin/sh\n${body}\n`);
  chmodSync(file, 0o755);
  return dir;
}

describe("main", () => {
  it("prints one install message and exits 127 when emo is not on PATH", async () => {
    const stderr = capture();
    const result = await main({ argv: [], env: { PATH: "" }, platform: "linux", stderr });
    expect(result).toEqual({ exitCode: EXIT_NOT_FOUND });
    expect(stderr.text()).toContain('cannot find the Emolysis CLI ("emo") on PATH');
    expect(stderr.text()).toContain(INSTALL_URL);
    expect(stderr.text().trimEnd().split("\n")).toHaveLength(1);
  });

  it("names EMO_BIN when it points at nothing", async () => {
    const stderr = capture();
    const result = await main({
      argv: [],
      env: { EMO_BIN: "/missing/emo", PATH: "" },
      platform: "linux",
      stderr,
    });
    expect(result.exitCode).toBe(EXIT_NOT_FOUND);
    expect(stderr.text()).toContain('EMO_BIN is set to "/missing/emo"');
  });

  describe.skipIf(process.platform === "win32")("with a fake emo", () => {
    it("runs `emo mcp` with the extra arguments and forwards the exit code", async () => {
      const dir = fakeEmo('printf "%s\\n" "$@" > "${0%/*}/args"; exit 3');
      const stderr = capture();
      const result = await main({
        argv: ["--log-level", "debug"],
        env: { PATH: dir },
        platform: process.platform,
        stderr,
      });
      expect(result).toEqual({ exitCode: 3 });
      expect(readFileSync(path.join(dir, "args"), "utf8")).toBe("mcp\n--log-level\ndebug\n");
      expect(stderr.text()).toBe("");
    });

    it("prefers EMO_BIN over PATH", async () => {
      const onPath = fakeEmo("exit 4");
      const pinned = fakeEmo("exit 5");
      const result = await main({
        argv: [],
        env: { PATH: onPath, EMO_BIN: path.join(pinned, "emo") },
        platform: process.platform,
        stderr: capture(),
      });
      expect(result.exitCode).toBe(5);
    });

    it("reports a signal that ended emo", async () => {
      const dir = fakeEmo("kill -TERM $$");
      const result = await main({
        argv: [],
        env: { PATH: dir },
        platform: process.platform,
        stderr: capture(),
      });
      expect(result).toEqual({ exitCode: 143, signal: "SIGTERM" });
    });
  });
});

describe.runIf(process.platform === "win32")("on Windows with a fake emo.cmd", () => {
  it("runs the .cmd through cmd.exe with quoted arguments and forwards the exit code", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "emo-main-"));
    writeFileSync(
      path.join(dir, "emo.cmd"),
      '@echo off\r\necho %*> "%~dp0args.txt"\r\nexit /b 3\r\n',
    );
    // Keep ComSpec and SystemRoot; replace PATH whatever its spelling.
    const env: NodeJS.ProcessEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.toUpperCase() !== "PATH") env[key] = value;
    }
    env["PATH"] = dir;

    const result = await main({
      argv: ["--name", "a b"],
      env,
      platform: "win32",
      stderr: capture(),
    });
    expect(result).toEqual({ exitCode: 3 });
    expect(readFileSync(path.join(dir, "args.txt"), "utf8").trim()).toBe('"mcp" "--name" "a b"');
  });
});

describe("missingMessage", () => {
  it("is a single line ending in a newline", () => {
    for (const reason of ["emo_bin_invalid", "not_on_path"] as const) {
      const message = missingMessage({ found: false, reason, detail: "x" });
      expect(message.endsWith("\n")).toBe(true);
      expect(message.slice(0, -1)).not.toContain("\n");
    }
  });
});
