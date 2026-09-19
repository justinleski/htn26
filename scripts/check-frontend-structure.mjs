#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const designPath = join(
  repoRoot,
  "apps/frontend/.context/design.yaml",
);
const srcRoot = join(repoRoot, "apps/frontend/src");

function fail(message) {
  console.error(`frontend-structure: ${message}`);
  process.exitCode = 1;
}

function walkFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full));
    } else if (entry.isFile() && entry.name !== ".gitkeep") {
      files.push(full);
    }
  }
  return files;
}

function main() {
  if (!existsSync(designPath)) {
    fail(`missing design contract at ${relative(repoRoot, designPath)}`);
    return;
  }
  if (!existsSync(srcRoot)) {
    fail(`missing frontend src at ${relative(repoRoot, srcRoot)}`);
    return;
  }

  const design = parseYaml(readFileSync(designPath, "utf8"));
  const allowedDirs = new Set(design.structure?.allowed_dirs ?? []);
  const allowedRootFiles = new Set(design.structure?.allowed_root_files ?? []);
  const hooksPattern = new RegExp(
    design.enforcement?.hooks_pattern ?? "^use[A-Z].*\\.(ts|tsx)$",
  );
  const pagesPattern = new RegExp(
    design.enforcement?.pages_pattern ?? ".*Page\\.tsx$",
  );
  const layoutsPattern = new RegExp(
    design.enforcement?.layouts_pattern ?? ".*Layout\\.tsx$",
  );
  const createContextOnlyIn =
    design.enforcement?.create_context_only_in ?? "contexts";

  const topEntries = readdirSync(srcRoot, { withFileTypes: true });
  for (const entry of topEntries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      if (!allowedDirs.has(entry.name)) {
        fail(
          `unexpected directory src/${entry.name} — allowed: ${[...allowedDirs].join(", ")}`,
        );
      }
    } else if (entry.isFile()) {
      if (!allowedRootFiles.has(entry.name)) {
        fail(
          `unexpected root file src/${entry.name} — allowed: ${[...allowedRootFiles].join(", ")}`,
        );
      }
    }
  }

  for (const dir of allowedDirs) {
    const full = join(srcRoot, dir);
    if (!existsSync(full) || !statSync(full).isDirectory()) {
      fail(`required directory missing: src/${dir}`);
    }
  }

  for (const file of walkFiles(join(srcRoot, "hooks"))) {
    const name = relative(join(srcRoot, "hooks"), file).replaceAll("\\", "/");
    if (!hooksPattern.test(name)) {
      fail(`hooks file must match ${hooksPattern}: hooks/${name}`);
    }
  }

  for (const file of walkFiles(join(srcRoot, "pages"))) {
    const name = relative(join(srcRoot, "pages"), file).replaceAll("\\", "/");
    if (!pagesPattern.test(name)) {
      fail(`pages file must match ${pagesPattern}: pages/${name}`);
    }
  }

  for (const file of walkFiles(join(srcRoot, "layouts"))) {
    const name = relative(join(srcRoot, "layouts"), file).replaceAll("\\", "/");
    if (!layoutsPattern.test(name)) {
      fail(`layouts file must match ${layoutsPattern}: layouts/${name}`);
    }
  }

  const createContextRe = /\bcreateContext\s*[<(]/;
  for (const file of walkFiles(srcRoot)) {
    const rel = relative(srcRoot, file).replaceAll("\\", "/");
    if (![".ts", ".tsx"].includes(extname(file))) continue;
    if (rel.startsWith(`${createContextOnlyIn}/`)) continue;
    const source = readFileSync(file, "utf8");
    if (createContextRe.test(source)) {
      fail(
        `createContext is only allowed under src/${createContextOnlyIn}/ (found in src/${rel})`,
      );
    }
  }

  if (process.exitCode) {
    console.error("frontend-structure: failed — see apps/frontend/.context/design.yaml");
    process.exit(process.exitCode);
  }

  console.log("frontend-structure: ok");
}

main();
