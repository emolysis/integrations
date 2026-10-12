import { accessSync, constants, statSync } from "node:fs";
import path from "node:path";

/** Where the emo executable was found, or why it was not. */
export type Resolution =
  | { found: true; path: string; source: "EMO_BIN" | "PATH" }
  | { found: false; reason: "emo_bin_invalid" | "not_on_path"; detail: string };

export interface ResolveOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  /** Returns true when `file` is a file this platform can execute. */
  isExecutable?: (file: string) => boolean;
}

const EXECUTABLE = "emo";
const DEFAULT_PATHEXT = ".COM;.EXE;.BAT;.CMD";

/**
 * Finds the emo executable: `EMO_BIN` first, then each `PATH` entry in order.
 * Windows rules: environment names are case-insensitive, PATH entries may be
 * quoted, and candidates are `emo` plus each `PATHEXT` extension.
 */
export function resolveEmo(options: ResolveOptions = {}): Resolution {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const isExecutable =
    options.isExecutable ?? ((file: string) => defaultIsExecutable(file, platform));
  const win = platform === "win32";

  const emoBin = getEnv(env, "EMO_BIN", win)?.trim();
  if (emoBin) {
    for (const candidate of withExtensions(emoBin, env, win)) {
      if (isExecutable(candidate)) return { found: true, path: candidate, source: "EMO_BIN" };
    }
    return { found: false, reason: "emo_bin_invalid", detail: emoBin };
  }

  const join = win ? path.win32.join : path.posix.join;
  for (const dir of pathEntries(getEnv(env, "PATH", win) ?? "", win)) {
    for (const candidate of withExtensions(join(dir, EXECUTABLE), env, win)) {
      if (isExecutable(candidate)) return { found: true, path: candidate, source: "PATH" };
    }
  }
  return { found: false, reason: "not_on_path", detail: EXECUTABLE };
}

/** Reads an environment variable; on Windows the name is matched case-insensitively. */
export function getEnv(env: NodeJS.ProcessEnv, name: string, win: boolean): string | undefined {
  if (!win) return env[name];
  const upper = name.toUpperCase();
  const key = Object.keys(env).find((k) => k.toUpperCase() === upper);
  return key === undefined ? undefined : env[key];
}

/** Splits PATH into directories, dropping empty entries and Windows quotes. */
export function pathEntries(value: string, win: boolean): string[] {
  return value
    .split(win ? ";" : ":")
    .map((entry) => (win ? entry.trim().replace(/^"(.*)"$/, "$1") : entry))
    .filter((entry) => entry.length > 0);
}

/**
 * Candidate file names for `file`. On Windows a name that already ends in one of
 * the PATHEXT extensions is tried as is; any other name is tried with each
 * extension appended, because Windows cannot execute a file without one.
 */
export function withExtensions(file: string, env: NodeJS.ProcessEnv, win: boolean): string[] {
  if (!win) return [file];
  const extensions = (getEnv(env, "PATHEXT", win) ?? DEFAULT_PATHEXT)
    .split(";")
    .map((ext) => ext.trim())
    .filter((ext) => ext.startsWith("."));
  const lower = file.toLowerCase();
  if (extensions.some((ext) => lower.endsWith(ext.toLowerCase()))) return [file];
  return extensions.map((ext) => file + ext.toLowerCase());
}

function defaultIsExecutable(file: string, platform: NodeJS.Platform): boolean {
  try {
    if (!statSync(file).isFile()) return false;
    if (platform !== "win32") accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
