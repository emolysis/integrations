---
name: pipeline
description: Build a data pipeline from a tested Emolysis template for the connected platform. Use when the user wants an ingest, incremental, CDC merge, SCD2, snapshot, backfill, late-arriving, dedupe, aggregation or reverse ETL pipeline ("SCD2 from staging.customers to silver.dim_customer"), on Databricks, Snowflake, Fabric or local DuckDB.
argument-hint: "<shape> from <source> to <target>"
---

# Pipeline from a template

Pick the pipeline shape, fill the template for the target platform, check the filled
pipeline with render and lint, confirm the template passes its own golden tests on DuckDB,
and deploy only a green result. Every step is a tool call on the `emolysis` MCP server.
Never free-code a pipeline in place of a template.

Tool names: each engine command is one tool, named after the command id with the dot
replaced by an underscore (`template.render` is the `template_render` tool).

## Shapes

| Id                   | Use for                                            |
| -------------------- | -------------------------------------------------- |
| `ingest-batch`       | Files, API or database extracts into bronze        |
| `incremental-append` | Watermark-based appends                            |
| `cdc-merge`          | Upserts and deletes from a change feed             |
| `scd2`               | History with validity ranges (SCD Type 2)          |
| `snapshot`           | Full refresh with retention                        |
| `backfill`           | Re-running a date range by partition               |
| `late-arriving`      | Reprocessing windows when facts arrive late        |
| `dedupe-conform`     | Keys, types and naming into silver                 |
| `aggregation-gold`   | Metrics tables for BI                              |
| `reverse-etl`        | Pushing gold data to a SaaS or OLTP system, safely |

## Slots

Ask only for slots you cannot fill from the arguments, the conversation, the source schema
or the template defaults. Ask for all missing slots in one message.

| Slot           | Required | How to fill it                                                                                                                      |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| shape          | yes      | Map the user's words to a shape id above. Ask only if two shapes fit.                                                               |
| source         | yes      | From the arguments; check it with `catalog.search` or `query.run`.                                                                  |
| target         | yes      | From the arguments; propose `<layer>.<name>` if missing.                                                                            |
| platform       | yes      | `platform.status`; local DuckDB when nothing is connected.                                                                          |
| template slots | per slot | Required slots without a default (`template.list`). Infer keys and columns from the source schema; ask only for what stays unknown. |

## Steps

1. `engine.doctor`. If the emolysis tools are missing or a required check fails, tell the
   user what failed (the Emolysis CLI, `emo`, must be installed) and stop.
2. `engine.commands` with `include_schema: false`. If a command named below is not listed,
   or a call returns `not_implemented`, say which step is not available in this Emolysis
   version, finish the steps you can, and stop before that one.
3. `platform.status` to learn the target platform and its profile version.
4. `template.list` with `shape` and `platform` (`duckdb` for local work). No template: say
   the cell is missing for this platform and stop; do not substitute another platform's
   template.
5. Inspect the source (`catalog.search`, or `query.run` with `sql` set to a `DESCRIBE` on
   local data) to infer key, timestamp and column slots.
6. `template.render` with `id` (the template id) and `slots`. Missing or invalid slot values
   come back as `invalid_params`: fix them from the source schema or ask. Show the slot
   values you chose.
7. `dialect.lint` with `sql` set to the rendered `text`, `dialect` for the platform
   (databricks → `databricks`, snowflake → `snowflake`, fabric → `spark` for a lakehouse or
   `tsql` for a warehouse, local → `duckdb`) and `platform` set to the platform; omit
   `platform` for local DuckDB. Skip this step when the render result's `language` is
   `python`. Fix findings through slot values and render again.
8. `template.test` with the template `id`. It runs the template's own golden cases on
   DuckDB: it certifies the template, not your slot values, which only render and lint
   check. `passed: false` means the template itself is broken: report the failing runs and
   stop; changing slot values cannot fix it. `not_implemented` means this version cannot
   run the template's tests locally: say the template is untested here and stop before
   deploying. Never edit rendered SQL by hand.
9. `pipeline.deploy` only after a green test and only when the user confirms: it creates
   objects and jobs on their platform and uses their compute.

## Errors

`invalid_params`: fix the params and retry once. `not_found`: re-check ids with
`template.list` or names with `catalog.search`. `auth_required`: run the connect skill.
`conflict`: the artifact targets another platform or profile version; use the migrate
skill. `platform_error`: report the platform's message. `insufficient_credits`: the
Emolysis account cannot cover this step; tell the user and stop. `rate_limited`: too many
calls in a short time; wait the seconds the error gives (`retry_after_seconds` in its
details), then retry once; with no wait given, or refused again, tell the user and stop.
`internal`: an engine bug; report it and do not retry in a loop.

## Report

End with: template id and version, platform and profile version, slot values, lint
findings, the template's test result (cases and runs, or why it did not run), and what was
deployed where (or that nothing was deployed). Say that the slot values were checked by
render and lint, not by running the filled pipeline on data.
