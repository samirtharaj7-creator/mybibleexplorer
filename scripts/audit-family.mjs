#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(projectRoot, "qa", "sites.json"), "utf8"));
const familyRoot = resolve(projectRoot, registry.familyRoot);
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const mode = option("--mode", "inventory");
const siteFilter = option("--site", "all");
const outputRoot = resolve(projectRoot, option("--output", "qa-results"));
const allowedModes = new Set(["inventory", "local", "production", "all"]);

if (!allowedModes.has(mode)) throw new Error(`Unsupported mode: ${mode}`);

const sites = registry.sites.filter((site) => siteFilter === "all" || site.id === siteFilter);
if (!sites.length) throw new Error(`No registered site matches --site ${siteFilter}`);

const ignoredDirectories = new Set([
  ".git", ".next", ".research", "dist", "node_modules", "out", "outputs", "qa-results", "work"
]);
const supportRoutePattern = /(?:^|\/)(?:404|_not-found)(?:\/|\.html?$)/i;

function walkFiles(root, predicate, allowArtifactDirectory = false) {
  if (!existsSync(root)) return [];
  const files = [];
  const visit = (entry) => {
    const stat = statSync(entry);
    if (stat.isFile()) {
      if (predicate(entry)) files.push(entry);
      return;
    }
    for (const child of readdirSync(entry)) {
      if (!allowArtifactDirectory && ignoredDirectories.has(child)) continue;
      visit(join(entry, child));
    }
  };
  visit(root);
  return files.sort();
}

function routeFromHtml(artifactRoot, file) {
  const local = relative(artifactRoot, file).split(sep).join("/");
  if (local === "index.html") return "/";
  if (local.endsWith("/index.html")) return `/${local.slice(0, -"index.html".length)}`;
  return `/${local}`;
}

function routeFileCandidates(artifactRoot, pathname) {
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!decoded) return [join(artifactRoot, "index.html")];
  const direct = join(artifactRoot, decoded);
  const candidates = [direct];
  if (pathname.endsWith("/")) candidates.push(join(direct, "index.html"));
  else {
    candidates.push(`${direct}.html`);
    candidates.push(join(direct, "index.html"));
  }
  return candidates;
}

function htmlFilesFor(site) {
  const repoRoot = resolve(familyRoot, site.repo);
  const artifactRoot = resolve(repoRoot, site.artifactRoot);
  const artifactIsDedicated = site.artifactRoot !== ".";
  const files = walkFiles(
    artifactRoot,
    (file) => file.endsWith(".html") && !supportRoutePattern.test(relative(artifactRoot, file).split(sep).join("/")),
    artifactIsDedicated
  );
  return { repoRoot, artifactRoot, files };
}

function extractAttributeValues(html, attribute) {
  const pattern = new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, "giu");
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function extractIds(html) {
  return new Set([
    ...extractAttributeValues(html, "id"),
    ...extractAttributeValues(html, "name")
  ]);
}

