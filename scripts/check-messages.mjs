import fs from "node:fs";
import path from "node:path";

function isObject(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function flatten(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isObject(v)) flatten(v, key, out);
    else out.push(key);
  }
  return out;
}

const dir = path.join(process.cwd(), "messages");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

const all = {};
for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), "utf8");
  const json = JSON.parse(raw);
  all[f] = new Set(flatten(json));
}

const union = new Set();
for (const set of Object.values(all)) for (const k of set) union.add(k);

for (const f of files) {
  const missing = [...union].filter((k) => !all[f].has(k)).sort();
  if (missing.length) {
    console.log(`\n${f} saknar ${missing.length} nycklar:`);
    for (const k of missing) console.log("  -", k);
  } else {
    console.log(`\n${f} OK (inga saknade nycklar)`);
  }
}