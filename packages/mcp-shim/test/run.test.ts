import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import {
  exitCodeFor,
  forwardSignals,
  quoteCmdArg,
  quoteCmdCommand,
  runEmo,
  spawnPlan,
  type SignalSource,
} from "../src/run.js";

describe("spawnPlan", () => {
  it("runs executables directly", () => {
    expect(spawnPlan("/usr/bin/emo", ["mcp"], "linux", {})).toEqual({
      command: "/usr/bin/emo",
      args: ["mcp"],
      windowsVerbatimArguments: false,
    });
    expect(spawnPlan("C:\\bin\\emo.exe", ["mcp"], "win32", {})).toEqual({
      command: "C:\\bin\\emo.exe",
      args: ["mcp"],
      windowsVerbatimArguments: false,
    });
  });

  it("routes .cmd and .bat through cmd.exe with escaping", () => {
    const plan = spawnPlan("C:\\Program Files\\emo\\emo.CMD", ["mcp", "a&b"], "win32", {
      ComSpec: "C:\\Windows\\system32\\cmd.exe",
    });
    expect(plan).toEqual({
      command: "C:\\Windows\\system32\\cmd.exe",
      args: ["/d", "/s", "/c", '"C:\\Program^ Files\\emo\\emo.CMD ^"mcp^" ^"a^&b^""'],
      windowsVerbatimArguments: true,
    });
  });

  it("treats .cmd as a plain file on POSIX", () => {
    expect(spawnPlan("/x/emo.cmd", [], "darwin", {}).command).toBe("/x/emo.cmd");
  });
});

describe("cmd quoting", () => {
  it("escapes quotes and the backslashes before them", () => {
    expect(quoteCmdArg('say "hi"')).toBe('^"say^ \\^"hi\\^"^"');
    expect(quoteCmdArg("dir\\")).toBe('^"dir\\\\^"');
  });

  it("escapes every cmd.exe metacharacter", () => {
    expect(quoteCmdArg("%PATH%|x>y")).toBe('^"^%PATH^%^|x^>y^"');
    expect(quoteCmdCommand("C:\\a (x86)\\emo.bat")).toBe("C:\\a^ ^(x86^)\\emo.bat");
  });
});

describe("forwardSignals", () => {
  it("passes each forwarded signal to the child until stopped", () => {
    const source = new EventEmitter();
    const killed: (NodeJS.Signals | undefined)[] = [];
    const stop = forwardSignals(
      {
        kill: (signal) => {
          killed.push(signal);
          return true;
        },
      },
      source as unknown as SignalSource,
    );
    source.emit("SIGTERM");
    source.emit("SIGINT");
    source.emit("SIGUSR1");
    stop();
    source.emit("SIGTERM");
    expect(killed).toEqual(["SIGTERM", "SIGINT"]);
    expect(source.listenerCount("SIGTERM")).toBe(0);
  });
});

describe("exitCodeFor", () => {
  it("uses the exit code when there is one", () => {
    expect(exitCodeFor({ code: 0, signal: null })).toBe(0);
    expect(exitCodeFor({ code: 3, signal: null })).toBe(3);
  });

  it("maps a signal to 128 + its number", () => {
    expect(exitCodeFor({ code: null, signal: "SIGTERM" })).toBe(143);
    expect(exitCodeFor({ code: null, signal: "SIGINT" })).toBe(130);
  });

  it("falls back to 1", () => {
    expect(exitCodeFor({ code: null, signal: null })).toBe(1);
  });
});

describe("runEmo", () => {
  it("reports the child's exit code", async () => {
    const { done } = runEmo(process.execPath, ["-e", "process.exit(7)"]);
    await expect(done).resolves.toEqual({ kind: "exit", status: { code: 7, signal: null } });
  });

  it("reports a missing executable as an error, not an exit", async () => {
    const { done } = runEmo("/definitely/not/here/emo", ["mcp"]);
    const outcome = await done;
    expect(outcome.kind).toBe("error");
    expect(outcome.kind === "error" && outcome.error.code).toBe("ENOENT");
  });

  it("reports arguments spawn rejects synchronously as an error", async () => {
    const { child, done } = runEmo("emo\0bad", ["mcp"]);
    expect(child).toBeUndefined();
    expect((await done).kind).toBe("error");
  });

  it.skipIf(process.platform === "win32")("reports a signal that ended the child", async () => {
    const { done } = runEmo(process.execPath, ["-e", "process.kill(process.pid, 'SIGTERM')"]);
    await expect(done).resolves.toEqual({
      kind: "exit",
      status: { code: null, signal: "SIGTERM" },
    });
  });
});
