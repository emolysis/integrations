# Architecture

Every integration in this repository is configuration or a small launcher around one MCP
server. The Emolysis CLI provides that server as `emo mcp`; this repository does not
contain or depend on engine code.

```
 Claude Code ──plugin (.mcp.json + skills)──┐
 Cursor ──────.cursor/mcp.json + rule ──────┤
 Codex ───────config.toml ──────────────────┼──stdio──▶ emo mcp  (Emolysis CLI, installed separately)
 Any MCP client ────────────────────────────┤
 @emolysis/mcp shim ─finds emo, spawns it───┘
 GitHub Actions ──github-action (preview)──────────────▶ emo check  (planned; guarded off)
```

## The MCP surface

- One server, named `emolysis` in every client config, started as `emo mcp` over stdio.
- Each engine command is one tool. The command id is `<area>.<verb>` (`template.list`);
  the tool name replaces the dot with an underscore (`template_list`).
- `engine.commands` lists the commands the installed CLI provides, with their parameter
  schemas. Integrations call it first and adapt to what is there.
- Tools return a result or a typed error. Error codes: `invalid_params`, `not_found`,
  `not_implemented`, `auth_required`, `platform_error`, `conflict`, `internal`,
  `insufficient_credits`.
- Without an account the server works against local files with DuckDB. Platform
  commands return `auth_required` until the user signs in.

## Components

| Component                         | Kind                    | Notes                                                               |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------- |
| `.claude-plugin/marketplace.json` | Claude Code marketplace | Name `emolysis`; one entry, `./claude-code`                         |
| `claude-code/`                    | Claude Code plugin      | `plugin.json`, `.mcp.json`, five skills in `skills/<name>/SKILL.md` |
| `cursor/`                         | Config to copy          | `mcp.json` and an "apply intelligently" rule `rules/emolysis.mdc`   |
| `codex/`                          | Config to copy          | `[mcp_servers.emolysis]` table for `config.toml`                    |
| `packages/mcp-shim/`              | npm package             | `@emolysis/mcp`, bin `emolysis-mcp`; see `docs/specs/mcp-shim.md`   |
| `github-action/`                  | Composite action        | Preview, not yet available: its first step fails, nothing installed |

## Skills

The skills and the Cursor rule encode one way of working: check the engine, find the
target platform, use templates and their golden tests instead of hand-written pipeline
code, ask the user only for missing values, and deploy or publish only after a green test
and an explicit yes. `docs/specs/client-integrations.md` lists each skill's tools in order.

## Checks

`task gate` checks this repository's files, not the engine: formatting, that every JSON,
YAML, TOML and frontmatter block parses, actionlint on workflows, consistency between the
marketplace, plugin and client configs, the command ids skills may use, GitHub links,
the shim's unit and process tests, the shim build, and `claude plugin validate --strict`.
Locally the plugin validation is skipped when the `claude` CLI is missing; in CI
(`CI` set) a missing CLI fails the gate, and `ci.yml` installs a pinned one.

The GitHub Action follows the interface of the `emolysis-checks` reusable workflow in
emolysis/.github (its `docs/specs/emolysis-checks.md` owns it) and has the same preview
guard: while the CLI is unreleased its first step fails before anything is installed.
