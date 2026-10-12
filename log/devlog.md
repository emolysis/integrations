# Devlog — integrations

Newest entry first. Format: `standards/devlog.md` in emolysis/rules (private).

## 2026-10-12 · action: preview guard, skill params matched to the engine (green)

- Landed: `github-action/action.yml` fails at its first step, "Preview guard" (`EMOLYSIS_CHECKS_AVAILABLE: "false"`), before validating inputs or installing anything; inputs `path`, `platform` (`databricks`, `snowflake`, `fabric` or empty; `duckdb` dropped) and `emolysis-version` (exact version) and their validation follow `docs/specs/emolysis-checks.md` in emolysis/.github; `tests/action.test.ts` runs the step scripts with bash.
- Landed: skills and the Cursor rule pass `sql`, `dialect` and (for the three platforms only) `platform` to `dialect.lint`; `template.test` is described as certifying the template, not the user's slot values, so the red-test slot loop is gone; params table in `docs/specs/client-integrations.md`; `insufficient_credits` added wherever error codes are listed.
- Landed: install commands for unpublished packages (`emolysis` CLI, `@emolysis/mcp`, the action) sit in sections marked "not yet available", checked by a test; README no longer says the integrations work unchanged once `emo` is installed; CI installs a pinned `claude` CLI (2.1.287) and `task plugin:validate` fails in CI without it (`tests/ci.test.ts`); branches `<area>/<topic>` in `AGENTS.md`; this devlog in the shared format.
- Numbers: 100 tests pass, 1 Windows-only skipped (repository 67, +32; shim 33); 28 config files parse; `task gate` 11 s; `claude plugin validate --strict` passes with 2.1.287 and 2.1.296.
- Decisions: the action's interface is owned by `docs/specs/emolysis-checks.md` in emolysis/.github; the shared `claude.yml` trigger is unchanged (an outsider's `@claude` comment produces a failed run, which is harmless).
- Still open: publishing the CLI and `@emolysis/mcp` under their names is an owner task outside this repository; no command runs a user's filled pipeline on data before deploy; platform templates return `not_implemented` from `template.test`; see `ROADMAP.md` Gaps.
- Next: end-to-end check against a pre-release `emo mcp` (`ROADMAP.md` Current focus 1).

## 2026-10-12 · scaffold: marketplace, plugin, client configs, npm shim, preview action (green)

- Landed: Claude Code marketplace `emolysis` and plugin `emolysis` 0.1.0 (`.mcp.json` runs `emo mcp`; skills dashboard, pipeline, connect, migrate, explain); Cursor `mcp.json` and `rules/emolysis.mdc`; Codex `config.toml`; `@emolysis/mcp` shim (TypeScript, bin `emolysis-mcp`); preview composite action; CI (`task setup && task gate`, plus shim tests on Windows and macOS); docs and specs.
- Numbers: 68 tests pass, 1 Windows-only skipped (shim 33, repository 35); 28 config files parse; `claude plugin validate --strict` passes for marketplace and plugin; a local install from the marketplace loads 5 skills and 1 MCP server.
- Decisions: one server definition (`emolysis`, `emo mcp` over stdio) in every client; the shim exits 127 when `emo` is missing and 126 when it cannot run it; see `docs/specs/client-integrations.md` and `docs/specs/mcp-shim.md`.
- Still open: no real `emo mcp` to test against (CLI not released); shim not on npm; action unusable until the CLI is released; Windows shim path only tested in CI.
- Next: end-to-end check against a pre-release `emo mcp` (`ROADMAP.md` Current focus 1).
