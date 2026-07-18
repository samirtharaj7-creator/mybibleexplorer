#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(root, "qa", "content-books.json"), "utf8"));
const familyRoot = resolve(root, "..");
const {
  SCRIPTURE_VERSE_COUNTS,
  SINGLE_CHAPTER_BOOKS,
  normalizeScriptureBookName
} = await import(pathToFileURL(resolve(familyRoot, "Colossians", "scripts", "scripture-canon.mjs")).href);
const unresolved = new Set(config.unresolvedReviewStatuses);
const errors = [];
let certifiedVerses = 0;
let excludedVerses = 0;
let referencesChecked = 0;

function fail(book, file, verse, message) {
  errors.push(`${book.book} · ${file}${verse ? ` · ${verse}` : ""}: ${message}`);
}

function sourceAuditIsPrivate(audit) {
  if (!audit || typeof audit !== "object" || Array.isArray(audit)) return true;
  return Object.values(audit).every((value) => !Array.isArray(value) || value.length === 0);
}

function validateReference(book, file, verse, citation, field) {
  if (typeof citation !== "string" || !citation.trim()) {
    fail(book, file, verse, `${field} must be a nonblank Scripture reference`);
    return;
  }
  const normalized = citation.trim().replace(/[–—]/gu, "-");
  const aliases = {
    Psalm: "Psalms",
    "Song of Songs": "Song of Solomon"
  };
  const names = [...Object.keys(SCRIPTURE_VERSE_COUNTS), ...Object.keys(aliases)]
    .sort((left, right) => right.length - left.length);
  const rawBookName = names.find((name) => normalized.toLocaleLowerCase().startsWith(`${name.toLocaleLowerCase()} `));
  if (!rawBookName) {
    fail(book, file, verse, `${field} has invalid format: ${citation}`);
    return;
  }
  const bookName = normalizeScriptureBookName(rawBookName);
  const verseCounts = SCRIPTURE_VERSE_COUNTS[bookName];
  if (!verseCounts) {
    fail(book, file, verse, `${field} names an unrecognized biblical book: ${rawBookName}`);
    return;
  }
  const remainder = normalized.slice(rawBookName.length + 1).trim();
  let chapter;
  let ranges;
  if (!remainder.includes(":")) {
    if (!SINGLE_CHAPTER_BOOKS.has(bookName)) {
      fail(book, file, verse, `${field} omits the chapter for ${rawBookName}: ${citation}`);
      return;
    }
    chapter = 1;
    ranges = remainder;
  } else {
    const chapterMatch = remainder.match(/^(\d+):(.+)$/u);
    if (!chapterMatch) {
      fail(book, file, verse, `${field} has invalid chapter and verse syntax: ${citation}`);
      return;
    }
    chapter = Number(chapterMatch[1]);
    ranges = chapterMatch[2];
  }
  if (!Number.isSafeInteger(chapter) || chapter < 1 || chapter > verseCounts.length) {
    fail(book, file, verse, `${field} cites nonexistent ${bookName} chapter ${chapter}`);
    return;
  }
  for (const range of ranges.split(",").map((part) => part.trim())) {
    const rangeMatch = range.match(/^(\d+)(?:-(?:(\d+):)?(\d+))?$/u);
    if (!rangeMatch) {
      fail(book, file, verse, `${field} has invalid verse list: ${citation}`);
      continue;
    }
    const start = Number(rangeMatch[1]);
    const endChapter = Number(rangeMatch[2] ?? chapter);
    const end = Number(rangeMatch[3] ?? rangeMatch[1]);
    const maximum = verseCounts[chapter - 1];
    const endMaximum = verseCounts[endChapter - 1];
    if (
      start < 1
      || start > maximum
      || endChapter < chapter
      || endChapter > verseCounts.length
      || end < 1
      || end > endMaximum
      || (endChapter === chapter && end < start)
    ) {
      fail(book, file, verse, `${field} exceeds ${bookName} ${chapter}:1-${maximum}: ${citation}`);
    }
  }
  referencesChecked += 1;
}

