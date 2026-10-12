// @ts-check
// Parses every config file in the repository and fails on the first syntax error in
// each: JSON (*.json), YAML (*.yml, *.yaml), TOML (*.toml), and the YAML frontmatter of
// skill (SKILL.md) and Cursor rule (*.mdc) files. Usage: node scripts/check-configs.mjs [root]

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseToml } from "smol-toml";
import { parseAllDocuments, parseDocument } from "yaml";

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage", "plan"]);

/**
 * @typedef {{ file: string, message: string }} Problem
 * @typedef {{ checked: string[], problems: Problem[] }} Report
 */

/**
 * Lists config files under `root`, relative and sorted, skipping build and dependency dirs.
 * @param {string} root
 * @returns {string[]}
 */
export function findConfigFiles(root) {
  /** @type {string[]} */
  const found = [];
  /** @param {string} dir */
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (entry.isFile() && kindOf(entry.name) !== undefined) {
        found.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  };
  walk(root);
  return found.sort();
}

/**
 * @param {string} name
 * @returns {"json" | "yaml" | "toml" | "frontmatter" | undefined}
 */
export function kindOf(name) {
  if (name === "SKILL.md" || name.endsWith(".mdc")) return "frontmatter";
  const ext = path.extname(name);
  if (ext === ".json") return "json";
  if (ext === ".yml" || ext === ".yaml") return "yaml";
  if (ext === ".toml") return "toml";
  return undefined;
}

/**
 * Returns the problem with `text`, or undefined when it parses.
 * @param {string} name
 * @param {string} text
 * @returns {string | undefined}
 */
export function checkText(name, text) {
  try {
    switch (kindOf(name)) {
      case "json":
        JSON.parse(text);
        return undefined;
      case "yaml":
        for (const doc of parseAllDocuments(text)) {
          const error = doc.errors[0];
          if (error) return error.message;
        }
        return undefined;
      case "toml":
        parseToml(text);
        return undefined;
      case "frontmatter":
        return checkFrontmatter(text);
      default:
        return "not a config file";
    }
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Returns the frontmatter of a Markdown file as text, or undefined when there is none.
 * @param {string} text
 * @returns {string | undefined}
 */
export function frontmatterOf(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  return match?.[1];
}

/**
 * @param {string} text
 * @returns {string | undefined}
 */
function checkFrontmatter(text) {
  const raw = frontmatterOf(text);
  if (raw === undefined) return "missing YAML frontmatter (--- ... --- at the top)";
  const doc = parseDocument(raw);
  const error = doc.errors[0];
  if (error) return `frontmatter: ${error.message}`;
  const value = doc.toJS();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return "frontmatter must be a mapping";
  }
  return undefined;
}

/**
 * @param {string} root
 * @returns {Report}
 */
export function checkTree(root) {
  const checked = findConfigFiles(root);
  /** @type {Problem[]} */
  const problems = [];
  for (const file of checked) {
    const message = checkText(path.basename(file), readFileSync(path.join(root, file), "utf8"));
    if (message !== undefined) problems.push({ file, message });
  }
  return { checked, problems };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(process.argv[2] ?? ".");
  const { checked, problems } = checkTree(root);
  for (const { file, message } of problems) console.error(`${file}: ${message}`);
  if (problems.length > 0) {
    console.error(`${problems.length} of ${checked.length} config files failed to parse.`);
    process.exit(1);
  }
  console.log(`${checked.length} config files parse.`);
}