function stripMarkup(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&(?:nbsp|#160);/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function stateInventory(site, repoRoot) {
  const config = site.stateAudit;
  if (!config) return [];
  if (config.kind === "numbered-psalms") {
    return Array.from({ length: 150 }, (_, index) => ({ kind: "interaction", id: `psalm-${index + 1}` }));
  }
  const source = join(repoRoot, config.source);
  if (!existsSync(source)) return [{ kind: "inventory-error", id: `missing:${config.source}` }];
  const text = readFileSync(source, "utf8");
  if (config.kind === "christ-scenes") {
    const ids = new Set([...text.matchAll(/\{\s*id\s*:\s*["']([^"']+)["']\s*,\s*era\s*:/gu)].map((match) => match[1]));
    return [...ids].sort().map((id) => ({ kind: "url", id, path: `/#${encodeURIComponent(id)}` }));
  }
  if (config.kind === "last-day-events") {
    const eventsBlock = text.match(/const\s+events\s*=\s*\[([\s\S]*?)\n\];/u)?.[1] ?? "";
    const slugify = (value) => value
      .toLowerCase()
      .replace(/&/gu, "and")
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "");
    const ids = new Set(
      [...eventsBlock.matchAll(/\btitle\s*:\s*["']([^"']+)["']/gu)]
        .map((match) => slugify(match[1]))
    );
    return [...ids].sort().flatMap((id) => [
      { kind: "url", id: `article:${id}`, path: `/article.html?event=${encodeURIComponent(id)}` },
      { kind: "url", id: `timeline:${id}`, path: `/timeline.html#timeline-event-${encodeURIComponent(id)}` }
    ]);
  }
  if (config.kind === "object-ids") {
    const ids = new Set([...text.matchAll(/\bid\s*:\s*["']([^"']+)["']/gu)].map((match) => match[1]));
    return [...ids].sort().map((id) => ({ kind: "interaction", id }));
  }
  if (config.kind === "data-attributes") {
    const states = [];
    for (const attribute of config.attributes ?? []) {
      for (const id of new Set(extractAttributeValues(text, attribute))) {
        states.push({ kind: "interaction", id: `${attribute}:${id}` });
      }
    }
    return states.sort((a, b) => a.id.localeCompare(b.id));
  }
  return [];
}

function auditHtml(site, artifactRoot, file, route) {
  const html = readFileSync(file, "utf8");
  const staticMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ");
  const issues = [];
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1]?.replace(/\s+/gu, " ").trim() ?? "";
  const h1Count = (html.match(/<h1\b/giu) ?? []).length;
  const headingCount = (html.match(/<h[1-6]\b/giu) ?? []).length;
  const visibleText = stripMarkup(html);
  const redirectsImmediately = /<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/iu.test(html);
  const clientRendered = /self\.__next_f|<[^>]+\bid=["'](?:app|root)["']/iu.test(html)
    || site.clientRenderedRoutes?.includes(route);
  const base = new URL(route, `https://${site.domain}/`);
  const ids = extractIds(html);

  if (!title) issues.push({ severity: "error", type: "missing-title", route });
  if (visibleText.length < 40 && !redirectsImmediately && !clientRendered) {
    issues.push({ severity: "error", type: "empty-shell", route, detail: `${visibleText.length} visible characters` });
  }
  if (!headingCount && !redirectsImmediately && !clientRendered) {
    issues.push({ severity: "warning", type: "missing-static-heading", route });
  }

  const references = [
    ...extractAttributeValues(staticMarkup, "href").map((value) => ({ attribute: "href", value })),
    ...extractAttributeValues(staticMarkup, "src").map((value) => ({ attribute: "src", value }))
  ];
  for (const reference of references) {
    const value = reference.value.trim();
    if (!value || /^(?:data:|mailto:|tel:|javascript:)/iu.test(value)) continue;
    let resolved;
    try {
      resolved = new URL(value, base);
    } catch {
      issues.push({ severity: "error", type: "invalid-url", route, detail: value });
      continue;
    }
    if (resolved.hostname !== site.domain) continue;
    if (resolved.pathname === base.pathname && resolved.hash) {
      const target = decodeURIComponent(resolved.hash.slice(1));
      if (target && !ids.has(target) && !site.clientGeneratedFragments) {
        issues.push({ severity: "error", type: "missing-fragment", route, detail: value });
      }
      continue;
    }
    const candidates = routeFileCandidates(artifactRoot, resolved.pathname);
    if (!candidates.some(existsSync)) {
      issues.push({ severity: "error", type: "missing-local-target", route, detail: value });
    }
  }

  return {
    route,
    file: relative(projectRoot, file),
    title,
    h1Count,
    headingCount,
    textLength: visibleText.length,
    sha256: createHash("sha256").update(html).digest("hex"),
    issues
  };
}

async function mapConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
  try {
    return await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "MyBibleExplorer-QA/1.0", ...(options.headers ?? {}) },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function auditProductionRoute(site, route) {
  const url = new URL(route, `https://${site.domain}/`).href;
  const issues = [];
  try {
    const response = await fetchWithTimeout(url);
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("text/html") ? await response.text() : "";
    const title = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1]?.replace(/\s+/gu, " ").trim() ?? "";
    const redirectsImmediately = /<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/iu.test(body);
    if (!response.ok) issues.push({ severity: "error", type: "http-status", route, detail: `${response.status}` });
    if (!response.url.startsWith("https://")) issues.push({ severity: "error", type: "insecure-final-url", route, detail: response.url });
    if (contentType.includes("text/html")) {
      if (!title) issues.push({ severity: "error", type: "missing-title", route });
      if (stripMarkup(body).length < 40 && !redirectsImmediately) {
        issues.push({ severity: "error", type: "empty-shell", route });
      }
      const brokenImages = extractAttributeValues(body, "src").filter((value) => !value.trim());
      if (brokenImages.length) issues.push({ severity: "error", type: "empty-image-source", route, detail: `${brokenImages.length}` });
    }
    return { route, url, finalUrl: response.url, status: response.status, contentType, title, issues };
  } catch (error) {
    return { route, url, status: 0, issues: [{ severity: "error", type: "request-failed", route, detail: error.message }] };
  }
}

