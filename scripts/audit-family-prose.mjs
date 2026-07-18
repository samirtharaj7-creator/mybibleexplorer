#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const familyRoot = resolve(root, "..");
const registry = JSON.parse(readFileSync(join(root, "qa", "sites.json"), "utf8"));
const content = JSON.parse(readFileSync(join(root, "qa", "content-books.json"), "utf8"));
const structuredRepos = new Set(content.books.map((book) => book.repo));
const allowedVerbatimRepeats = new Set(["that", "very", "yea", "nay", "offered", "thousand"]);
const findings = [];
let authoredStrings = 0;
let staticPages = 0;

function inspect(value, location) {
  authoredStrings += 1;
  for (const match of value.matchAll(/\b([A-Za-z]{4,})\s+\1\b/giu)) {
    if (!allowedVerbatimRepeats.has(match[1].toLocaleLowerCase())) findings.push(`${location}: repeated word ${JSON.stringify(match[0])}`);
  }
}

function collectAuthored(value, location) {
  if (typeof value === "string") {
    inspect(value, location);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectAuthored(item, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (["bibleText", "sources", "sourceAudit"].includes(key)) continue;
    collectAuthored(child, `${location}.${key}`);
  }
}

for (const book of content.books) {
  const directory = resolve(familyRoot, book.repo, book.root);
  for (const file of readdirSync(directory).filter((name) => /^chapter-\d{2}\.json$/u.test(name)).sort()) {
    const chapter = Number(file.match(/\d+/u)[0]);
    if (book.book === "Philippians" && chapter === 4) continue;
    collectAuthored(JSON.parse(readFileSync(join(directory, file), "utf8")), `${book.book}/${file}`);
  }
}

function staticHtmlFiles(directory) {
  const files = [];
  const ignored = new Set([".git", ".next", "node_modules", "out", "outputs", "qa-results", "work"]);
  const visit = (path) => {
    const stat = statSync(path);
    if (stat.isFile()) {
      if (path.endsWith(".html") && !/(?:^|\/)(?:404|_not-found)(?:\/|\.html?$)/iu.test(relative(directory, path).split(sep).join("/"))) files.push(path);
      return;
    }
    for (const child of readdirSync(path)) {
      if (!ignored.has(child)) visit(join(path, child));
    }
  };
  visit(directory);
  return files;
}

for (const site of registry.sites.filter((entry) => !structuredRepos.has(entry.repo))) {
  const artifactRoot = resolve(familyRoot, site.repo, site.artifactRoot);
  if (!existsSync(artifactRoot)) continue;
  for (const file of staticHtmlFiles(artifactRoot)) {
    const html = readFileSync(file, "utf8");
    const textSegments = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
      .replace(/<[^>]+>/gu, "\n")
      .replace(/(?:&#x27;|&#39;|&apos;|&rsquo;)/giu, "'")
      .replace(/&[A-Za-z0-9#]+;/gu, " ")
      .split(/\n+/u)
      .map((segment) => segment.replace(/\s+/gu, " ").trim())
      .filter(Boolean);
    staticPages += 1;
    textSegments.forEach((segment, index) => inspect(segment, `${site.domain}/${relative(artifactRoot, file).split(sep).join("/")}#text-${index + 1}`));
  }
}

if (findings.length) {
  console.error(`Family prose audit failed with ${findings.length} repeated-word finding(s):`);
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(`Family prose audit passed: ${authoredStrings} authored strings and ${staticPages} static pages checked; KJV fields and Philippians 4 excluded.`);
