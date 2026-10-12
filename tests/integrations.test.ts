// Consistency checks across the client integrations: the Claude Code marketplace and
// plugin, the Cursor and Codex configs and the npm shim. The GitHub Action: action.test.ts.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { findConfigFiles, frontmatterOf } from "../scripts/check-configs.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(file: string): string {
  return readFileSync(path.join(ROOT, file), "utf8");
}

function json(file: string): Record<string, unknown> {
  return JSON.parse(read(file)) as Record<string, unknown>;
}

function frontmatter(file: string): Record<string, unknown> {
  const raw = frontmatterOf(read(file));
  if (raw === undefined) throw new Error(`${file} has no frontmatter`);
  return parseYaml(raw) as Record<string, unknown>;
}

/** Engine command ids the integrations may name (docs/specs/client-integrations.md). */
const KNOWN_COMMANDS = new Set([
  "engine.version",
  "engine.doctor",
  "engine.commands",
  "query.run",
  "dialect.transpile",
  "dialect.lint",
  "template.list",
  "template.render",
  "template.test",
  "platform.connect",
  "platform.status",
  "catalog.search",
  "catalog.mirror",
  "sample.run",
  "pipeline.deploy",
  "bi.bind",
  "chart.emit",
  "dashboard.publish",
  "project.init",
]);
/** Dotted tokens in backticks that are not command ids: the chart.v1 spec and its fields. */
const NOT_COMMANDS = new Set(["chart.v1"]);
const CHART_SPEC_FIELDS = /^(dataset|encodings|formatting)\./;

function commandIdsIn(text: string): string[] {
  const ids = [...text.matchAll(/`([a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*)`/g)].map((m) => m[1]!);
  return ids.filter((id) => !NOT_COMMANDS.has(id) && !CHART_SPEC_FIELDS.test(id));
}

const EMO_SERVER = { command: "emo", args: ["mcp"] };
const SKILLS = ["connect", "dashboard", "explain", "migrate", "pipeline"];