function summarizeSite(site, inventory, localPages, productionPages) {
  const issues = [
    ...(site.stateAudit?.minimum && inventory.states.length < site.stateAudit.minimum
      ? [{ severity: "error", type: "incomplete-state-inventory", route: "(inventory)", detail: `expected at least ${site.stateAudit.minimum}; found ${inventory.states.length}` }]
      : []),
    ...localPages.flatMap((page) => page.issues),
    ...productionPages.flatMap((page) => page.issues)
  ];
  return {
    id: site.id,
    domain: site.domain,
    repository: site.repo,
    stack: site.stack,
    routeCount: inventory.routes.length,
    stateCount: inventory.states.length,
    routes: inventory.routes,
    states: inventory.states,
    knownDeferredContent: site.knownDeferredContent ?? [],
    localPages,
    productionPages,
    issues,
    counts: {
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length
    }
  };
}

const reports = [];
for (const site of sites) {
  const { repoRoot, artifactRoot, files } = htmlFilesFor(site);
  const routes = files.map((file) => routeFromHtml(artifactRoot, file));
  const states = stateInventory(site, repoRoot);
  const inventory = { routes, states };
  const localPages = mode === "local" || mode === "all"
    ? files.map((file, index) => auditHtml(site, artifactRoot, file, routes[index]))
    : [];
  const productionRoutes = [...new Set([
    ...routes,
    ...states.filter((state) => state.kind === "url").map((state) => state.path)
  ])];
  const productionPages = mode === "production" || mode === "all"
    ? await mapConcurrent(productionRoutes, 8, (route) => auditProductionRoute(site, route))
    : [];
  reports.push(summarizeSite(site, inventory, localPages, productionPages));
}

const totals = reports.reduce((summary, site) => {
  summary.sites += 1;
  summary.routes += site.routeCount;
  summary.states += site.stateCount;
  summary.errors += site.counts.errors;
  summary.warnings += site.counts.warnings;
  return summary;
}, { sites: 0, routes: 0, states: 0, errors: 0, warnings: 0 });

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode,
  siteFilter,
  totals,
  externalAllowlist: registry.externalAllowlist,
  sites: reports
};

mkdirSync(outputRoot, { recursive: true });
writeFileSync(join(outputRoot, `family-${mode}.json`), `${JSON.stringify(result, null, 2)}\n`);
const markdown = [
  "# My Bible Explorer family QA",
  "",
  `Generated: ${result.generatedAt}`,
  "",
  `Mode: ${mode}`,
  "",
  `Sites: ${totals.sites} · Routes: ${totals.routes} · States: ${totals.states} · Errors: ${totals.errors} · Warnings: ${totals.warnings}`,
  "",
  "| Site | Routes | States | Errors | Warnings |",
  "|---|---:|---:|---:|---:|",
  ...reports.map((site) => `| ${site.domain} | ${site.routeCount} | ${site.stateCount} | ${site.counts.errors} | ${site.counts.warnings} |`),
  "",
  ...reports.flatMap((site) => site.issues.length ? [
    `## ${site.domain}`,
    "",
    ...site.issues.map((issue) => `- **${issue.severity.toUpperCase()}** ${issue.type} — ${issue.route}${issue.detail ? ` — ${issue.detail}` : ""}`),
    ""
  ] : [])
].join("\n");
writeFileSync(join(outputRoot, `family-${mode}.md`), `${markdown}\n`);

console.log(`Audited ${totals.sites} sites, ${totals.routes} routes, and ${totals.states} application states.`);
console.log(`Errors: ${totals.errors}; warnings: ${totals.warnings}`);
console.log(`Reports: ${relative(projectRoot, outputRoot)}/family-${mode}.{json,md}`);
if (totals.errors) process.exitCode = 1;
