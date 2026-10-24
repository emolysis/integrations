# Roadmap

## Honest assessment (2026-10-12)

Fresh scaffold. The Claude Code marketplace and plugin (MCP server entry and five skills),
the Cursor and Codex configs, the `@emolysis/mcp` shim and a preview GitHub Action exist
and are covered by tests. The plugin and marketplace pass `claude plugin validate
--strict` and install into Claude Code; the shim's resolution, exit-code and signal
handling are tested on Linux.

None of it has run against a real `emo mcp`: the Emolysis CLI is not publicly released.
The skills are written against planned command ids; they check `engine.commands` first and
stop when a command is missing. Where the engine already specifies a command (`engine.*`,
`query.run`, `dialect.*`, `template.*`), the skills pass its params as specified; the
other commands' params are not specified yet. The GitHub Action is guarded off: its first
step fails until the CLI is released. Nothing is published to npm, PyPI or the GitHub
Marketplace. No users yet.

## Current focus

Month-one goal: the Claude Code plugin and `emo mcp` working from Claude Code, Cursor and
Codex.

1. End-to-end check of the plugin, Cursor and Codex against a pre-release `emo mcp` as
   soon as one exists: install, `engine.doctor`, `template.list`, one pipeline skill run.
2. Check the skill steps for the planned commands (`platform.*`, `catalog.*`,
   `sample.run`, `bi.bind`, `pipeline.deploy`, `chart.emit`) against
   their params once the engine specifies them.
3. Publish `@emolysis/mcp` to npm once `emo` installs from PyPI.

## Gaps

- No end-to-end test against a real `emo mcp`; tests check files and the shim only.
- Skill steps for the planned commands describe their params in words; they need checking
  against the engine's spec once those commands are specified.
- No command runs the user's filled pipeline on their data before deploying:
  `template.test` runs only a template's own golden cases, so the skills check user slot
  values with `template.render` and `dialect.lint` only, and say so in their report.
- Platform (non-DuckDB) templates cannot be tested locally yet (`template.test` returns
  `not_implemented`), so the pipeline skill stops before deploying on Databricks,
  Snowflake and Fabric.
- `@emolysis/mcp` is not published; the npm scope and package need setting up.
- The GitHub Action is a preview: its guard step fails until the CLI is released; no `v0`
  tag yet.
- The shim's Windows path (`PATHEXT`, `.cmd` through `cmd.exe`) runs only in the CI
  Windows job, not locally.
- No one-click install links for Cursor yet.
- No skill evals (`claude plugin eval`) yet.

## Done

- 2026-10-12: review fixes: preview guard and emolysis-checks inputs for the action;
  skill params for `dialect.lint` and `template.test` match the engine; unreleased
  install commands marked not yet available; plugin validation enforced in CI.
- 2026-10-12: scaffold: marketplace, plugin with five skills, Cursor rule and MCP config,
  Codex config, `@emolysis/mcp` shim with tests, preview action, CI and docs.
