import { spawn, type ChildProcess } from "node:child_process";
import { constants } from "node:os";
import { getEnv } from "./resolve.js";

export interface ExitStatus {
  code: number | null;
  signal: NodeJS.Signals | null;
}

export type RunOutcome =
  { kind: "exit"; status: ExitStatus } | { kind: "error"; error: NodeJS.ErrnoException };

export interface SpawnPlan {
  command: string;
  args: string[];
  windowsVerbatimArguments: boolean;
}

export interface RunOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}

export interface Running {
  /** Absent when the process could not be started at all. */
  child?: ChildProcess;
  done: Promise<RunOutcome>;
}

/** Signals the shim passes on to emo. Windows only ever delivers SIGINT and SIGHUP. */
export const FORWARDED_SIGNALS: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];

// Characters cmd.exe treats specially; each is escaped with ^.
const CMD_META = /([()\][%!^"`<>&|;, *?])/g;

/**
 * How to start `file` with `args`. Node refuses to spawn .cmd and .bat files
 * directly on Windows, so those go through cmd.exe with every part escaped.
 */
export function spawnPlan(
  file: string,
  args: readonly string[],
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): SpawnPlan {
  if (platform === "win32" && /\.(cmd|bat)$/i.test(file)) {
    const shell = getEnv(env, "ComSpec", true) ?? "cmd.exe";
    const line = [quoteCmdCommand(file), ...args.map(quoteCmdArg)].join(" ");
    return {
      command: shell,
      args: ["/d", "/s", "/c", `"${line}"`],
      windowsVerbatimArguments: true,
    };
  }
  return { command: file, args: [...args], windowsVerbatimArguments: false };
}

/** Quotes one argument for the Windows C runtime parser, then escapes it for cmd.exe. */
export function quoteCmdArg(arg: string): string {
  const quoted = arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, "$1$1");
  return `"${quoted}"`.replace(CMD_META, "^$1");
}

/** Escapes the command path for cmd.exe. */
export function quoteCmdCommand(file: string): string {
  return file.replace(CMD_META, "^$1");
}

/** Starts emo with inherited stdio. `done` settles once, on exit or on a failed start. */
export function runEmo(file: string, args: readonly string[], options: RunOptions = {}): Running {
  const env = options.env ?? process.env;
  const plan = spawnPlan(file, args, options.platform ?? process.platform, env);
  let child: ChildProcess;
  try {
    child = spawn(plan.command, plan.args, {
      stdio: "inherit",
      env,
      windowsHide: true,
      windowsVerbatimArguments: plan.windowsVerbatimArguments,
    });
  } catch (error) {
    // spawn throws synchronously for invalid arguments, such as a NUL byte in the path.
    return { done: Promise.resolve({ kind: "error", error: error as NodeJS.ErrnoException }) };
  }
  const done = new Promise<RunOutcome>((resolve) => {
    child.once("exit", (code, signal) => resolve({ kind: "exit", status: { code, signal } }));
    child.on("error", (error: NodeJS.ErrnoException) => {
      // Only a failed start settles here; a later error (a failed kill) is followed by exit.
      if (child.pid === undefined) resolve({ kind: "error", error });
    });
  });
  return { child, done };
}

export interface SignalSource {
  on(signal: NodeJS.Signals, listener: () => void): unknown;
  off(signal: NodeJS.Signals, listener: () => void): unknown;
}

export interface Killable {
  kill(signal?: NodeJS.Signals): boolean;
}

/** Passes the listed signals from `source` to `child`. Returns a function that stops it. */
export function forwardSignals(
  child: Killable,
  source: SignalSource = process,
  signals: readonly NodeJS.Signals[] = FORWARDED_SIGNALS,
): () => void {
  const listeners = signals.map((signal) => {
    const listener = (): void => {
      child.kill(signal);
    };
    source.on(signal, listener);
    return [signal, listener] as const;
  });
  return () => {
    for (const [signal, listener] of listeners) source.off(signal, listener);
  };
}

/** The exit code a shell would report for this status: the code, or 128 + signal number. */
export function exitCodeFor(status: ExitStatus): number {
  if (status.code !== null) return status.code;
  if (status.signal !== null) {
    const number = (constants.signals as Partial<Record<NodeJS.Signals, number>>)[status.signal];
    return number === undefined ? 1 : 128 + number;
  }
  return 1;
}
