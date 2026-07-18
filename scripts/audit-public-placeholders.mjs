#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(root, "qa", "sites.json"), "utf8"));
const familyRoot = resolve(root, registry.familyRoot);
const banned = [
  /\bcoming soon\b/iu,
  /\bnot ready yet\b/iu,
  /\bcheck (?:back|again) later\b/iu,
  /\bunder construction\b/iu,
  /\blorem ipsum\b/iu,
  /\bcontent (?:pending|forthcoming)\b/iu
];
const ignored = new Set([".git", ".next", "node_modules", "out", "outputs", "qa-results", "work"]);
const errors = [];

// Kept local to avoid scanning source trees: only deployment HTML can create a public placeholder defect.
function htmlFiles(directory) {
  const files = [];
  const visit = (path) => {
    const stat = statSync(path);
    if (stat.isFile()) {
      if (path.endsWith(".html") && !/(?:^|\/)(?:404|_not-found)(?:\/|\.html?$)/iu.test(relative(directory, path).split(sep).join("/"))) files.push(path);
      return;
    }
    for (const child of readdirSync(path)) {
      if (ignored.has(child)) continue;
      visit(join(path, child));
    }
  };
  visit(directory);
  return files;
}

function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&(?:nbsp|#160);/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

for (const site of registry.sites) {
  const artifactRoot = resolve(familyRoot, site.repo, site.artifactRoot);
  for (const file of htmlFiles(artifactRoot)) {
    const text = visibleText(readFileSync(file, "utf8"));
    for (const pattern of banned) {
      const match = text.match(pattern);
      if (match) errors.push(`${site.domain} · ${relative(artifactRoot, file)} · ${match[0]}`);
    }
  }
}

if (errors.length) {
  console.error(`Public placeholder audit failed with ${errors.length} finding(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Public placeholder audit passed across all deployment HTML.");
