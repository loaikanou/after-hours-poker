/**
 * Generates the After Hours icon family as SVG. `npm run icons` also
 * rasterizes them to PNG with a local Chrome (see scripts/rasterize-icons.mjs).
 *
 * The mark: a crescent moon ("after hours") over a fanned ace pair on felt.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const SPADE = "M50 4C50 4 8 38 8 61c0 17 17 26 32 19 4-2 6-5 7-7-1 9-5 17-14 22h34c-9-5-13-13-14-22 1 2 3 5 7 7 15 7 32-2 32-19C92 38 50 4 50 4Z";
const HEART = "M50 92C20 68 5 52 5 32 5 17 16 7 30 7c10 0 17 6 20 14 3-8 10-14 20-14 14 0 25 10 25 25 0 20-15 36-45 60Z";
const DIAMOND = "M50 4 88 50 50 96 12 50Z";

const defs = `
  <defs>
    <radialGradient id="felt" cx="50%" cy="36%" r="78%">
      <stop offset="0" stop-color="#32704f"/><stop offset=".58" stop-color="#18452f"/><stop offset="1" stop-color="#0a2117"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4dca6"/><stop offset="1" stop-color="#bf8f46"/>
    </linearGradient>
    <linearGradient id="face" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ece3cf"/>
    </linearGradient>
    <mask id="moon"><rect width="512" height="512" fill="#fff"/><circle cx="414" cy="96" r="44" fill="#000"/></mask>
    <filter id="drop" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".42"/>
    </filter>
  </defs>`;

const pip = (path, x, y, size, fill) => `<path d="${path}" transform="translate(${x} ${y}) scale(${size / 100})" fill="${fill}"/>`;

function card(x, y, angle, suitPath, color) {
  return `
  <g transform="rotate(${angle} ${x + 85} ${y + 240})" filter="url(#drop)">
    <rect x="${x}" y="${y}" width="170" height="236" rx="22" fill="url(#face)"/>
    <rect x="${x + 6}" y="${y + 6}" width="158" height="224" rx="17" fill="none" stroke="#d9cfb8" stroke-width="2"/>
    ${pip(suitPath, x + 16, y + 18, 30, color)}
    ${pip(suitPath, x + 124, y + 188, 30, color)}
    ${pip(suitPath, x + 40, y + 73, 90, color)}
  </g>`;
}

const moon = `<circle cx="392" cy="116" r="44" fill="url(#gold)" mask="url(#moon)"/>
  <circle cx="122" cy="96" r="5" fill="#f4dca6" opacity=".8"/><circle cx="156" cy="132" r="3" fill="#f4dca6" opacity=".6"/><circle cx="452" cy="196" r="3.5" fill="#f4dca6" opacity=".6"/>`;

const art = `${moon}${card(134, 166, -13, HEART, "#c0362f")}${card(208, 150, 11, SPADE, "#1c231d")}`;

/** `shape`: "rounded" (any-purpose), "full" (maskable / Apple – the OS applies the mask). */
function icon({ shape = "rounded", safe = 1 } = {}) {
  const bg = shape === "rounded"
    ? `<rect width="512" height="512" rx="114" fill="url(#felt)"/><rect x="18" y="18" width="476" height="476" rx="98" fill="none" stroke="url(#gold)" stroke-opacity=".6" stroke-width="5"/>`
    : `<rect width="512" height="512" fill="url(#felt)"/>`;
  const content = safe === 1 ? art : `<g transform="translate(256 262) scale(${safe}) translate(-256 -262)">${art}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${defs}${bg}${content}</svg>\n`;
}

/** A simpler, bolder mark that survives 16–32 px tab icons. */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><radialGradient id="f" cx="50%" cy="36%" r="80%"><stop offset="0" stop-color="#32704f"/><stop offset="1" stop-color="#0d2a1d"/></radialGradient>
  <mask id="m"><rect width="64" height="64" fill="#fff"/><circle cx="53" cy="10" r="7" fill="#000"/></mask></defs>
  <rect width="64" height="64" rx="15" fill="url(#f)"/>
  <circle cx="49" cy="14" r="7.5" fill="#e8c886" mask="url(#m)"/>
  <g transform="rotate(10 30 40)"><rect x="17" y="16" width="27" height="37" rx="4" fill="#fbf8f1"/>${pip(SPADE, 20.5, 23.5, 20, "#1c231d")}</g>
</svg>\n`;

/** Shortcut icons: one per game, the game's suit on felt. */
const shortcut = (path, color) => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs><radialGradient id="f" cx="50%" cy="36%" r="80%"><stop offset="0" stop-color="#32704f"/><stop offset="1" stop-color="#0d2a1d"/></radialGradient></defs>
  <rect width="96" height="96" fill="url(#f)"/><circle cx="48" cy="48" r="30" fill="#fbf8f1"/>${pip(path, 30, 30, 36, color)}
</svg>\n`;

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/favicon.svg", favicon);
writeFileSync("public/icons/icon.svg", icon());
writeFileSync("public/icons/icon-maskable.svg", icon({ shape: "full", safe: 0.8 }));
writeFileSync("public/icons/icon-apple.svg", icon({ shape: "full", safe: 0.86 }));
writeFileSync("public/icons/shortcut-poker.svg", shortcut(SPADE, "#1c231d"));
writeFileSync("public/icons/shortcut-tarneeb.svg", shortcut(DIAMOND, "#c0362f"));
writeFileSync("public/icons/shortcut-trix.svg", shortcut(HEART, "#c0362f"));
console.log("SVG icons written");
