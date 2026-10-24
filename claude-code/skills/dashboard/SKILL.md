---
name: dashboard
description: Turn a business question into a tested gold table and a chart with the Emolysis engine. Use when the user asks for a dashboard, a chart, a KPI or a metric over their data ("revenue by region last quarter", "build me a churn dashboard"), on a connected Databricks, Snowflake or Fabric workspace or on local files.
argument-hint: '"<business question>"'
---

# Dashboard from a business question

Build the answer to one business question as a pipeline from a template that passes its
golden tests, then render it as a chart and, if the user wants, publish it. Every step is a tool call on the
`emolysis` MCP server. Do not hand-write pipeline SQL or chart JSON in place of a tool.

Tool names: each engine command is one tool, named after the command id with the dot
replaced by an underscore (`engine.doctor` is the `engine_doctor` tool).

## Slots

Ask only for slots you cannot fill from the arguments, the conversation or a tool result.
Ask for all missing slots in one message.

| Slot     | Required | How to fill it                                                                   |
| -------- | -------- | -------------------------------------------------------------------------------- |
| question | yes      | The skill arguments. Ask if there are none.                                      |
| target   | yes      | `platform.status`: the connected platform, else local DuckDB.                    |
| sources  | yes      | `catalog.search` results; ask only when several candidates fit equally well.     |
| grain    | no       | Time grain and dimensions implied by the question; ask only if truly ambiguous.  |
| publish  | no       | Default: do not publish. Ask once, after the chart exists, if the user wants it. |

## Steps

1. `engine.doctor`. If the emolysis tools are missing or a required check fails, tell the
   user what failed (the Emolysis CLI, `emo`, must be installed) and stop.
2. `engine.commands` with `include_schema: false`. If a command named below is not listed,
   or a call returns `not_implemented`, say which step is not available in this Emolysis
   version, finish the steps you can, and stop before that one.
3. `platform.status`. No connection: work on local files with `query.run` (DuckDB) and say
   so. Platform work needs the connect skill first.
4. `catalog.search` with the nouns and measures from the question. Pick sources; confirm
   only if the choice is ambiguous. Local work: inspect the files the user named with
   `query.run`, `sql` set to `DESCRIBE SELECT * FROM '<file>'`, instead.
5. `sample.run` to bring samples of the platform sources into local DuckDB. Skip it for
   local files.
6. `bi.bind` with the question and the sampled sources. Show the proposed measures,
   dimensions, filters and derived fields in a short list and let the user correct them.
7. `template.list` with `shape: "aggregation-gold"` and `platform` set to the target
   (`duckdb` for local work). Choose the template whose title fits; read its slots.
8. `template.render` with `id` (the template id) and `slots`. Missing or invalid slot
   values are `invalid_params`: fill them from step 6 or ask.
9. `dialect.lint` with `sql` set to the rendered `text`, `dialect` for the target
   (databricks → `databricks`, snowflake → `snowflake`, fabric → `spark` for a lakehouse or
   `tsql` for a warehouse, local → `duckdb`) and `platform` set to the target; omit
   `platform` for local DuckDB. Skip it when the render result's `language` is `python`.
   Fix findings through slot values and render again.
10. `template.test` with the template `id`. It runs the template's own golden cases on
    DuckDB: it certifies the template, not your slot values, which only render and lint
    check. `passed: false` means the template itself is broken: report the failing runs
    and stop. `not_implemented` means this version cannot run the template's tests
    locally: say so and stop before deploying.
11. `pipeline.deploy` only after a green test and only when the user confirms: it runs on
    their platform and uses their compute. Skip it for local-only work.
12. `query.run` to read the gold table.
13. `chart.emit` with a `chart.v1` spec: `type`, `dataset.source` (the gold table),
    `dataset.fields`, `encodings.x`, `encodings.y` (with `aggregate` where needed),
    optional `encodings.series` and `formatting`.
14. `dashboard.publish` only if the user said yes to publishing. Pass `project` and
    `dashboard` (or `title`, `datasets` and `charts` for a one-off share), and leave
    `visibility` out unless the user names an audience. Call it with `dry_run: true` first,
    show what would leave the machine from its `review`, and publish only after the user
    confirms, passing that review's digest as `confirm_review`. It needs sign-in; an
    `auth_required` error means the user must sign in first.
    - A dashboard's link keeps its audience. An `invalid_params` error whose details give
      the reason `visibility_fixed` also name who can open the link (its `visibility`):
      say so, and that changing it means revoking the link and publishing again, which
      gives a new link.
    - A `link_replaced` warning means the old link was gone; give the user the new link.
15. `dashboard.revoke` with `project` and `dashboard` only when the user asks to take a
    dashboard's link down or to change who can open it, and only after an explicit yes: the
    old link stops working for everyone. `revoked: false` means the link was already gone.

## Errors

Every tool returns a typed error code. `invalid_params`: fix the params and retry once,
except `visibility_fixed`, which is reported, never retried (step 14).
`not_found`: re-check names with `catalog.search` or `template.list`. `auth_required`: run
the connect skill. `conflict`: the artifact targets another platform or profile version;
use the migrate skill. `platform_error`: report the platform's message.
`insufficient_credits`: the Emolysis account cannot cover this step; tell the user and
stop. `rate_limited`: too many calls in a short time; wait the seconds the error gives
(`retry_after_seconds` in its details), then retry once; with no wait given, or refused
again, tell the user and stop. `internal`: an engine bug; report it with the details and do
not retry in a loop.

## Report

End with: the question, sources used, gold table name, the template's test result (cases
and runs, or why it did not run), the chart type, and the dashboard link if published.
State anything you skipped and why.
