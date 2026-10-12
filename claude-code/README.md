# Emolysis plugin for Claude Code

Adds the Emolysis MCP server (`emo mcp`) and five skills to Claude Code. Requires the
Emolysis CLI (`emo`) on `PATH`; the CLI is not publicly released yet, so the plugin has
nothing to start until it is.

## Install

```text
/plugin marketplace add emolysis/integrations
/plugin install emolysis@emolysis
```

From a clone, for development: `claude --plugin-dir ./claude-code`.

## Skills

| Skill                 | Use it for                                                                |
| --------------------- | ------------------------------------------------------------------------- |
| `/emolysis:dashboard` | A business question to a tested gold table and a chart, optionally shared |
| `/emolysis:pipeline`  | One of ten pipeline shapes, filled from a template, tested, then deployed |
| `/emolysis:connect`   | Signing in to Databricks, Snowflake or Fabric                             |
| `/emolysis:migrate`   | Moving SQL or a pipeline to another platform and re-testing it            |
| `/emolysis:explain`   | Lineage, data handling and cost drivers of a pipeline, in plain language  |

Claude also picks a skill on its own when a request matches its description. Each skill
calls the engine through MCP tools, asks only for the values it cannot work out, and
deploys or publishes only after a green test and your confirmation.

## Files

- `.claude-plugin/plugin.json`: plugin manifest.
- `.mcp.json`: the `emolysis` stdio server, `emo mcp`.
- `skills/<name>/SKILL.md`: the skills.

If `emo` is not on the `PATH` Claude Code sees, edit `.mcp.json` in your installed copy to
use the full path, or use the npm shim with `EMO_BIN` once it is published.
