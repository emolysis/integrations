# Devlog — integrations

Newest entry first. Format: `standards/devlog.md` in emolysis/rules (private).

## 2026-10-18 · docs: an account for everything (green)

- Landed: `docs/architecture.md` no longer says the server works on local files without
  an account. Every data command needs `emo login` (founder decision D20, 2026-10-18);
  only `engine.version`, `engine.doctor` and `engine.commands` work without one. The
  skills already stop cleanly on `auth_required`, so nothing else changes.
- Numbers: docs only.
- Still open: none.

## 2026-10-18 · docs: architecture review in AGENTS.md (green)

- Landed: one ground rule in `AGENTS.md`: a contract change is checked with the architect
  session before code; milestones and deviations are reported to it (emolysis/rules
  `standards/architecture-review.md`).
- Numbers: docs only.
- Still open: none.

## 2026-10-18 · docs: the new positioning (green)

- Landed: `README.md` and `AGENTS.md` open with the positioning: "An entire data team. One
  download.", the agentic lakehouse for data engineering and analytics, a team of agents
  you direct from your laptop. Unreleased things stay in the future tense; status unchanged.
- Numbers: docs only.
- Still open: plugin, marketplace and shim descriptions take the new words when they are next published.

## 2026-10-13 · skills: `rate_limited` joins the shared error codes (green)

- Landed: `rate_limited`, the ninth shared error code, wherever the codes are listed or handled: the dashboard, pipeline, connect and migrate skills and the Cursor rule (wait the seconds the error gives in `retry_after_seconds`, retry once; with no wait given or a second refusal, tell the user and stop), rule 7 in `docs/specs/client-integrations.md`, the code list in `docs/architecture.md`. New `tests/error-codes.test.ts`: the architecture list is the shared set, the spec rule handles every code, each Errors section handles only shared codes and always `insufficient_credits`, `rate_limited` and `internal`, and the `rate_limited` guidance retries once after the wait, then stops.
- Numbers: 112 tests pass, 1 Windows-only skipped (repository 79, +12; shim 33); 28 config files parse; `task gate` 13 s; `claude plugin validate --strict` passes.
- Still open: the explain skill has no Errors section (read-only); the CLI is not released, so the guidance is untested against a real `emo mcp`; see `ROADMAP.md` Gaps.

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
