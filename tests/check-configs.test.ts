import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkText, checkTree, findConfigFiles, kindOf } from "../scripts/check-configs.mjs";

describe("kindOf", () => {
  it("classifies config files and ignores the rest", () => {
    expect(kindOf("plugin.json")).toBe("json");
    expect(kindOf(".mcp.json")).toBe("json");
    expect(kindOf("ci.yml")).toBe("yaml");
    expect(kindOf("pnpm-workspace.yaml")).toBe("yaml");
    expect(kindOf("config.toml")).toBe("toml");
    expect(kindOf("SKILL.md")).toBe("frontmatter");
    expect(kindOf("emolysis.mdc")).toBe("frontmatter");
    expect(kindOf("README.md")).toBeUndefined();
    expect(kindOf("cli.ts")).toBeUndefined();
  });
});

describe("checkText", () => {
  it("accepts valid files", () => {
    expect(checkText("a.json", '{"a": 1}')).toBeUndefined();
    expect(checkText("a.yml", "a: 1\n---\nb: 2\n")).toBeUndefined();
    expect(checkText("a.toml", '[mcp_servers.x]\ncommand = "emo"\n')).toBeUndefined();
    expect(checkText("SKILL.md", "---\nname: x\ndescription: y\n---\n\nBody\n")).toBeUndefined();
  });

  it("reports syntax errors", () => {
    expect(checkText("a.json", '{"a": 1,}')).toBeDefined();
    expect(checkText("a.yml", "a: [1\n")).toBeDefined();
    expect(checkText("a.toml", "[x\n")).toBeDefined();
  });

  it("requires frontmatter that is a YAML mapping", () => {
    expect(checkText("SKILL.md", "# No frontmatter\n")).toMatch(/missing/);
    expect(checkText("rule.mdc", "---\n- a\n---\n")).toMatch(/mapping/);
    expect(checkText("rule.mdc", "---\na: [\n---\n")).toMatch(/frontmatter/);
  });
});

describe("checkTree", () => {
  it("walks the tree, skips dependency dirs and reports each broken file", () => {
    const root = mkdtempSync(path.join(tmpdir(), "check-configs-"));
    mkdirSync(path.join(root, "node_modules", "x"), { recursive: true });
    mkdirSync(path.join(root, "skills", "a"), { recursive: true });
    writeFileSync(path.join(root, "node_modules", "x", "bad.json"), "{");
    writeFileSync(path.join(root, "good.json"), "{}");
    writeFileSync(path.join(root, "bad.yml"), "a: [");
    writeFileSync(path.join(root, "skills", "a", "SKILL.md"), "no frontmatter");

    expect(findConfigFiles(root)).toEqual(["bad.yml", "good.json", "skills/a/SKILL.md"]);
    const report = checkTree(root);
    expect(report.problems.map((p) => p.file)).toEqual(["bad.yml", "skills/a/SKILL.md"]);
  });
});
