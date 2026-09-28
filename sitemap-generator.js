#!/usr/bin/env node

/**
 * sitemap.xml generator for 100%health
 * リポジトリ内の公開 HTML を列挙（手動で URL を足さない）
 */

const fs = require("fs");
const path = require("path");

const config = {
  siteUrl: process.env.SITE_URL || "https://yuinoid.neocities.org",
  rootDir: path.resolve(__dirname),
  outputPath: path.resolve(__dirname, "sitemap.xml"),
};

const EXCLUDE_DIR_NAMES = new Set(["node_modules", "include", "dashboard"]);

const EXCLUDE_PATH_PREFIXES = ["gallery/image-page_/", "game/charamake_archive/"];

const EXCLUDE_FILES = new Set([
  "not_found.html",
  "game/charamake/game.archive.html",
]);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function shouldExclude(relPosix) {
  if (EXCLUDE_FILES.has(relPosix)) {
    return true;
  }
  const segments = relPosix.split("/");
  if (segments.some((seg) => EXCLUDE_DIR_NAMES.has(seg))) {
    return true;
  }
  return EXCLUDE_PATH_PREFIXES.some(
    (prefix) => relPosix === prefix.slice(0, -1) || relPosix.startsWith(prefix),
  );
}

function walkHtmlFiles(dir, results) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPosix = toPosix(path.relative(config.rootDir, fullPath));

    if (entry.isDirectory()) {
      if (shouldExclude(relPosix)) {
        continue;
      }
      walkHtmlFiles(fullPath, results);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".html")) {
      continue;
    }
    if (shouldExclude(relPosix)) {
      continue;
    }

    const stat = fs.statSync(fullPath);
    results.push({ relPosix, mtime: stat.mtime });
  }
}

function buildLoc(relPosix) {
  if (relPosix === "index.html") {
    return `${config.siteUrl}/`;
  }
  const encoded = relPosix
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${config.siteUrl}/${encoded}`;
}

function formatLastmod(date) {
  return date.toISOString().slice(0, 10);
}

function generateSitemap(entries) {
  entries.sort((a, b) => a.relPosix.localeCompare(b.relPosix, "en"));

  const urlBlocks = entries
    .map(({ relPosix, mtime }) => {
      const loc = buildLoc(relPosix);
      const lastmod = formatLastmod(mtime);
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlBlocks}
</urlset>
`;
}

function main() {
  const entries = [];
  walkHtmlFiles(config.rootDir, entries);
  const xml = generateSitemap(entries);
  fs.writeFileSync(config.outputPath, xml, "utf8");
  console.log(`OK: ${entries.length} URLs → ${config.outputPath}`);
}

main();
