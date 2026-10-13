# Spec: client integrations

How each client reaches Emolysis, and what the Claude Code skills and the Cursor rule do.

## Server definition

Every client config declares the same server:

| Field     | Value      |
| --------- | ---------- |
| name      | `emolysis` |
| transport | stdio      |
| command   | `emo`      |
| args      | `["mcp"]`  |

Clients that require it also get `"type": "stdio"` (Claude Code `.mcp.json`, Cursor
`mcp.json`). Codex uses `[mcp_servers.emolysis]` with `tool_timeout_sec = 300`.

## Command ids the integrations may use

Tool name = command id with `.` replaced by `_`. Integrations treat every command except
`engine.doctor` and `engine.commands` as possibly absent in the installed CLI and degrade
when it is missing.

| Id                  | Used by                               |
| ------------------- | ------------------------------------- |
| `engine.version`    | (diagnostics)                         |
| `engine.doctor`     | every skill, first step               |
| `engine.commands`   | every skill, second step              |
| `query.run`         | dashboard, pipeline, migrate, explain |
| `dialect.transpile` | migrate                               |
| `dialect.lint`      | dashboard, pipeline, migrate, explain |
| `template.list`     | dashboard, pipeline, migrate, explain |
| `template.render`   | dashboard, pipeline, migrate          |
| `template.test`     | dashboard, pipeline, migrate          |
| `platform.connect`  | connect                               |
| `platform.status`   | dashboard, pipeline, connect          |
| `catalog.search`    | dashboard, pipeline                   |
| `catalog.mirror`    | connect                               |
| `sample.run`        | dashboard                             |
| `bi.bind`           | dashboard                             |
| `pipeline.deploy`   | dashboard, pipeline, migrate          |
| `chart.emit`        | dashboard                             |
| `dashboard.publish` | dashboard                             |
| `project.init`      | (none yet)                            |

`tests/integrations.test.ts` keeps this list (`KNOWN_COMMANDS`) and fails on any other
dotted id in backticks in a skill or the Cursor rule. Add an id here and there together.

## Params the skills pass

Skills name params exactly as the engine's command spec defines them. For the commands the
engine implements today:

| Id                  | Params                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `engine.doctor`     | none                                                                                          |
| `engine.commands`   | `include_schema` (skills pass `false`)                                                        |
| `query.run`         | `sql`; optional `database` (existing DuckDB file), `read_only`, `max_rows`                    |
| `dialect.transpile` | `sql`, `read` (default `duckdb`), `write`; optional `pretty`                                  |
| `dialect.lint`      | `sql`, `dialect` (default `duckdb`), `platform` (`databricks`/`snowflake`/`fabric` or absent) |
| `template.list`     | optional `shape`, `platform`                                                                  |
| `template.render`   | `id` or `path`; `slots`; optional `profile_version`                                           |
| `template.test`     | `id` or `path`; optional `case`                                                               |

`dialect.lint` parses `sql` in `dialect` and adds `platform`'s rules. Skills always pass
`dialect` for the target (databricks → `databricks`, snowflake → `snowflake`, fabric →
`spark` for a lakehouse or `tsql` for a warehouse, local → `duckdb`) and pass `platform`
only for the three platforms: leaving `dialect` out parses platform SQL as DuckDB, and
`platform: duckdb` is rejected. Only SQL is linted; when the render result's `language`
is `python` the skill skips the lint step.

The remaining ids in the command list (`platform.*`, `catalog.*`, `sample.run`, `bi.bind`,
`pipeline.deploy`, `chart.emit`, `dashboard.publish`, `project.init`) are planned in the
engine. Their params are not specified yet; skills describe what to pass in words and must
be checked against the engine's spec when it lands.

## Rules every skill follows

1. `engine.doctor` first. Missing tools or a failed required check: say what failed and
   stop.
2. `engine.commands` (`include_schema: false`) second. A step whose command is absent, or
   that returns `not_implemented`, is reported as unavailable; the skill does the steps it
   can and stops before that one. Never replace a missing command with hand-written output.
3. Slots: each skill has a slot table. Fill from arguments, conversation, source schema,
   template defaults and tool results; ask only for what is still missing, in one message.
4. Templates over free code: pipelines come from `template.list` / `template.render`.
   `template.test` runs the template's own golden cases (its fixtures and their
   `slots.yaml`) on DuckDB: it certifies the template, not the user's slot values. The
   user's values are checked by `template.render` (slot validation) and `dialect.lint`;
   no command yet runs the filled pipeline on the user's data before deploying, and the
   skills say so in their report. `passed: false` means the template is broken: report the
   failing runs and stop; changing slot values cannot fix it. `not_implemented` (no local
   golden runs for that platform in the installed version) means the template is untested
   here: stop before deploying. Rendered SQL is never edited by hand.
