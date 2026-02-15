#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : fallback;
};

const FROM = getArg("--from", "sv");
const TO = getArg("--to", "en");
const DRY_RUN = args.includes("--dry-run");

const MESSAGES_DIR = path.join(process.cwd(), "messages");
const fromPath = path.join(MESSAGES_DIR, `${FROM}.json`);
const toPath = path.join(MESSAGES_DIR, `${TO}.json`);

// Här kan du lägga “riktiga” översättningar för specifika keys
// istället för att kopiera sv-värden in i t.ex. en.json.
const OVERRIDES = {
  en: {
    "ui.preferences.city": "City",
  },
};

function isPlainObject(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function collectLeafPaths(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj ?? {})) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) out.push(...collectLeafPaths(v, p));
    else out.push(p);
  }
  return out;
}

function getAtPath(obj, dotted) {
  const parts = dotted.split(".");
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object" || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setAtPath(obj, dotted, value) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!isPlainObject(cur[p])) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function applyOverrides(locale, keyPath, fallbackValue) {
  const v = OVERRIDES?.[locale]?.[keyPath];
  return v !== undefined ? v : fallbackValue;
}

async function main() {
  const fromRaw = await fs.readFile(fromPath, "utf8");
  const toRaw = await fs.readFile(toPath, "utf8");

  const fromJson = JSON.parse(fromRaw);
  const toJson = JSON.parse(toRaw);

  const fromKeys = collectLeafPaths(fromJson);
  const missing = fromKeys.filter((k) => getAtPath(toJson, k) === undefined);

  if (!missing.length) {
    console.log(`${TO}.json: inga saknade nycklar jämfört med ${FROM}.json`);
    return;
  }

  for (const k of missing) {
    const srcVal = getAtPath(fromJson, k);
    const valueToWrite = applyOverrides(TO, k, srcVal);
    setAtPath(toJson, k, valueToWrite);
  }

  console.log(`${TO}.json saknade ${missing.length} nyckel/nycklar. Lägger till:`);
  for (const k of missing) console.log(`  - ${k}`);

  if (DRY_RUN) {
    console.log("\nDRY-RUN: skrev inget till disk.");
    return;
  }

  await fs.writeFile(toPath, JSON.stringify(toJson, null, 2) + "\n", "utf8");
  console.log(`\nUppdaterade ${toPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});