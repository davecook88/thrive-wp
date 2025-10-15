#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, ".."); // theme root
const SHARED = path.resolve(ROOT, "../../shared");

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

const exts = new Set([".ts", ".tsx", ".js", ".jsx"]);
let changed = 0;

walk(ROOT, (file) => {
  if (!exts.has(path.extname(file))) return;
  // skip build and dist
  if (
    file.includes(`${path.sep}build${path.sep}`) ||
    file.includes(`${path.sep}dist${path.sep}`)
  )
    return;
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("../../../shared/")) return;

  const relToShared = path
    .relative(path.dirname(file), SHARED)
    .split(path.sep)
    .join("/");
  const replaced = src.replace(/(['\"])@shared\//g, `$1${relToShared}/`);
  if (replaced !== src) {
    fs.writeFileSync(file, replaced, "utf8");
    changed++;
    console.log("Updated", file);
  }
});

console.log(`Done. Files changed: ${changed}`);