describe("Claude Code marketplace and plugin", () => {
  const marketplace = json(".claude-plugin/marketplace.json");
  const plugins = marketplace["plugins"] as Record<string, unknown>[];
  const plugin = json("claude-code/.claude-plugin/plugin.json");

  it("lists the emolysis plugin from ./claude-code", () => {
    expect(marketplace["name"]).toBe("emolysis");
    expect((marketplace["owner"] as Record<string, unknown>)["name"]).toBe("Emolysis");
    expect(typeof marketplace["description"]).toBe("string");
    expect(plugins).toHaveLength(1);
    expect(plugins[0]).toMatchObject({ name: "emolysis", source: "./claude-code" });
    expect(statSync(path.join(ROOT, "claude-code")).isDirectory()).toBe(true);
  });

  it("keeps the version only in plugin.json", () => {
    expect(plugins[0]).not.toHaveProperty("version");
    expect(plugin["version"]).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("has a manifest whose name matches the marketplace entry", () => {
    expect(plugin).toMatchObject({
      name: "emolysis",
      author: { name: "Emolysis" },
      homepage: "https://github.com/emolysis/integrations",
      license: "MIT",
    });
    expect(typeof plugin["description"]).toBe("string");
  });

  it("declares the emolysis stdio server running `emo mcp`", () => {
    const servers = json("claude-code/.mcp.json")["mcpServers"] as Record<string, unknown>;
    expect(Object.keys(servers)).toEqual(["emolysis"]);
    expect(servers["emolysis"]).toMatchObject({ type: "stdio", ...EMO_SERVER });
  });

  it("ships exactly the five skills", () => {
    const dirs = readdirSync(path.join(ROOT, "claude-code/skills")).sort();
    expect(dirs).toEqual(SKILLS);
  });

  for (const skill of SKILLS) {
    describe(`skill ${skill}`, () => {
      const file = `claude-code/skills/${skill}/SKILL.md`;
      const meta = frontmatter(file);
      const body = read(file);

      it("has a name matching its directory and a description", () => {
        expect(meta["name"]).toBe(skill);
        expect(typeof meta["description"]).toBe("string");
        const description = meta["description"] as string;
        expect(description.length).toBeGreaterThan(40);
        expect(description.length).toBeLessThanOrEqual(1024);
        expect(description).toMatch(/Use when/);
      });

      it("checks the engine first and names only known commands", () => {
        const steps = body.split("## Steps")[1] ?? "";
        expect(commandIdsIn(steps).slice(0, 2)).toEqual(["engine.doctor", "engine.commands"]);
        const ids = commandIdsIn(body);
        expect(ids.filter((id) => !KNOWN_COMMANDS.has(id))).toEqual([]);
      });

      it("asks only for missing slots", () => {
        expect(body).toMatch(/## Slots/);
        expect(body).toMatch(/Ask only for/);
      });
    });
  }
});

describe("Cursor", () => {
  it("has an MCP config with the emolysis stdio server", () => {
    const servers = json("cursor/mcp.json")["mcpServers"] as Record<string, unknown>;
    expect(servers["emolysis"]).toMatchObject({ type: "stdio", ...EMO_SERVER });
  });

  it("has a rule with Cursor's frontmatter keys that names only known commands", () => {
    const meta = frontmatter("cursor/rules/emolysis.mdc");
    expect(Object.keys(meta).sort()).toEqual(["alwaysApply", "description", "globs"]);
    expect(typeof meta["description"]).toBe("string");
    expect(meta["alwaysApply"]).toBe(false);
    const ids = commandIdsIn(read("cursor/rules/emolysis.mdc"));
    expect(ids.length).toBeGreaterThan(5);
    expect(ids.filter((id) => !KNOWN_COMMANDS.has(id))).toEqual([]);
  });
});

describe("Codex", () => {
  it("has a config.toml table for the emolysis server", () => {
    const config = parseToml(read("codex/config.toml")) as Record<string, any>;
    expect(config["mcp_servers"]["emolysis"]).toMatchObject(EMO_SERVER);
  });
});

describe("npm shim", () => {
  const pkg = json("packages/mcp-shim/package.json");

  it("is @emolysis/mcp with the emolysis-mcp bin", () => {
    expect(pkg).toMatchObject({
      name: "@emolysis/mcp",
      license: "MIT",
      type: "module",
      bin: { "emolysis-mcp": "dist/cli.js" },
    });
    expect(existsSync(path.join(ROOT, "packages/mcp-shim/src/cli.ts"))).toBe(true);
  });
});

describe("README", () => {
  const readme = read("README.md");

  it("shows the Claude Code install commands for this marketplace", () => {
    expect(readme).toContain("/plugin marketplace add emolysis/integrations");
    expect(readme).toContain("/plugin install emolysis@emolysis");
  });
});

describe("public repository hygiene", () => {
  const TEXT = /\.(md|mdc|json|ya?ml|toml|ts|mjs|sh)$|^(LICENSE|NOTICE)$/;

  function textFiles(dir = ROOT): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if ([".git", "node_modules", "dist", "coverage", "plan"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...textFiles(full));
      else if (TEXT.test(entry.name) && entry.name !== "pnpm-lock.yaml") out.push(full);
    }
    return out;
  }

  it("links only to repositories in the emolysis organization", () => {
    const offenders: string[] = [];
    for (const file of textFiles()) {
      for (const m of readFileSync(file, "utf8").matchAll(/github\.com\/([A-Za-z0-9_.-]+)/g)) {
        if (m[1] !== "emolysis") offenders.push(`${path.relative(ROOT, file)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("checks every config file it finds", () => {
    expect(findConfigFiles(ROOT)).toContain("claude-code/.mcp.json");
  });

  // Install commands for packages Emolysis has not published yet. Every Markdown section
  // that shows one must say "not yet available", so nobody runs them early.
  const UNRELEASED = [
    /uv tool install emolysis\b/,
    /npx( -y)? @emolysis\/mcp/,
    /"-y", "@emolysis\/mcp"/,
    /npm (i|install)( -g| --global)? @emolysis\/mcp/,
    /emolysis\/integrations\/github-action@/,
  ];

  /** Splits Markdown into sections at headings outside code fences. */
  function sections(text: string): string[] {
    const out: string[] = [];
    let current: string[] = [];
    let fenced = false;
    for (const line of text.split("\n")) {
      if (line.startsWith("```")) fenced = !fenced;
      if (!fenced && /^#{1,6} /.test(line)) {
        out.push(current.join("\n"));
        current = [];
      }
      current.push(line);
    }
    out.push(current.join("\n"));
    return out;
  }

  it("marks every unreleased install command as not yet available", () => {
    const offenders: string[] = [];
    const docs = textFiles().filter(
      (f) => f.endsWith(".md") && !f.includes(`${path.sep}log${path.sep}`),
    );
    expect(docs.length).toBeGreaterThan(5);
    for (const file of docs) {
      for (const section of sections(readFileSync(file, "utf8"))) {
        const shown = UNRELEASED.some((re) => re.test(section));
        if (shown && !/not yet available/i.test(section)) {
          offenders.push(`${path.relative(ROOT, file)}: ${section.split("\n")[0]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
