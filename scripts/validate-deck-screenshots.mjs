#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "qa", "deck-screenshots.json"), "utf8"));
const hub = readFileSync(join(root, "index.html"), "utf8");
const errors = [];
const hashes = new Map();

function pngSize(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

if (manifest.screenshots.length !== 17) errors.push(`Expected 17 deck screenshots; found ${manifest.screenshots.length}.`);
if (Number.isNaN(Date.parse(manifest.capture.capturedAt))) errors.push("Capture manifest has no valid capturedAt timestamp.");
if (manifest.capture.cardFit !== "cover" || manifest.capture.cardPosition !== "top center") {
  errors.push("Capture manifest does not match the hub card crop CSS.");
}

for (const screenshot of manifest.screenshots) {
  const file = join(root, screenshot.file);
  if (!existsSync(file)) {
    errors.push(`${screenshot.id}: missing ${screenshot.file}.`);
    continue;
  }
  const bytes = readFileSync(file);
  const size = pngSize(bytes);
  if (!size) errors.push(`${screenshot.id}: file is not a valid PNG.`);
  else if (size.width !== manifest.capture.width || size.height !== manifest.capture.height) {
    errors.push(`${screenshot.id}: expected ${manifest.capture.width}x${manifest.capture.height}, found ${size.width}x${size.height}.`);
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (screenshot.bytes !== bytes.length) errors.push(`${screenshot.id}: expected ${screenshot.bytes} bytes, found ${bytes.length}.`);
  if (screenshot.sha256 !== hash) errors.push(`${screenshot.id}: SHA-256 does not match the capture manifest.`);
  if (hashes.has(hash)) errors.push(`${screenshot.id}: duplicates ${hashes.get(hash)}.`);
  else hashes.set(hash, screenshot.id);
  if (!hub.includes(`${screenshot.file}?v=qa20260718`)) errors.push(`${screenshot.id}: not referenced with the current cache version.`);
  const expectedDomain = new URL(screenshot.url).hostname;
  if (!hub.includes(expectedDomain)) errors.push(`${screenshot.id}: ${expectedDomain} is not linked by index.html.`);
}

if (errors.length) {
  console.error(`Deck screenshot validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Deck screenshot validation passed: ${manifest.screenshots.length} distinct ${manifest.capture.width}x${manifest.capture.height} PNG files.`);
