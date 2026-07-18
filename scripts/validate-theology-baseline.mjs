#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const familyRoot = resolve(root, "..");
const policy = JSON.parse(readFileSync(join(root, "qa", "review-policy.json"), "utf8"));
const content = JSON.parse(readFileSync(join(root, "qa", "content-books.json"), "utf8"));
const errors = [];
let stringsChecked = 0;

const expectedSafeguards = new Set([
  "christ-full-divinity-and-humanity",
  "salvation-by-grace-not-merit",
  "law-and-sabbath-distinctions",
  "cross-complete-and-sanctuary-ministry",
  "1844-christ-centered-judgment",
  "conditional-immortality-and-resurrection",
  "six-day-creation",
  "remnant-mission-without-exclusive-salvation",
  "historicist-prophecy-with-qualified-alternatives",
  "spiritual-gifts-subordinate-to-scripture",
  "no-date-setting-or-conspiracy-certainty"
]);

const safeguards = new Set(policy.requiredSafeguards ?? []);
for (const id of expectedSafeguards) if (!safeguards.has(id)) errors.push(`missing doctrinal safeguard ${id}`);
for (const id of safeguards) if (!expectedSafeguards.has(id)) errors.push(`unknown doctrinal safeguard ${id}`);

const authorities = new Map((policy.interpretiveOrder ?? []).map((item) => [item.authority, item]));
if (authorities.get("Seventh-day Adventist 28 Fundamental Beliefs")?.url !== "https://www.adventist.org/beliefs/") {
  errors.push("the current 28 Fundamental Beliefs URL is missing or altered");
}
if (authorities.get("Methods of Bible Study")?.url !== "https://www.adventistbiblicalresearch.org/materials/methods-of-bible-study/") {
  errors.push("the voted Methods of Bible Study URL is missing or altered");
}
if (policy.philippians4?.editorialOrTheologicalCertification !== false || policy.philippians4?.verses !== 23) {
  errors.push("Philippians 4 must remain a 23-verse user-owned exclusion from certification");
}

const prohibitedAssertions = [
  { id: "created-christ", pattern: /\b(?:Jesus|Christ) (?:is|was) (?:merely |only |a )?created (?:being|creature)\b/iu },
  { id: "denied-deity", pattern: /\b(?:Jesus|Christ) (?:is|was) not (?:fully )?(?:divine|God)\b/iu },
  { id: "works-merit", pattern: /\b(?:works|obedience|law[- ]keeping) (?:earns?|merits?|secures?) (?:our )?salvation\b/iu },
  { id: "naturally-immortal-soul", pattern: /\b(?:the )?(?:human )?soul is naturally immortal\b/iu },
  { id: "exclusive-salvation", pattern: /\bonly Seventh[- ]day Adventists (?:are|will be) saved\b/iu },
  { id: "equal-authority", pattern: /\bEllen (?:G\. )?White(?:'s)? (?:writings? )?(?:are|is) equal (?:in authority )?to Scripture\b/iu },
  { id: "incomplete-cross", pattern: /\b(?:the )?cross (?:was|is) (?:incomplete|insufficient|not enough)\b/iu },
  { id: "automatic-sunday-mark", pattern: /\b(?:every|any) Sunday worshipper (?:already )?(?:has|receives?) the mark of the beast\b/iu },
  { id: "date-setting", pattern: /\b(?:Jesus|Christ) will return (?:in|on) (?:20\d{2}|[A-Z][a-z]+ \d{1,2}, 20\d{2})\b/u }
];

function isNegatedOrQualified(value, matchIndex) {
  const sentenceStart = Math.max(
    value.lastIndexOf(".", matchIndex),
    value.lastIndexOf("!", matchIndex),
    value.lastIndexOf("?", matchIndex),
    value.lastIndexOf("\n", matchIndex)
  );
  const lead = value.slice(sentenceStart + 1, matchIndex);
  return /\b(?:not|never|cannot|can't|doesn't|does not|did not|denies?|rejects?|without)\b/iu.test(lead);
}

function collectStrings(value, path, output) {
  if (typeof value === "string") {
    output.push({ path, value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, output));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (["bibleText", "sources", "sourceAudit"].includes(key)) continue;
    collectStrings(child, `${path}.${key}`, output);
  }
}

for (const book of content.books) {
  const directory = resolve(familyRoot, book.repo, book.root);
  for (const file of readdirSync(directory).filter((name) => /^chapter-\d{2}\.json$/u.test(name)).sort()) {
    const chapter = Number(file.match(/\d+/u)[0]);
    if (book.book === "Philippians" && chapter === 4) continue;
    const strings = [];
    collectStrings(JSON.parse(readFileSync(join(directory, file), "utf8")), `${book.book}/${file}`, strings);
    for (const entry of strings) {
      stringsChecked += 1;
      for (const rule of prohibitedAssertions) {
        const match = entry.value.match(rule.pattern);
        if (match?.index != null && !isNegatedOrQualified(entry.value, match.index)) {
          errors.push(`${entry.path}: prohibited unqualified assertion (${rule.id})`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error(`Theology baseline validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Theology baseline validation passed: ${safeguards.size} policy safeguards and ${stringsChecked} public authored strings checked; Philippians 4 excluded.`);
