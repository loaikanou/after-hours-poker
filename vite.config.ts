import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Files that should not be precached: big store screenshots and source SVG masters. */
const SKIP_PRECACHE = [/^sw\.js$/, /^screenshots\//, /^og-image\./, /^robots\.txt$/, /^sitemap\.xml$/, /^icons\/(?!icon\.svg$).*\.svg$/, /^icons\/icon-maskable-512\.png$/, /\.map$/];

/**
 * Stamps dist/sw.js with the list of built files and a build id, so each deploy
 * precaches exactly what it shipped (including lazily loaded chunks) and the
 * previous cache is cleaned up when the new worker activates.
 */
function serviceWorkerManifest(): Plugin {
  let outDir = "dist";
  let base = "/";
  return {
    name: "after-hours-sw-manifest",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
      base = config.base;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const path = join(dir, name);
          if (statSync(path).isDirectory()) walk(path);
          else files.push(relative(outDir, path).split(sep).join("/"));
        }
      };
      walk(outDir);
      const precache = files.filter((file) => !SKIP_PRECACHE.some((pattern) => pattern.test(file))).sort();
      const hash = createHash("sha256");
      for (const file of precache) hash.update(file).update(readFileSync(join(outDir, file)));
      const urls = precache.map((file) => (file === "index.html" ? base : `${base}${file}`));
      const swPath = join(outDir, "sw.js");
      const sw = readFileSync(swPath, "utf8")
        .replace('const BUILD_ID = "dev";', `const BUILD_ID = "${hash.digest("hex").slice(0, 12)}";`)
        .replace("[/* __PRECACHE__ */]", JSON.stringify(urls));
      writeFileSync(swPath, sw);
      this.info?.(`sw.js precaches ${urls.length} files`);
    },
  };
}

/**
 * Absolute public URL of the app (with trailing slash), used for canonical
 * links, social previews and the sitemap. Set SITE_URL explicitly, or let it be
 * derived from Vercel's production domain. Empty when unknown (local builds),
 * in which case URLs fall back to root-relative.
 */
function siteUrl(base: string): string {
  const explicit = process.env.SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const url = explicit || (vercel ? `https://${vercel}${base}` : "");
  return url ? `${url.replace(/\/+$/, "")}/` : "";
}

function structuredData(url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "After Hours",
    alternateName: "After Hours Card Club",
    url: url || undefined,
    description: "Free private card tables for friends: Texas Hold’em poker, Tarneeb and Trix, played live in the browser. No sign-up, no downloads.",
    applicationCategory: "GameApplication",
    genre: ["Card game", "Poker", "Tarneeb", "Trix"],
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires JavaScript",
    inLanguage: ["en", "ar"],
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    image: url ? `${url}og-image.jpg` : undefined,
    screenshot: url ? `${url}screenshots/table-wide.png` : undefined,
    author: { "@type": "Person", name: "Loai Kanou", url: "https://github.com/loaikanou" },
    license: "https://opensource.org/licenses/MIT",
    playMode: "MultiPlayer",
    numberOfPlayers: { "@type": "QuantitativeValue", minValue: 2, maxValue: 6 },
  };
}

/**
 * Fills the SEO placeholders in index.html and writes robots.txt + sitemap.xml.
 * Table links (`?table=CODE`) are private games, so crawlers are asked to skip them.
 */
function seo(): Plugin {
  let base = "/";
  let url = "";
  let outDir = "dist";
  return {
    name: "after-hours-seo",
    configResolved(config) {
      base = config.base;
      outDir = config.build.outDir;
      url = siteUrl(base);
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const json = JSON.stringify(structuredData(url)).replace(/</g, "\\u003c");
        // Canonical/hreflang links must be absolute; without a known site URL, leave them out.
        const page = url ? html : html.replace(/^\s*<link rel="(?:canonical|alternate)"[^>]*%SITE_URL%[^>]*>\n/gm, "");
        return page.replaceAll("%SITE_URL%", url || base).replace("%STRUCTURED_DATA%", json);
      },
    },
    closeBundle() {
      if (!url) this.warn?.("SITE_URL is not set: canonical and social-preview URLs are relative, and sitemap.xml is skipped.");
      const robots = ["User-agent: *", "Allow: /", "Disallow: /*?table=", "Disallow: /*&table="];
      if (url) robots.push("", `Sitemap: ${url}sitemap.xml`);
      writeFileSync(join(outDir, "robots.txt"), `${robots.join("\n")}\n`);
      if (!url) return;
      const today = new Date().toISOString().slice(0, 10);
      const alternates = [["en", url], ["ar", `${url}?lang=ar`], ["x-default", url]]
        .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href.replace(/&/g, "&amp;")}"/>`).join("\n");
      const entry = (loc: string) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n${alternates}\n  </url>`;
      writeFileSync(join(outDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entry(url)}
${entry(`${url}?lang=ar`)}
</urlset>
`);
    },
  };
}

/**
 * Public path the app is served from. "/" for Vercel or a custom domain;
 * "/<repo>/" for a GitHub Pages project site (set by the deploy workflow).
 */
function basePath(): string {
  const raw = process.env.BASE_PATH?.trim() || "/";
  return `/${raw.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");
}

export default defineConfig({
  base: basePath(),
  plugins: [react(), seo(), serviceWorkerManifest()],
  build: {
    target: "es2022",
    rolldownOptions: {
      output: {
        // Vendor code changes far less often than the app; separate chunks keep it cached across deploys.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: "convex", test: /node_modules[\\/]convex[\\/]/ },
          ],
        },
      },
    },
  },
});
