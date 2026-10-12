# Spec: `@emolysis/mcp` shim

An npm package whose only job is to start `emo mcp` for MCP clients that launch servers
through `npx`. It contains no MCP logic: the client talks to `emo mcp` directly over the
inherited stdio.

## Interface

- Package `@emolysis/mcp`, bin `emolysis-mcp`, ESM, Node >= 22, no runtime dependencies.
- `emolysis-mcp [args...]` runs `emo mcp [args...]`.

## Finding emo

1. `EMO_BIN` (trimmed, non-empty): use it if it is an executable file. On Windows a value
   without a `PATHEXT` extension is tried with each extension. If nothing matches, stop
   with `emo_bin_invalid`; do not fall back to `PATH` (an explicit setting that is wrong
   should be visible).
2. `PATH`, in order. Empty entries are skipped (never the working directory).
   - POSIX: candidate `<dir>/emo`; must be a regular file with execute permission.
   - Windows: the variable name is matched without regard to case (`Path`); entries are
     trimmed and unquoted; candidates are `<dir>\emo<ext>` for each `PATHEXT` extension
     (default `.COM;.EXE;.BAT;.CMD`), never the bare name; must be a regular file.

## Running emo

- `spawn` with `stdio: "inherit"` and the shim's environment.
- Windows `.cmd` / `.bat`: Node refuses to spawn them directly, so run
  `%ComSpec% /d /s /c "<command> <args>"` with `windowsVerbatimArguments`, the command
  escaped for cmd.exe metacharacters and each argument quoted for the C runtime parser and
  then escaped for cmd.exe.
- SIGINT, SIGTERM and SIGHUP received by the shim are forwarded to emo; the shim keeps
  running until emo exits.

## Exit

| Situation                              | Shim result                                                  |
| -------------------------------------- | ------------------------------------------------------------ |
| emo exits with code N                  | exit N                                                       |
| emo is killed by signal S (POSIX)      | re-raise S on itself; if it survives, exit 128 + signal no.  |
| emo not found (`PATH` or `EMO_BIN`)    | one line on stderr naming the fix and install link; exit 127 |
| spawn fails with ENOENT                | message on stderr; exit 127                                  |
| spawn fails with EACCES                | message on stderr; exit 126                                  |
| spawn fails otherwise (including sync) | message on stderr; exit 1                                    |

The shim writes nothing to stdout (stdout belongs to the MCP protocol).

## Tests

`packages/mcp-shim/test`: resolution on simulated POSIX and Windows environments,
a real executable-bit check, cmd.exe quoting, signal forwarding with a fake process,
exit-code mapping, and process tests with a stand-in `emo` script (POSIX) or `emo.cmd`
(Windows CI job).