for (const book of config.books) {
  const contentRoot = resolve(familyRoot, book.repo, book.root);
  if (!existsSync(contentRoot)) {
    fail(book, book.root, "", "content root is missing");
    continue;
  }
  const files = readdirSync(contentRoot).filter((file) => /^chapter-\d{2}\.json$/u.test(file)).sort();
  if (files.length !== book.chapterCount) {
    fail(book, book.root, "", `expected ${book.chapterCount} chapter files; found ${files.length}`);
  }

  for (let chapter = 1; chapter <= book.chapterCount; chapter += 1) {
    const file = `chapter-${String(chapter).padStart(2, "0")}.json`;
    const path = join(contentRoot, file);
    if (!existsSync(path)) {
      fail(book, file, "", "chapter file is missing");
      continue;
    }
    let data;
    try {
      data = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      fail(book, file, "", `invalid JSON (${error.message})`);
      continue;
    }
    if (data.chapterNumber !== chapter) fail(book, file, "", `chapterNumber must be ${chapter}`);
    if (!Array.isArray(data.verses) || !data.verses.length) {
      fail(book, file, "", "verses must be a nonempty array");
      continue;
    }

    const excluded = book.excludedFromCertification?.includes(chapter) ?? false;
    const seen = new Set();
    for (let index = 0; index < data.verses.length; index += 1) {
      const verse = data.verses[index];
      const expected = `${book.book} ${chapter}:${index + 1}`;
      if (verse.verse !== expected) fail(book, file, verse.verse, `expected canonical identity ${expected}`);
      if (seen.has(verse.verse)) fail(book, file, verse.verse, "duplicate verse identity");
      seen.add(verse.verse);
      if (typeof verse.bibleText !== "string" || !verse.bibleText.trim()) fail(book, file, verse.verse, "KJV text is blank");
      if (!Array.isArray(verse.crossReferences) || verse.crossReferences.some((reference) => typeof reference !== "string" || !reference.trim())) {
        fail(book, file, verse.verse, "crossReferences must contain only nonblank strings");
      } else {
        verse.crossReferences.forEach((reference, index) => validateReference(book, file, verse.verse, reference, `crossReferences[${index}]`));
      }
      if (!Array.isArray(verse.wordNotes) || verse.wordNotes.length > book.maxWordNotes) {
        fail(book, file, verse.verse, `wordNotes must contain at most ${book.maxWordNotes} entries`);
      } else {
        verse.wordNotes.forEach((note, noteIndex) => {
          if (!Array.isArray(note.scriptureReferences)) {
            fail(book, file, verse.verse, `wordNotes[${noteIndex}].scriptureReferences must be an array`);
            return;
          }
          note.scriptureReferences.forEach((reference, index) => validateReference(
            book,
            file,
            verse.verse,
            reference,
            `wordNotes[${noteIndex}].scriptureReferences[${index}]`
          ));
        });
      }
      if (Array.isArray(verse.sources) && verse.sources.length) fail(book, file, verse.verse, "public sources must remain empty");
      if (!sourceAuditIsPrivate(verse.sourceAudit)) fail(book, file, verse.verse, "public sourceAudit arrays must remain empty");

      if (excluded) {
        excludedVerses += 1;
        continue;
      }
      const commentary = verse.commentary?.detailedExplanation;
      if (typeof commentary !== "string" || !commentary.trim()) fail(book, file, verse.verse, "detailed commentary is blank");
      if (unresolved.has(verse.reviewStatus ?? "")) fail(book, file, verse.verse, `unresolved reviewStatus ${JSON.stringify(verse.reviewStatus ?? "")}`);
      certifiedVerses += 1;
    }
  }
}

if (errors.length) {
  console.error(`Family content validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Family content validation passed: ${certifiedVerses} structurally reviewed verses and ${referencesChecked} canonical Scripture references; ${excludedVerses} user-owned Philippians 4 verses excluded from certification.`);