5. Side effects need consent: `pipeline.deploy` and `dashboard.publish` run only after a
   green test and an explicit yes.
6. Credentials never pass through chat or files; `platform.connect` runs the sign-in flow.
7. Errors are handled by code: `invalid_params` fix and retry once; `not_found` re-check
   names; `not_implemented` report the step as unavailable; `auth_required` connect;
   `conflict` migrate; `platform_error` report; `insufficient_credits` tell the user the
   account cannot cover the step and stop; `rate_limited` wait the seconds the error gives
   (`retry_after_seconds` in its details) and retry once, and with no wait given or a
   second refusal tell the user and stop; `internal` report, no retry loop.
8. Each skill ends with a short report of what it did and what it skipped.

## Skills

| Skill     | Arguments                               | Tool order                                                                                                                                                                                                                                  |
| --------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dashboard | `"<business question>"`                 | doctor, commands, `platform.status`, `catalog.search`, `sample.run`, `bi.bind`, `template.list` (aggregation-gold), `template.render`, `dialect.lint`, `template.test`, `pipeline.deploy`_, `query.run`, `chart.emit`, `dashboard.publish`_ |
| pipeline  | `<shape> from <source> to <target>`     | doctor, commands, `platform.status`, `template.list`, `catalog.search` or `query.run`, `template.render`, `dialect.lint`, `template.test`, `pipeline.deploy`*                                                                               |
| connect   | `<databricks\|snowflake\|fabric>`       | doctor, commands, `platform.status`, `platform.connect`, `platform.status`, `catalog.mirror`*                                                                                                                                               |
| migrate   | `<table or pipeline> to <platform>`     | doctor, commands, then either `template.list`, `template.render`, `dialect.lint`, `template.test`, or `dialect.transpile`, `dialect.lint`; `query.run`; `pipeline.deploy`*                                                                  |
| explain   | `<pipeline file, template id or table>` | doctor, commands, `template.list`, `dialect.lint`, `query.run` (EXPLAIN, local only); read-only                                                                                                                                             |

`*` only with the user's consent (deploy, publish) or when the user asked for it (mirror).

Shapes: `ingest-batch`, `incremental-append`, `cdc-merge`, `scd2`, `snapshot`,
`backfill`, `late-arriving`, `dedupe-conform`, `aggregation-gold`, `reverse-etl`.
Platforms: `databricks`, `snowflake`, `fabric`; local: `duckdb`. Dialects for transpile:
`databricks`, `snowflake`, `spark` (Fabric lakehouse), `tsql` (Fabric warehouse),
`duckdb`.

## Claude Code packaging

- Marketplace `emolysis` at `.claude-plugin/marketplace.json`, one entry `emolysis` with
  source `./claude-code`. The version lives only in `plugin.json`.
- Plugin manifest: name `emolysis`, semver `version`, `author.name` Emolysis, homepage
  this repository, license MIT.
- Skills are invoked as `/emolysis:<skill>`; frontmatter `name` equals the directory,
  `description` says what it does and "Use when ...", `argument-hint` shows the arguments.
- Install: `/plugin marketplace add emolysis/integrations`, then
  `/plugin install emolysis@emolysis`.

## Cursor

`cursor/rules/emolysis.mdc` is an "apply intelligently" rule (`description`, empty
`globs`, `alwaysApply: false`) with the same rules in condensed form.

## GitHub Action

`github-action/action.yml` is the step-level form of the `emolysis-checks` reusable
workflow in emolysis/.github; that repository's `docs/specs/emolysis-checks.md` owns the
interface (inputs `path`, `platform`, `emolysis-version`, their validation, and the steps).
The action has the same preview guard: its first step fails with "Emolysis checks are not
available yet" while `EMOLYSIS_CHECKS_AVAILABLE` is not `"true"`, before any input
validation or install. `emo check` is a planned CLI command defined with the CLI.

## Acceptance

- `claude plugin validate --strict` passes on the marketplace and the plugin. CI installs
  a pinned `claude` CLI and the gate fails in CI when it is missing.
- `task gate` passes.
- Once a CLI build exists: from each client, `engine.doctor` succeeds and the pipeline
  skill reaches `template.test` on a local DuckDB template.
