---
name: connect
description: Connect Emolysis to a Databricks, Snowflake or Microsoft Fabric workspace so later work targets that platform. Use when the user asks to connect, sign in to or switch a data platform, or when another Emolysis tool returns auth_required.
argument-hint: "<databricks|snowflake|fabric>"
---

# Connect a platform

Connect one platform through the engine's own sign-in flow. Once connected, the engine
offers only that platform's templates and lint rules. Every step is a tool call on the
`emolysis` MCP server.

Tool names: each engine command is one tool, named after the command id with the dot
replaced by an underscore (`platform.connect` is the `platform_connect` tool).

## Slots

Ask only for what is missing, in one message.

| Slot      | Required | How to fill it                                                          |
| --------- | -------- | ----------------------------------------------------------------------- |
| platform  | yes      | The arguments: `databricks`, `snowflake` or `fabric`. Ask if missing.   |
| workspace | no       | Offered by the sign-in flow; ask only if the flow returns several.      |
| compute   | no       | Offered after sign-in (warehouse, cluster or capacity); ask if several. |
| mirror    | no       | Catalogs or schemas to mirror locally. Default: none until asked.       |

## Steps

1. `engine.doctor`. If the emolysis tools are missing or a required check fails, tell the
   user what failed (the Emolysis CLI, `emo`, must be installed) and stop.
2. `engine.commands` with `include_schema: false`. If `platform.connect` is not listed, or a
   call returns `not_implemented`, tell the user platform connections are not available in
   this Emolysis version. Local work on DuckDB still works.
3. `platform.status`. If the platform is already connected, report it and stop unless the
   user wants to switch.
4. `platform.connect` with the platform. The flow opens a browser or returns a device code
   and URL: show them to the user and wait. Signing in may require an Emolysis account.
5. `platform.status` again to confirm the connection, workspace, compute and profile
   version.
6. `catalog.mirror` only if the user named catalogs or schemas to mirror.

## Rules

- Never ask for passwords, tokens or keys in the chat, and never write credentials to
  files. The engine keeps them in the local credential store.
- Do not change the connected platform silently; say what was connected before and after.

## Errors

`invalid_params`: unknown platform id; use one of the three. `auth_required`: the user must
finish sign-in first. `platform_error`: report the platform's message (permissions are the
usual cause). `insufficient_credits`: the Emolysis account cannot cover this step; tell the
user and stop. `internal`: an engine bug; report it and do not retry in a loop.

## Report

End with: platform, workspace, compute, profile version, and what was mirrored.
