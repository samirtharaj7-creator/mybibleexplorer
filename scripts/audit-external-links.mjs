#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(root, "qa", "sites.json"), "utf8"));
const familyRoot = resolve(root, registry.familyRoot);
const familyDomains = new Set(registry.sites.map((site) => site.domain));
const allowedServices = new Set(registry.externalAllowlist);
const ignored = new Set([".git", ".next", "node_modules", "out", "outputs", "qa-results", "work"]);
const serviceUrls = new Map();
const errors = [];
const warnings = [];

function walkHtml(directory) {
  const files = [];
  const visit = (path) => {
    const stat = statSync(path);
    if (stat.isFile()) {
      if (path.endsWith(".html")) files.push(path);
      return;
    }
    for (const child of readdirSync(path)) if (!ignored.has(child)) visit(join(path, child));
  };
  visit(directory);
  return files;
}

for (const site of registry.sites) {
  const artifactRoot = resolve(familyRoot, site.repo, site.artifactRoot);
  for (const file of walkHtml(artifactRoot)) {
    const html = readFileSync(file, "utf8").replace(/&amp;/gu, "&");
    for (const match of html.matchAll(/\b(?:href|src|action)\s*=\s*["'](https?:\/\/[^"']+)["']/giu)) {
      let url;
      try {
        url = new URL(match[1]);
      } catch {
        errors.push(`${site.domain}/${relative(artifactRoot, file).split(sep).join("/")}: invalid external URL ${match[1]}`);
        continue;
      }
      if (familyDomains.has(url.hostname)) continue;
      if (!allowedServices.has(url.hostname)) {
        errors.push(`${site.domain}/${relative(artifactRoot, file).split(sep).join("/")}: unapproved external service ${url.hostname}`);
        continue;
      }
      if (["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname) && url.pathname === "/") continue;
      serviceUrls.set(url.href, { site: site.domain, file: relative(artifactRoot, file).split(sep).join("/") });
    }
  }
}

async function fetchReachability(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "user-agent": "MyBibleExplorer-QA/1.0" },
      signal: controller.signal
    });
    if (response.status === 405) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { "user-agent": "MyBibleExplorer-QA/1.0", range: "bytes=0-0" },
        signal: controller.signal
      });
    }
    return { status: response.status, finalUrl: response.url };
  } finally {
    clearTimeout(timeout);
  }
}

for (const [url, context] of serviceUrls) {
  try {
    const result = await fetchReachability(url);
    if (result.status === 404 || result.status === 410 || result.status >= 500) {
      errors.push(`${context.site}/${context.file}: external destination returned ${result.status} (${url})`);
    } else if (result.status >= 400) {
      warnings.push(`${context.site}/${context.file}: external destination returned ${result.status}; reachable but access-limited (${url})`);
    }
  } catch (error) {
    warnings.push(`${context.site}/${context.file}: external reachability could not be confirmed (${url}: ${error.message})`);
  }
}

if (warnings.length) {
  console.warn(`External link audit recorded ${warnings.length} third-party limitation(s):`);
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}
if (errors.length) {
  console.error(`External link audit failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`External link audit passed: ${serviceUrls.size} permitted service URL(s) checked without submitting a form or donation.`);
