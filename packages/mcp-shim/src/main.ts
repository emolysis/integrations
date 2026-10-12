import { resolveEmo, type Resolution } from "./resolve.js";
import { exitCodeFor, forwardSignals, runEmo, type SignalSource } from "./run.js";

export const INSTALL_URL = "https://github.com/emolysis/integrations#install";

/** Exit code when emo cannot be found, as a shell reports for an unknown command. */
export const EXIT_NOT_FOUND = 127;
/** Exit code when emo was found but could not be executed. */
export const EXIT_NOT_EXECUTABLE = 126;

export interface MainOptions {
  /** Extra arguments, passed to `emo mcp` after `mcp`. */
  argv: readonly string[];
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  stderr: { write(text: string): unknown };
  signals?: SignalSource;
}

export interface MainResult {
  exitCode: number;
  /** Set when emo was terminated by a signal, so the caller can re-raise it. */
  signal?: NodeJS.Signals;
}

/** Runs `emo mcp` and reports how it ended. Never throws. */
export async function main(options: MainOptions): Promise<MainResult> {
  const resolution = resolveEmo({ env: options.env, platform: options.platform });
  if (!resolution.found) {
    options.stderr.write(missingMessage(resolution));
    return { exitCode: EXIT_NOT_FOUND };
  }

  const running = runEmo(resolution.path, ["mcp", ...options.argv], {
    env: options.env,
    platform: options.platform,
  });
  const stop = running.child ? forwardSignals(running.child, options.signals) : () => {};
  const outcome = await running.done;
  stop();

  if (outcome.kind === "error") {
    const code = outcome.error.code;
    options.stderr.write(
      `emolysis-mcp: could not start ${resolution.path}: ${outcome.error.message}\n`,
    );
    if (code === "ENOENT") return { exitCode: EXIT_NOT_FOUND };
    if (code === "EACCES") return { exitCode: EXIT_NOT_EXECUTABLE };
    return { exitCode: 1 };
  }

  const exitCode = exitCodeFor(outcome.status);
  return outcome.status.signal === null
    ? { exitCode }
    : { exitCode, signal: outcome.status.signal };
}

/** The one message printed when emo cannot be found. */
export function missingMessage(resolution: Extract<Resolution, { found: false }>): string {
  if (resolution.reason === "emo_bin_invalid") {
    return (
      `emolysis-mcp: EMO_BIN is set to "${resolution.detail}", which is not an executable file. ` +
      `Point EMO_BIN at the emo executable, or unset it to search PATH. Install: ${INSTALL_URL}\n`
    );
  }
  return (
    `emolysis-mcp: cannot find the Emolysis CLI ("emo") on PATH. ` +
    `Install it (${INSTALL_URL}) or set EMO_BIN to the full path of the emo executable.\n`
  );
}
