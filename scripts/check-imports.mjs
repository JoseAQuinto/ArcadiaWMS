#!/usr/bin/env node
/**
 * Guards against the failure that took production down once already.
 *
 * Vercel compiles api/ and server/ to JavaScript and runs it as ESM (the
 * project is "type": "module"). Node's ESM resolver does NOT guess extensions
 * or resolve directory imports, so a specifier that TypeScript accepts happily
 * — `from "../utils/http"` — becomes ERR_MODULE_NOT_FOUND at runtime and takes
 * the whole function down with FUNCTION_INVOCATION_FAILED.
 *
 * Neither `tsc --noEmit` nor vitest catch it: both resolve imports their own
 * way. So we check it here, and `npm run build` runs it first.
 *
 * Rule: every relative import in api/ and server/ must end in ".js" and point
 * at a ".ts" file that exists.
 */
import fs from "node:fs";
import path from "node:path";

const ROOTS = ["api", "server", "scripts"];
const IMPORT_RE = /(?:from|import)\s+"(\.{1,2}\/[^"]*)"/g;

/** @returns {string[]} */
function collectTsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectTsFiles(full);
    return entry.isFile() && full.endsWith(".ts") ? [full] : [];
  });
}

const problems = [];

for (const file of ROOTS.flatMap(collectTsFiles)) {
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split("\n");

  for (const match of source.matchAll(IMPORT_RE)) {
    const specifier = match[1];
    const line = source.slice(0, match.index).split("\n").length;
    const context = lines[line - 1]?.trim() ?? "";

    if (!specifier.endsWith(".js")) {
      problems.push({
        file,
        line,
        context,
        reason: `falta la extensión ".js" (Node ESM no la adivina)`,
      });
      continue;
    }

    const target = path.resolve(path.dirname(file), specifier.replace(/\.js$/, ".ts"));
    if (!fs.existsSync(target)) {
      problems.push({
        file,
        line,
        context,
        reason: `apunta a un archivo que no existe (${path.relative(process.cwd(), target)})`,
      });
    }
  }
}

if (problems.length > 0) {
  console.error(`\n✖ ${problems.length} import(s) romperían la función en Vercel:\n`);
  for (const { file, line, context, reason } of problems) {
    console.error(`  ${file}:${line}`);
    console.error(`    ${context}`);
    console.error(`    → ${reason}\n`);
  }
  console.error("Los imports relativos de api/ y server/ deben llevar la extensión .js explícita.");
  console.error('Ejemplo: import { db } from "../db/index.js";\n');
  process.exit(1);
}

console.log("✓ imports ESM correctos");
