# Emolysis integrations

**An entire data team. One download.** [Emolysis](https://github.com/emolysis) is the
agentic lakehouse for data engineering and analytics. Direct a team of agents from your
laptop to investigate business questions, develop dashboards, and build and test pipelines
for your data platform.

This repository holds its client integrations. Everything here is a thin layer over one
MCP server, `emo mcp`, which ships with the Emolysis CLI (`emo`). This repository
contains no engine code.

## Status

Fresh scaffold (October 2026); Emolysis itself is in public beta for macOS. The configs,
the Claude Code plugin and the npm shim are written and tested here. The desktop app
carries the Emolysis CLI (`emo`) and its MCP server (`emo mcp`), but **`emo` on your `PATH`
is not yet available**, so these integrations have nothing to start until it is. The
skills check what the installed CLI provides; expect changes as it ships. Nothing is
published to npm, PyPI or the GitHub Marketplace yet. See [ROADMAP.md](ROADMAP.md).

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

**Not yet available:** `emo` on your `PATH`. The desktop app carries the CLI, and how it
reaches your `PATH` is not decided yet. This repository assumes `uv tool install emolysis`
for now, which may change.
Emolysis has not published a package under that name (nor `@emolysis/mcp` on npm): do not
install anything under these names until this README says they are released. Until then
the client setups below install, but their server has nothing to start.

An Emolysis account is required for every use; the server asks you to sign in. Local
files run on DuckDB on your machine; connecting a platform or publishing a dashboard
needs the rights you hold there.

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
