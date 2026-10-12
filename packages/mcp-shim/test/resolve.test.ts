import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getEnv, pathEntries, resolveEmo, withExtensions } from "../src/resolve.js";

/** An isExecutable stub that accepts exactly the given paths. */
function only(...files: string[]): (file: string) => boolean {
  const set = new Set(files);
  return (file) => set.has(file);
}

describe("resolveEmo on POSIX", () => {
  const platform = "linux" as const;

  it("prefers EMO_BIN over PATH", () => {
    const result = resolveEmo({
      platform,
      env: { EMO_BIN: "/opt/emo/bin/emo", PATH: "/usr/bin" },
      isExecutable: only("/opt/emo/bin/emo", "/usr/bin/emo"),
    });
    expect(result).toEqual({ found: true, path: "/opt/emo/bin/emo", source: "EMO_BIN" });
  });

  it("reports an EMO_BIN that is not executable instead of falling back to PATH", () => {
    const result = resolveEmo({
      platform,
      env: { EMO_BIN: "/nowhere/emo", PATH: "/usr/bin" },
      isExecutable: only("/usr/bin/emo"),
    });
    expect(result).toEqual({ found: false, reason: "emo_bin_invalid", detail: "/nowhere/emo" });
  });

  it("ignores a blank EMO_BIN", () => {
    const result = resolveEmo({
      platform,
      env: { EMO_BIN: "  ", PATH: "/usr/bin" },
      isExecutable: only("/usr/bin/emo"),
    });
    expect(result).toEqual({ found: true, path: "/usr/bin/emo", source: "PATH" });
  });

  it("returns the first PATH entry that has emo", () => {
    const result = resolveEmo({
      platform,
      env: { PATH: "/a:/b:/c" },
      isExecutable: only("/b/emo", "/c/emo"),
    });
    expect(result).toEqual({ found: true, path: "/b/emo", source: "PATH" });
  });

  it("skips empty PATH entries rather than searching the working directory", () => {
    const seen: string[] = [];
    resolveEmo({
      platform,
      env: { PATH: ":/a::" },
      isExecutable: (file) => {
        seen.push(file);
        return false;
      },
    });
    expect(seen).toEqual(["/a/emo"]);
  });

  it("does not match PATH case-insensitively on POSIX", () => {
    const result = resolveEmo({ platform, env: { Path: "/a" }, isExecutable: only("/a/emo") });
    expect(result).toEqual({ found: false, reason: "not_on_path", detail: "emo" });
  });

  it("reports not_on_path when PATH is unset", () => {
    expect(resolveEmo({ platform, env: {}, isExecutable: () => true })).toEqual({
      found: false,
      reason: "not_on_path",
      detail: "emo",
    });
  });
});

describe("resolveEmo on Windows", () => {
  const platform = "win32" as const;

  it("tries PATHEXT extensions in order and never the bare name", () => {
    const seen: string[] = [];
    resolveEmo({
      platform,
      env: { Path: "C:\\tools", PATHEXT: ".COM;.EXE" },
      isExecutable: (file) => {
        seen.push(file);
        return false;
      },
    });
    expect(seen).toEqual(["C:\\tools\\emo.com", "C:\\tools\\emo.exe"]);
  });

  it("finds emo.exe with the default PATHEXT and a mixed-case Path variable", () => {
    const result = resolveEmo({
      platform,
      env: { Path: 'C:\\Windows;"C:\\Users\\me\\.local\\bin"' },
      isExecutable: only("C:\\Users\\me\\.local\\bin\\emo.exe"),
    });
    expect(result).toEqual({
      found: true,
      path: "C:\\Users\\me\\.local\\bin\\emo.exe",
      source: "PATH",
    });
  });

  it("accepts EMO_BIN with or without an extension", () => {
    const withExt = resolveEmo({
      platform,
      env: { emo_bin: "C:\\emo\\emo.EXE" },
      isExecutable: only("C:\\emo\\emo.EXE"),
    });
    expect(withExt).toEqual({ found: true, path: "C:\\emo\\emo.EXE", source: "EMO_BIN" });

    const withoutExt = resolveEmo({
      platform,
      env: { EMO_BIN: "C:\\emo\\emo" },
      isExecutable: only("C:\\emo\\emo.cmd"),
    });
    expect(withoutExt).toEqual({ found: true, path: "C:\\emo\\emo.cmd", source: "EMO_BIN" });
  });
});

describe("helpers", () => {
  it("getEnv is case-insensitive only on Windows", () => {
    expect(getEnv({ Path: "x" }, "PATH", true)).toBe("x");
    expect(getEnv({ Path: "x" }, "PATH", false)).toBeUndefined();
  });

  it("pathEntries strips quotes and blanks on Windows and keeps POSIX entries verbatim", () => {
    expect(pathEntries(' "C:\\a b" ;;C:\\c', true)).toEqual(["C:\\a b", "C:\\c"]);
    expect(pathEntries("/a: /b:", false)).toEqual(["/a", " /b"]);
  });

  it("withExtensions ignores PATHEXT entries that are not extensions", () => {
    expect(withExtensions("emo", { PATHEXT: ".EXE;;CMD" }, true)).toEqual(["emo.exe"]);
    expect(withExtensions("emo", {}, false)).toEqual(["emo"]);
  });
});

describe.skipIf(process.platform === "win32")("default executable check", () => {
  it("finds an executable file and skips a non-executable one and a directory", () => {
    const root = mkdtempSync(path.join(tmpdir(), "emo-resolve-"));
    const plain = path.join(root, "plain");
    const dir = path.join(root, "dir");
    const good = path.join(root, "good");
    mkdirSync(plain);
    writeFileSync(path.join(plain, "emo"), "#!/bin/sh\n");
    chmodSync(path.join(plain, "emo"), 0o644);
    mkdirSync(path.join(dir, "emo"), { recursive: true });
    mkdirSync(good);
    writeFileSync(path.join(good, "emo"), "#!/bin/sh\n");
    chmodSync(path.join(good, "emo"), 0o755);

    const result = resolveEmo({ env: { PATH: [plain, dir, good].join(":") } });
    expect(result).toEqual({ found: true, path: path.join(good, "emo"), source: "PATH" });
  });
});
