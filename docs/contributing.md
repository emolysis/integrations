# Contributing

Issues and pull requests are welcome. This repository holds only the client integrations
for Emolysis; problems with the engine itself also start here as issues, and we route
them.

## Issues

- Bugs: client and version (Claude Code, Cursor, Codex, other), OS, `emo` version if
  installed, what you ran, what happened, what you expected.
- Ideas: what you want to do and which client. Label `enhancement`.
- Work that needs a design first gets `needs-spec`. Issues labelled `agent` are picked up
  by an automated agent that opens a pull request.

## Pull requests

1. Fork, branch from `main` as `<area>/<topic>` (`skills/pipeline-watermark`), keep the
   change small and focused.
2. Follow `AGENTS.md`: specs in `docs/specs/` first for new behavior, tests with every
   change, a short entry in `log/devlog.md`.
3. Run `task setup` and `task gate`. CI runs the same and must be green before review.
4. Title as `<area>: <what>` (`skills: ask for the watermark column in pipeline`).
5. A maintainer reviews and merges. Pull requests from branches in this repository also get
   an automated review; pull requests from forks do not.

## Scope

In scope: the Claude Code plugin and skills, client configs, the npm shim, the GitHub
Action, docs. Out of scope: engine features (open an issue instead), integrations that
bypass `emo mcp`.

## License

By contributing you agree that your contribution is licensed under the MIT License
(`LICENSE`). The Emolysis name and logo are not covered; see `NOTICE`.
