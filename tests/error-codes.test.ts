// Error handling in the skills and the Cursor rule: every code they handle is one of the
// engine's shared error codes, and each handles the codes any step can return.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(file: string): string {
  return readFileSync(path.join(ROOT, file), "utf8");
}

/** The engine's shared error codes, in order (docs/architecture.md, "The MCP surface"). */
const ERROR_CODES = [
  "invalid_params",
  "not_found",
  "not_implemented",
  "auth_required",
  "platform_error",
  "conflict",
  "internal",
  "insufficient_credits",
  "rate_limited",
];

/** Codes any step can return, whatever the skill does: every Errors section handles them. */
const EVERY_STEP = ["insufficient_credits", "rate_limited", "internal"];

/** The skills and the rule with an "## Errors" section (explain is read-only and has none). */
const WITH_ERRORS = [
  "claude-code/skills/connect/SKILL.md",
  "claude-code/skills/dashboard/SKILL.md",
  "claude-code/skills/migrate/SKILL.md",
  "claude-code/skills/pipeline/SKILL.md",
  "cursor/rules/emolysis.mdc",
];

function errorsSection(file: string): string {
  const section = read(file).split("\n## Errors\n")[1];
  if (section === undefined) throw new Error(`${file} has no Errors section`);
  return section.split("\n## ")[0] ?? "";
}

/** Codes a section handles, each written as "`code`: what to do". */
function handledCodes(section: string): string[] {
  return [...section.matchAll(/`([a-z_]+)`:/g)].map((m) => m[1]!);
}

/** The guidance after "`code`:" up to the next handled code. */
function guidanceFor(section: string, code: string): string {
  return section.split(`\`${code}\`:`)[1]?.split(/`[a-z_]+`:/)[0] ?? "";
}

describe("error codes", () => {
  it("lists the shared set in the architecture doc", () => {
    const list = read("docs/architecture.md").split("Error codes:")[1]?.split(".\n")[0] ?? "";
    expect([...list.matchAll(/`([a-z_]+)`/g)].map((m) => m[1])).toEqual(ERROR_CODES);
  });

  it("handles every shared code in the spec's error rule", () => {
    const spec = read("docs/specs/client-integrations.md");
    const rule = spec.split("Errors are handled by code:")[1]?.split("\n8. ")[0] ?? "";
    for (const code of ERROR_CODES) expect(rule).toContain(`\`${code}\``);
  });

  for (const file of WITH_ERRORS) {
    describe(file, () => {
      const section = errorsSection(file);

      it("handles only shared codes, including those any step can return", () => {
        const handled = handledCodes(section);
        expect(handled.filter((code) => !ERROR_CODES.includes(code))).toEqual([]);
        for (const code of EVERY_STEP) expect(handled).toContain(code);
      });

      it("retries rate_limited once after the wait the error gives, then stops", () => {
        const guidance = guidanceFor(section, "rate_limited");
        expect(guidance).toContain("`retry_after_seconds`");
        expect(guidance).toMatch(/retry once/);
        expect(guidance).toMatch(/tell the user and stop/);
      });
    });
  }
});
