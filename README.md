# Emolysis integrations

Client integrations for [Emolysis](https://github.com/emolysis), a local-first agent for
data engineering and BI on Databricks, Snowflake and Microsoft Fabric. Everything here is
a thin layer over one MCP server, `emo mcp`, which ships with the Emolysis CLI (`emo`).
This repository contains no engine code.

## Status

Fresh scaffold (October 2026). The configs, the Claude Code plugin and the npm shim are
written and tested here, but **the Emolysis CLI is not publicly released yet**, so these
integrations have nothing to talk to until it is. The skills are written against planned
command ids and check what the installed CLI provides; expect changes once the CLI is
released. Nothing is published to npm, PyPI or the GitHub Marketplace yet. See
[ROADMAP.md](ROADMAP.md).

## What is here

| Path                                      | What                                                             |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `.claude-plugin/marketplace.json`         | Claude Code marketplace `emolysis`                               |
| [`claude-code/`](claude-code)             | Claude Code plugin `emolysis`: the MCP server plus five skills   |
| [`cursor/`](cursor)                       | Cursor MCP config and a project rule                             |
| [`codex/`](codex)                         | Codex `config.toml` snippet                                      |
| [`packages/mcp-shim/`](packages/mcp-shim) | `@emolysis/mcp`: npm launcher for `emo mcp` (not published yet)  |
| [`github-action/`](github-action)         | `Emolysis checks (preview)` composite action (not yet available) |
| [`docs/`](docs)                           | Architecture, development and contributing guides                |

## Install

Every client needs the Emolysis CLI (`emo`) on `PATH`.

**Not yet available:** the CLI is not released, and how it will be distributed is not
decided yet. This repository assumes `uv tool install emolysis` for now, which may change.
Emolysis has not published a package under that name (nor `@emolysis/mcp` on npm): do not
install anything under these names until this README says they are released. Until then
the client setups below install, but their server has nothing to start.

Without an Emolysis account the server works on local files with DuckDB. Connecting a
platform or publishing a dashboard asks you to sign in.

### Claude Code

```text
/plugin marketplace add emolysis/integrations
/plugin install emolysis@emolysis
```

On Claude Code 2.1.275 or later, one step does both:

```text
/plugin install emolysis --marketplace emolysis/integrations
```

The plugin starts `emo mcp` and adds five skills: `/emolysis:dashboard`,
`/emolysis:pipeline`, `/emolysis:connect`, `/emolysis:migrate` and `/emolysis:explain`.
See [claude-code/README.md](claude-code/README.md).

### Cursor

Copy [`cursor/mcp.json`](cursor/mcp.json) to `.cursor/mcp.json` in your project (or merge
its `emolysis` entry into `~/.cursor/mcp.json`), and copy
[`cursor/rules/emolysis.mdc`](cursor/rules/emolysis.mdc) to `.cursor/rules/emolysis.mdc`.
See [cursor/README.md](cursor/README.md).

### Codex

```sh
codex mcp add emolysis -- emo mcp
```

or add the table in [`codex/config.toml`](codex/config.toml) to `~/.codex/config.toml`.
See [codex/README.md](codex/README.md).

### Any MCP client

Run `emo mcp` as a stdio server:

```json
{ "mcpServers": { "emolysis": { "command": "emo", "args": ["mcp"] } } }
```

**Not yet available:** clients that prefer to launch servers through npm will be able to use
`npx -y @emolysis/mcp` once the shim is published; it finds `emo` (or `EMO_BIN`) and runs
`emo mcp`. Do not run it before then.

## Tools

The server exposes each Emolysis engine command as one MCP tool, named after the command
id with the dot replaced by an underscore: `engine.doctor` is `engine_doctor`. Call
`engine.commands` to list what your installed version provides. The skills and the Cursor
rule check that list first and say so when a command they need is not available yet.

## Development

```sh
task setup   # pnpm install --frozen-lockfile
task gate    # format check, config checks, actionlint, typecheck, tests, build, plugin validation
```

Needs Node 22+, pnpm 10, [Task](https://taskfile.dev) and uv (for actionlint). See
[docs/development.md](docs/development.md) and [docs/contributing.md](docs/contributing.md).

## License and trademarks

The code is MIT licensed ([LICENSE](LICENSE)). The license does not cover the Emolysis name
or logo; see [NOTICE](NOTICE).
