#!/usr/bin/env node
import { main } from "./main.js";

const result = await main({
  argv: process.argv.slice(2),
  env: process.env,
  platform: process.platform,
  stderr: process.stderr,
});

if (result.signal !== undefined && process.platform !== "win32") {
  // Die from the same signal so the MCP client sees what emo saw. If the signal
  // does not end the process, it exits with 128 + signal number instead.
  process.exitCode = result.exitCode;
  process.kill(process.pid, result.signal);
} else {
  process.exit(result.exitCode);
}
