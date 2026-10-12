# Emolysis for Cursor

Requires the Emolysis CLI (`emo`) on `PATH`. The CLI is not publicly released yet, so the
server cannot start until it is.

## MCP server

Copy [`mcp.json`](mcp.json) to `.cursor/mcp.json` in your project, or merge its
`emolysis` entry into `~/.cursor/mcp.json` to use it in every project. Cursor starts
`emo mcp` over stdio and lists the Emolysis tools in its MCP settings.

## Rule

Copy [`rules/emolysis.mdc`](rules/emolysis.mdc) to `.cursor/rules/emolysis.mdc`. It is an
"apply intelligently" rule: the agent loads it when a request is about pipelines,
dashboards or data platforms. It tells the agent to check the engine first, to use the
template and test tools instead of writing pipeline SQL by hand, and to deploy or publish
only after a green test and your confirmation.

To load it for every request instead, set `alwaysApply: true`. To attach it to Emolysis
project files, set `globs`, for example `globs: emolysis.yml, pipelines/**, models/**`.
