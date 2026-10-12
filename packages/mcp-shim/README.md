# @emolysis/mcp

Starts the Emolysis MCP server for MCP clients that launch servers through npm. It finds
the Emolysis CLI and runs `emo mcp` with the client's stdio, so the client talks to the
real server directly.

**Status:** not published to npm yet, and the Emolysis CLI it launches is not publicly
released yet.

## Usage

**Not yet available:** the package is not on npm. Do not run `npx @emolysis/mcp` before it
is published; until then, build the shim from this repository (see Development).

```json
{
  "mcpServers": {
    "emolysis": { "command": "npx", "args": ["-y", "@emolysis/mcp"] }
  }
}
```

Extra arguments are passed on: `emolysis-mcp --foo` runs `emo mcp --foo`.

## How it finds emo

1. `EMO_BIN`, if set: the path to the emo executable. If it does not point at an
   executable file, the shim stops there instead of searching `PATH`.
2. Each directory on `PATH`, in order. On Windows the variable name is matched without
   regard to case, quoted entries are unquoted, and `emo` is tried with each `PATHEXT`
   extension (`.exe`, `.cmd`, ...). `.cmd` and `.bat` files are run through `cmd.exe`
   with escaped arguments.

## Exit codes and signals

- emo's exit code is passed through. If emo dies from a signal, the shim re-raises the
  same signal on itself (exit status 128 + signal number where that is not possible).
- SIGINT, SIGTERM and SIGHUP sent to the shim are forwarded to emo, and the shim waits
  for emo to exit.
- 127: emo was not found. The shim prints one line to stderr that says how to install it
  or set `EMO_BIN`.
- 126: emo was found but could not be executed.

## Development

From the repository root: `task setup`, then `task test:shim` or `task gate`. The code is
in `src/` (`resolve.ts` finds emo, `run.ts` spawns it, `main.ts` ties them together,
`cli.ts` is the bin) and compiles with `tsc` to `dist/`.

## License

MIT. The Emolysis name and logo are not covered by the license; see NOTICE.
