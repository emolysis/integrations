---
name: migrate
description: Move a table, query or Emolysis pipeline from one platform to another (Databricks, Snowflake, Fabric, DuckDB) by transpiling and re-testing it on the target. Use when the user asks to migrate, port or convert SQL or a pipeline between platforms, or when an Emolysis tool returns conflict because an artifact targets another platform.
argument-hint: "<table or pipeline> to <platform>"
---

# Migrate to another platform

A pipeline is tagged with the platform and profile version it was built for, and the
engine refuses to deploy it anywhere else. Migration makes the target version explicitly:
re-render the template for the target, or transpile plain SQL, then test again. Every step
is a tool call on the `emolysis` MCP server.

Tool names: each engine command is one tool, named after the command id with the dot
replaced by an underscore (`dialect.transpile` is the `dialect_transpile` tool).

## Slots

Ask only for what is missing, in one message.

| Slot    | Required  | How to fill it                                                             |
| ------- | --------- | -------------------------------------------------------------------------- |
| subject | yes       | The arguments: a file, a rendered pipeline, a query or a table name.       |
| source  | yes       | The pipeline's tag line (`emolysis: template=... platform=...`), else ask. |
| target  | yes       | The arguments: `databricks`, `snowflake`, `fabric` or `duckdb`.            |
| fabric  | if Fabric | Lakehouse (Spark SQL) or warehouse (T-SQL). Ask if the target is Fabric.   |

Dialects: `databricks` → `databricks`, `snowflake` → `snowflake`, Fabric lakehouse →
`spark`, Fabric warehouse → `tsql`, local → `duckdb`.

## Steps

1. `engine.doctor`, then `engine.commands` with `include_schema: false`. Missing tools or a
   `not_implemented` result: say which step is unavailable and stop before it.
2. Rendered pipeline (it has the tag line): `template.list` with `shape` and `platform`
   set to the target. If a template exists, `template.render` it with `id` and the same
   `slots` (read the values from the source pipeline; ask for any you cannot read), then
   `dialect.lint` with `sql` set to the rendered `text`, `dialect` set to the target dialect
   and `platform` set to the target (omit `platform` for duckdb), then `template.test` with
   the template `id`. `template.test` runs the template's own golden cases: `passed: false`
   or `not_implemented` means the target template is not proven here; say so and do not
   deploy. No template for the target: say the cell is missing and fall back to step 3
   only if the user agrees.
3. Plain SQL or a table definition: `dialect.transpile` with `sql`, `read` set to the source
   dialect and `write` set to the target dialect (table above), then `dialect.lint` on the
   returned `statements` (joined with `;`) with `dialect` set to the target dialect and
   `platform` set to the target (omit `platform` for duckdb).
4. Show the user what changed: functions and types that were rewritten, statements that
   could not be transpiled, and lint findings. Do not hide a statement that failed.
5. Run local checks where possible: `query.run` (`sql`, and `database` for a DuckDB file)
   on DuckDB samples to compare row counts or totals between the old and the new version.
6. `pipeline.deploy` only after a green test and only when the user confirms.

## Errors

`invalid_params`: unknown dialect or SQL the transpiler cannot parse; report the statement.
`conflict`: profile version outside the template's constraint; say which version is
installed. `not_found`: re-check ids with `template.list`. `insufficient_credits`: the
Emolysis account cannot cover this step; tell the user and stop. `rate_limited`: too many
calls in a short time; wait the seconds the error gives (`retry_after_seconds` in its
details), then retry once; with no wait given, or refused again, tell the user and stop.
`internal`: an engine bug; report it and do not retry in a loop.

## Report

End with: source and target platform, method (re-rendered template or transpiled SQL),
statements changed or failed, lint findings, and test results.
