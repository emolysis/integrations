# Emolysis checks (preview)

**Not yet available.** The Emolysis CLI is not released. Until it is, this action fails at
its first step ("Preview guard") with the error "Emolysis checks are not available yet"
and installs nothing. Do not add it to a workflow yet. The interface below is planned and
may change before the first release.

A composite action that will install the `emolysis` CLI with uv and run `emo check` on an
Emolysis project. It is the step-level counterpart of the `emolysis-checks` reusable
workflow in [emolysis/.github](https://github.com/emolysis/.github), whose spec
(`docs/specs/emolysis-checks.md` there) owns the interface; both take the same inputs and
validate them the same way.

## Planned usage

Not yet available; this is how it will be used once the CLI is released. As a step after
the repository is checked out:

```yaml
- uses: actions/checkout@v5
  with:
    persist-credentials: false
- uses: emolysis/integrations/github-action@main
  with:
    path: .
    platform: databricks
```

| Input              | Default | Meaning                                                                                                                     |
| ------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| `path`             | `.`     | Directory holding the project's `emolysis.yml`, relative to the repository root                                             |
| `platform`         | empty   | `databricks`, `snowflake` or `fabric`; empty uses the platform set in `emolysis.yml`. Anything else fails before installing |
| `emolysis-version` | empty   | Exact CLI version, for example `0.1.0`: starts with a digit, only `0-9A-Za-z.+!-`. Empty installs the latest release        |

## Steps

1. Preview guard: fails while `EMOLYSIS_CHECKS_AVAILABLE` (set in `action.yml`) is not
   `"true"`.
2. Validate the inputs as in the table.
3. Install uv, then the `emolysis` CLI (`emolysis==<emolysis-version>` when set), and put
   uv's tool directory on `PATH`.
4. Print `emo --version`.
5. Run `emo check`, with `--platform <platform>` when set, in `path`. The step's result is
   `emo check`'s exit status.

What `emo check` covers is defined with the CLI, not by this action. It needs no platform
credentials. Versioned tags (`@v0`) will exist once the action works.
