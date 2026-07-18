#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(root, "qa", "sites.json"), "utf8"));
const screenshots = JSON.parse(readFileSync(join(root, "qa", "deck-screenshots.json"), "utf8"));
const books = JSON.parse(readFileSync(join(root, "qa", "content-books.json"), "utf8"));
const familyRoot = resolve(root, registry.familyRoot);
const errors = [];

const require = (condition, message) => {
  if (!condition) errors.push(message);
};

function validateRegisteredCommand(site, repoRoot, command, field) {
  const packageScript = command.match(/^(?:npm|pnpm)\s+run\s+([^\s]+)/u)?.[1];
  if (packageScript) {
    const packagePath = join(repoRoot, "package.json");
    require(existsSync(packagePath), `${site.id}: ${field} command requires a missing package.json (${command})`);
    if (existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
      require(Boolean(packageJson.scripts?.[packageScript]), `${site.id}: ${field} names an unknown package script (${command})`);
    }
    return;
  }

  const nodeFile = command.match(/^node\s+(?:--check\s+)?([^\s-][^\s]*)/u)?.[1];
  if (nodeFile) require(existsSync(resolve(repoRoot, nodeFile)), `${site.id}: ${field} names a missing Node file (${command})`);
}

require(registry.schemaVersion === 1, "sites.json must use schemaVersion 1");
require(registry.sites.length === 18, `expected 18 canonical sites; found ${registry.sites.length}`);
require(registry.deploymentDefaults?.provider === "github-pages", "default deployment provider must be GitHub Pages");
require(registry.deploymentDefaults?.branch === "main", "default deployment branch must be main");
require(registry.deploymentDefaults?.httpsRequired === true, "HTTPS must be required family-wide");

const ids = new Set();
const domains = new Set();
const repos = new Set();
for (const site of registry.sites) {
  require(!ids.has(site.id), `duplicate site id ${site.id}`);
  require(!domains.has(site.domain), `duplicate domain ${site.domain}`);
  require(!repos.has(site.repo), `duplicate canonical repository ${site.repo}`);
  ids.add(site.id);
  domains.add(site.domain);
  repos.add(site.repo);
  require(site.domain === "mybibleexplorer.com" || site.domain.endsWith(".mybibleexplorer.com"), `${site.id}: domain is outside the family`);
  require(Array.isArray(site.build), `${site.id}: build commands must be an array`);
  require(site.validate === undefined || Array.isArray(site.validate), `${site.id}: validation commands must be an array when present`);
  require(Array.isArray(site.routeSeeds) && site.routeSeeds.length > 0, `${site.id}: route seeds are missing`);
  require(site.routeSeeds?.every((route) => route.startsWith("/")), `${site.id}: every route seed must be root-relative`);
  const repoRoot = resolve(familyRoot, site.repo);
  require(existsSync(join(repoRoot, ".git")), `${site.id}: canonical repository is missing at ${repoRoot}`);
  require(existsSync(resolve(repoRoot, site.artifactRoot)), `${site.id}: artifact root is missing (${site.artifactRoot})`);
  for (const command of site.build ?? []) validateRegisteredCommand(site, repoRoot, command, "build");
  for (const command of site.validate ?? []) validateRegisteredCommand(site, repoRoot, command, "validation");
  const cnameFiles = [join(repoRoot, "CNAME"), join(repoRoot, "public", "CNAME")].filter(existsSync);
  require(cnameFiles.length > 0, `${site.id}: no canonical CNAME source is present`);
  for (const cname of cnameFiles) {
    require(readFileSync(cname, "utf8").trim() === site.domain, `${site.id}: ${cname} does not match ${site.domain}`);
  }
}

for (const duplicate of registry.excludedDuplicateDirectories ?? []) {
  require(!repos.has(duplicate), `excluded duplicate was registered: ${duplicate}`);
}

const subdomainSites = registry.sites.filter((site) => site.id !== "hub");
const screenshotDomains = new Set(screenshots.screenshots.map((item) => new URL(item.url).hostname));
require(screenshots.screenshots.length === 17, `expected 17 deck screenshots; found ${screenshots.screenshots.length}`);
for (const site of subdomainSites) require(screenshotDomains.has(site.domain), `missing deck screenshot entry for ${site.domain}`);
for (const domain of screenshotDomains) require(domains.has(domain) && domain !== "mybibleexplorer.com", `unexpected deck screenshot domain ${domain}`);

const philippians = registry.sites.find((site) => site.id === "philippians");
const philippiansBook = books.books.find((book) => book.book === "Philippians");
require(JSON.stringify(philippians?.knownDeferredContent) === JSON.stringify(["Philippians 4:1-23"]), "Philippians 4 must be the sole registered deferred content");
require(JSON.stringify(philippiansBook?.excludedFromCertification) === JSON.stringify([4]), "Philippians chapter 4 must stay excluded from certification");
require(registry.sites.filter((site) => site.knownDeferredContent?.length).length === 1, "no site other than Philippians may register deferred content");
const philippiansReader = readFileSync(resolve(familyRoot, "Philippians", "components", "verse-accordion.tsx"), "utf8");
require(philippiansReader.includes("User commentary · editorial review deferred"), "Philippians 4 must display its deferred-review notice");

const christ = registry.sites.find((site) => site.id === "christ");
require(christ?.deployment?.preserveSitesMetadata === true, "Christ must preserve Sites metadata");
require(christ?.deployment?.publishWithSites === false, "Christ must not publish another Sites release");

const commandSet = (siteId, field) => new Set(registry.sites.find((site) => site.id === siteId)?.[field] ?? []);
require(
  commandSet("colossians", "validate").has("npm run audit:humanization"),
  "Colossians must run its authored-prose humanization audit"
);
require(
  commandSet("daniel", "validate").has("node scripts/sync-daniel-hydration.mjs --check"),
  "Daniel must validate its deployed hydration artifacts"
);
require(
  commandSet("hermeneutics", "validate").has("node scripts/validate-production-repairs.mjs"),
  "Hermeneutics must validate its production accessibility and runtime repairs"
);
require(
  commandSet("psalms", "validate").has("pnpm run check"),
  "Psalms must rebuild and validate its checked-in production assets"
);
require(
  commandSet("parables", "validate").has("node scripts/validate-interactions.mjs"),
  "Parables must validate all registered article and explorer interaction states"
);

if (errors.length) {
  console.error(`QA registry validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`QA registry validation passed: ${registry.sites.length} domains, ${subdomainSites.length} deck entries, ${books.books.length} structured commentary books, and one explicit deferred exception.`);
