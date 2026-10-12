# Emolysis for Codex

Requires the Emolysis CLI (`emo`) on `PATH`. The CLI is not publicly released yet, so the
server cannot start until it is.

Add the server with the Codex CLI:

```sh
codex mcp add emolysis -- emo mcp
```

or copy the table from [`config.toml`](config.toml) into `~/.codex/config.toml` (all
projects) or `.codex/config.toml` in a trusted project. The snippet raises
`tool_timeout_sec` to 300 because template tests and platform calls can take longer than
the default.

Codex lists the Emolysis tools with `codex mcp list` and uses them when a request is about
pipelines, dashboards or data platforms. Start a session with "run engine_doctor" to check
the setup.
