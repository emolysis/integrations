# AGENTS.md — emolysis/integrations

Public client integrations for Emolysis: the Claude Code plugin and marketplace, the
Cursor and Codex configs, the `@emolysis/mcp` npm shim and a preview GitHub Action. All of
them are thin wrappers around the `emo mcp` server that ships with the Emolysis CLI. No
engine code lives here, and nothing here may depend on how the engine is built.

## Read first

1. This file.
2. Shared standards: emolysis/rules (private), if you have access. `AGENTS.md` there links
   the standards every repository follows.
3. `docs/architecture.md`, `docs/development.md`, `docs/contributing.md`.
4. `ROADMAP.md` (honest assessment, current focus, gaps) and the latest entries in
   `log/devlog.md`.
5. `docs/specs/` for the area you are changing: `client-integrations.md` for the plugin,
   skills and client configs, `mcp-shim.md` for `packages/mcp-shim`.

## Ground rules

- Work from specs in `docs/specs/`, never from chat history. No spec, no code: open an
  issue labelled `needs-spec`.
- `task gate` green before you finish. Never weaken a check, lower a floor, or skip a
  test to get green.
- Thin layer only. Integrations call engine commands through MCP; they never reimplement
  engine behavior, embed pipeline SQL, or guess at results a command would return.
- Command ids are the engine's public interface (`engine.doctor`, `template.list`, ...).
  Use only ids listed in `docs/specs/client-integrations.md`; `tests/integrations.test.ts`
  rejects unknown ids. Every skill and rule checks `engine.commands` first and stops
  cleanly when a command is missing or returns `not_implemented`.
- One MCP server definition everywhere: name `emolysis`, command `emo`, args `["mcp"]`.
- Honest status: the CLI is not released. Do not claim anything works end to end, and mark
  planned things as planned. Every install command for something not yet published
  (`emolysis` CLI, `@emolysis/mcp`, the GitHub Action) sits in a section that says "not yet
  available"; a test checks it. The action keeps its preview guard as its first step until
  the CLI is released.
- Skills pass params exactly as the engine's command spec defines them (table in
  `docs/specs/client-integrations.md`).
- The shim never throws to the user: it exits with emo's status, 127 when emo is missing
  (one stderr line), 126 when emo cannot be executed.
- Every change ships with tests.
- Public/private boundary: this repository is public. Nothing about internal architecture,
  private repositories' contents, customers or third-party origins. Link only to
  repositories in the emolysis organization (a test checks GitHub links).

## Picking work

`ROADMAP.md` → Current focus → Gaps → `log/devlog.md` "Still open". Prefer the top item.

## Parallel agents

- One worktree per agent (`git worktree add ../integrations-<topic> -b <area>/<topic>`),
  own `node_modules` (`task setup` in the worktree). Branches are `<area>/<topic>`, with
  the areas listed under "Before you finish".
- Edit only files you own for the task; new things go in new files, not shared ones.
- Shared manifests (`package.json`, `pnpm-workspace.yaml`, `Taskfile.yml`,
  `marketplace.json`, `plugin.json`) get surgical edits.
- If someone else's change breaks the tree, do not fix their files; wait or report.

## Before you finish

1. `task gate` passes.
2. Add a terse entry to `log/devlog.md`: date, what landed, numbers, still open.
3. Commit as `<area>: <what>` (append `(green)` when the gate passed). Areas: `plugin`,
   `skills`, `cursor`, `codex`, `shim`, `action`, `docs`, `ci`.

## Commands

| Command                | What it does                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `task setup`           | `pnpm install --frozen-lockfile`                                                                           |
| `task fmt`             | Format everything with prettier                                                                            |
| `task lint`            | Prettier check, config parse check, actionlint                                                             |
| `task typecheck`       | `tsc` for the shim and the repository tests                                                                |
| `task test`            | All vitest suites                                                                                          |
| `task test:shim`       | Shim tests only                                                                                            |
| `task build`           | Compile the shim to `packages/mcp-shim/dist`                                                               |
| `task plugin:validate` | `claude plugin validate --strict` on marketplace and plugin; skipped locally without `claude`, fails in CI |
| `task gate`            | All of the above that CI runs, non-mutating                                                                |
