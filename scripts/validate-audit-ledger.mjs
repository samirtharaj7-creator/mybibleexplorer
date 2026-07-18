#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ledger = JSON.parse(readFileSync(join(root, "qa", "audit-ledger.json"), "utf8"));
const inventory = JSON.parse(readFileSync(join(root, "qa-results", "family-inventory.json"), "utf8"));
const screenshots = JSON.parse(readFileSync(join(root, "qa", "deck-screenshots.json"), "utf8"));
const errors = [];
const require = (condition, message) => { if (!condition) errors.push(message); };

require(ledger.schemaVersion === 1, "audit ledger must use schemaVersion 1");
require(!Number.isNaN(Date.parse(ledger.generatedAt)), "audit ledger needs a valid generatedAt timestamp");
require(ledger.domains.length === 18, `expected 18 domain rows; found ${ledger.domains.length}`);
require(new Set(ledger.domains.map((site) => site.domain)).size === 18, "audit ledger has duplicate domains");
require(ledger.scope.domains === inventory.totals.sites, "ledger domain total differs from inventory");
require(ledger.scope.canonicalRoutes === inventory.totals.routes, "ledger route total differs from inventory");
require(ledger.scope.applicationStates === inventory.totals.states, "ledger state total differs from inventory");
require(ledger.scope.browserUrlsPerViewport === ledger.scope.canonicalRoutes + ledger.scope.urlStates, "browser URL coverage total is inconsistent");
require(ledger.scope.interactiveStates + ledger.scope.urlStates === ledger.scope.applicationStates, "state coverage categories are inconsistent");
require(ledger.validationTotals.desktopBrowserUrls === 550 && ledger.validationTotals.mobileBrowserUrls === 550, "both browser viewport crawls must cover 550 URLs");
require(ledger.validationTotals.psalmStates === 150 && ledger.validationTotals.parableStates === 61 && ledger.validationTotals.sanctuaryStates === 18, "interactive-state totals are incomplete");
require(ledger.browserAndAccessibility.unwaivedViolations === 0, "ledger records unwaived accessibility violations");
require(ledger.deferredException.content === "Philippians 4:1-23 commentary" && ledger.deferredException.records === 23, "Philippians 4 must be the sole 23-record deferred exception");
require(ledger.deferredException.certified === false, "Philippians 4 must not be certified");
const philippians4 = readFileSync(resolve(root, "..", "Philippians", "content", "philippians", "chapter-04.json"));
require(createHash("sha256").update(philippians4).digest("hex") === ledger.deferredException.sha256, "Philippians 4 checksum changed");
require(ledger.validationTotals.deckScreenshots === screenshots.screenshots.length, "ledger screenshot count differs from manifest");
require(ledger.validationTotals.deckScreenshotBytes === screenshots.screenshots.reduce((sum, item) => sum + item.bytes, 0), "ledger screenshot byte total differs from manifest");
require(ledger.domains.every((site) => site.status.startsWith("pass")), "one or more domain rows are not passing");

if (errors.length) {
  console.error(`Audit ledger validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Audit ledger validation passed: ${ledger.domains.length} domains, ${ledger.scope.canonicalRoutes} routes, ${ledger.scope.applicationStates} states, and one explicit deferred exception.`);
