# Development

## Toolchain

- Node 22 or later and pnpm 10 (`corepack enable` picks the version from `packageManager`).
- [Task](https://taskfile.dev) 3. `uv tool install go-task-bin` or `npm i -g @go-task/cli`.
- uv, for actionlint (`uvx`) in `task lint`.
- Optional locally: the `claude` CLI, for `task plugin:validate`. Without it the task prints
  that it skipped; the manifest tests still run. In CI (`CI` set) a missing `claude` fails
  the gate; `ci.yml` installs a pinned version.

## Loop

```sh
task setup        # pnpm install --frozen-lockfile
task fmt          # prettier --write .
task test         # vitest: shim + repository tests
task gate         # what CI runs; must pass before you finish
```

`task --list` shows every task.

## Layout

```
.claude-plugin/marketplace.json   Claude Code marketplace
claude-code/                      plugin: .claude-plugin/plugin.json, .mcp.json, skills/
cursor/                           mcp.json, rules/emolysis.mdc
codex/                            config.toml
github-action/                    action.yml (preview)
packages/mcp-shim/                @emolysis/mcp: src/, test/, dist/ (built, ignored)
scripts/check-configs.mjs         parses every JSON/YAML/TOML file and frontmatter block
tests/                            repository tests: manifests, client configs, links
docs/                             this file, architecture, contributing, specs/
log/devlog.md                     dev log
```

## Trying the plugin locally

```sh
claude --plugin-dir ./claude-code          # load the plugin for one session
claude plugin validate --strict .          # marketplace
claude plugin validate --strict ./claude-code
```

Or register the clone as a marketplace: `/plugin marketplace add ./` then
`/plugin install emolysis@emolysis`. Without an `emo` on `PATH` the MCP server fails to
start; that is expected until the CLI is released.

## Trying the shim

```sh
task build
EMO_BIN=/path/to/emo node packages/mcp-shim/dist/cli.js
```

Without `emo` it prints one line and exits 127. A stand-in `emo` script that echoes its
arguments is enough to see the argument passing, exit codes and signal forwarding.

## Adding a skill

1. Specify it in `docs/specs/client-integrations.md` (when to use, slots, tool order).
2. Add `claude-code/skills/<name>/SKILL.md` with `name` (same as the directory) and
   `description` (what it does and "Use when ...") in the frontmatter.
3. Add the name to `SKILLS` in `tests/integrations.test.ts`; use only known command ids.
4. Mirror the behavior in `cursor/rules/emolysis.mdc` if Cursor users need it.
5. `task gate`, devlog entry.

## Releasing (planned)

Nothing is released yet. The plugin is served from `main` through the marketplace; bump
`version` in `claude-code/.claude-plugin/plugin.json` for every user-visible change.
Publishing `@emolysis/mcp` to npm and tagging the action (`v0`) wait for the CLI release.

When the CLI is released:

1. Confirm that the `emolysis` CLI package and the `@emolysis` npm scope are published by
   Emolysis before any doc calls their install commands available.
2. Set `EMOLYSIS_CHECKS_AVAILABLE: "true"` in `github-action/action.yml` in step with the
   `emolysis-checks` reusable workflow in emolysis/.github, and update the action tests.
3. Drop the "not yet available" markers from the sections that show those commands.
