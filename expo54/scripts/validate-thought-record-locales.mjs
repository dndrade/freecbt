import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const globalLocales = join(appRoot, "src/i18n/locals");
const featureLocales = join(appRoot, "src/i18n/locales");
const localeNames = [
  "bg",
  "de",
  "en",
  "es",
  "fa",
  "fi",
  "fr",
  "hi",
  "it",
  "ko",
  "nb",
  "nl_NL",
  "pl",
  "pt-br",
  "pt-pt",
  "ro",
  "ru",
  "sv",
  "uk",
  "zh-Hans",
];
const wholeEntries = new Set([
  "auto_thought",
  "cog_distortion",
  "challenge",
  "alt_thought",
  "alt_thought_description",
  "cbt_list",
  "cbt_form",
  "cbt_view",
  "thought_delete",
]);
const distortionPrefixes = [
  "all_or_nothing_thinking",
  "over_generalization",
  "mind_reading",
  "fortune_telling",
  "magnification_of_the_negative",
  "minimization_of_the_positive",
  "catastrophizing",
  "emotional_reasoning",
  "should_statements",
  "labeling",
  "self_blaming",
  "other_blaming",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function thoughtRecordEntries(source) {
  const entries = Object.fromEntries(
    Object.entries(source).filter(
      ([key]) =>
        wholeEntries.has(key) ||
        distortionPrefixes.some(
          (prefix) => key === prefix || key.startsWith(`${prefix}_`),
        ),
    ),
  );
  for (const [root, key] of [
    ["settings", "journal"],
    ["accessibility", "delete_thought_button"],
  ]) {
    if (source[root]?.[key] !== undefined) {
      entries[root] = { [key]: source[root][key] };
    }
  }
  return entries;
}

assert.equal(localeNames.length, 20, "expected all supported locale files");
assert.deepEqual(
  readdirSync(featureLocales).sort(),
  localeNames,
  "Thought Record locale directories must match the supported locale set",
);
for (const locale of localeNames) {
  const source = readJson(join(globalLocales, `${locale}.json`));
  const local = readJson(join(featureLocales, locale, "thoughtRecord.json"));
  assert.deepEqual(
    local,
    thoughtRecordEntries(source),
    `${locale} must contain only current Thought Record entries from its global locale`,
  );
}

console.log("Thought Record locales match their global source entries.");
