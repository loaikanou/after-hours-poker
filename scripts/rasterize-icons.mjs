/**
 * Renders the SVG icons to PNG with a local Chrome/Chromium in headless mode.
 * Set CHROME=/path/to/chrome if it is not in the default macOS location.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(join(tmpdir(), "icons-"));

const jobs = [
  ["icons/icon.svg", "icons/icon-192.png", 192],
  ["icons/icon.svg", "icons/icon-512.png", 512],
  ["icons/icon-maskable.svg", "icons/icon-maskable-192.png", 192],
  ["icons/icon-maskable.svg", "icons/icon-maskable-512.png", 512],
  ["icons/icon-apple.svg", "icons/apple-touch-icon.png", 180],
  ["favicon.svg", "icons/favicon-32.png", 32],
  ["icons/shortcut-poker.svg", "icons/shortcut-poker.png", 96],
  ["icons/shortcut-tarneeb.svg", "icons/shortcut-tarneeb.png", 96],
  ["icons/shortcut-trix.svg", "icons/shortcut-trix.png", 96],
];

for (const [source, target, size] of jobs) {
  const svg = readFileSync(resolve("public", source), "utf8");
  const page = join(work, "page.html");
  writeFileSync(page, `<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}">`);
  const shot = join(work, "shot.png");
  execFileSync(chrome, [
    "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--default-background-color=00000000", `--window-size=${size},${size}`, `--screenshot=${shot}`, `file://${page}`,
  ], { stdio: "ignore" });
  renameSync(shot, resolve("public", target));
  console.log(`${target} (${size}px)`);
}
