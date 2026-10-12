---
name: explain
description: Explain an Emolysis pipeline in plain language - what it reads and writes, how it handles new and changed data, what drives its cost, and what its lint findings mean. Use when the user asks what a pipeline does, where a table comes from, or why a pipeline is slow or expensive. Read-only.
argument-hint: "<pipeline file, template id or table>"
---

# Explain a pipeline

Describe one pipeline for someone who did not write it. This skill only reads: never
render, deploy or change anything while explaining. Every engine step is a tool call on
the `emolysis` MCP server.

Tool names: each engine command is one tool, named after the command id with the dot
replaced by an underscore (`template.list` is the `template_list` tool).

## Slots

Ask only for the pipeline, and only when the arguments and the conversation do not name it.

| Slot     | Required | How to fill it                                                            |
| -------- | -------- | ------------------------------------------------------------------------- |
| pipeline | yes      | The arguments: a file path, a template id or a target table. Ask if none. |
| audience | no       | Default: a data engineer. Use business terms if the user asks for them.   |

## Steps

1. `engine.doctor`, then `engine.commands` with `include_schema: false`. Missing tools or a
   `not_implemented` result: say which part of the explanation is unavailable.
2. Find the pipeline text. A rendered pipeline starts with a tag line
   (`emolysis: template=<id> version=<v> platform=<p> profile_version=<n>`).
3. `template.list` with `shape` and `platform` from the tag line: read the template's
   title, version and slots to explain intent and parameters.
4. `dialect.lint` with `sql` set to the pipeline text, `dialect` for its platform
   (databricks → `databricks`, snowflake → `snowflake`, fabric → `spark` for a lakehouse or
   `tsql` for a warehouse, duckdb → `duckdb`) and `platform` set to its platform; omit
   `platform` for duckdb. Explain each finding and its impact.
5. Lineage: list the tables read and written, from the SQL itself. On local data, a
   `query.run` with `sql` set to an `EXPLAIN` statement and `read_only: true` (plus
   `database` when the tables live in a DuckDB file) can confirm the plan.
6. Cost: use the template's cost notes (the cost.md file in the template directory that
   `template.list` returns as `path`), and the platform from the tag line. Name the cost
   drivers (full scans, merges, shuffles, warehouse size or uptime); do not invent figures.

## Report

Plain language, in this order: purpose (one sentence), inputs and outputs, how new, late
or changed data is handled, schedule or trigger if known, cost drivers, risks and lint
findings, and open questions. Mark anything you inferred rather than read.
