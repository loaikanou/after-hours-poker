/**
 * Renders the 1200×630 social share card (public/og-image.jpg) from HTML with
 * the real brand fonts, using a local Chrome (and macOS `sips` for the JPEG).
 * Part of `npm run icons`.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const icon = `data:image/svg+xml;base64,${readFileSync(resolve("public/icons/icon.svg")).toString("base64")}`;

const card = (rank, suit, red, x, y, r) => `
  <div class="card ${red ? "red" : ""}" style="left:${x}px;top:${y}px;transform:rotate(${r}deg)">
    <span class="corner">${rank}<i>${suit}</i></span><span class="pip">${suit}</span><span class="corner bottom">${rank}<i>${suit}</i></span>
  </div>`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=El+Messiri:wght@600&family=Inter:wght@500;600&family=Playfair+Display:ital,wght@0,500;1,500&display=block" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;overflow:hidden;font-family:Inter,sans-serif;color:#efe9dc;
    background:radial-gradient(ellipse at 72% 45%,#2f6a4b 0,#18452f 48%,#0b1f16 100%)}
  .frame{position:absolute;inset:22px;border:2px solid rgba(232,200,134,.45);border-radius:28px}
  .copy{position:absolute;left:84px;top:70px;width:600px}
  .brand{display:flex;align-items:center;gap:16px;font:600 20px Inter;letter-spacing:.24em;color:#e8c886}
  .brand img{width:64px;height:64px;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
  h1{margin-top:34px;font:500 82px/1.02 "Playfair Display",serif;letter-spacing:-.02em}
  h1 em{color:#e8c886}
  p{margin-top:28px;font:500 25px/1.45 Inter;color:#d3dccd}
  .ar{margin-top:16px;font:600 27px "El Messiri",sans-serif;color:#e8c886;direction:rtl;text-align:left}
  .pills{position:absolute;left:84px;bottom:58px;display:flex;gap:12px}
  .pills span{padding:10px 20px;border:1.5px solid rgba(232,200,134,.5);border-radius:999px;font:600 19px Inter;color:#efe9dc;background:rgba(5,14,9,.35)}
  .card{position:absolute;width:190px;height:266px;border-radius:18px;background:linear-gradient(160deg,#fff,#efe7d6);
    color:#1c231d;box-shadow:0 0 0 2px #e3dccb inset,0 24px 40px rgba(0,0,0,.45);font-family:Georgia,serif}
  .card.red{color:#c0362f}
  .corner{position:absolute;left:16px;top:12px;display:grid;justify-items:center;font:700 38px/0.95 Georgia}
  .corner i{font-style:normal;font-size:30px}
  .corner.bottom{left:auto;top:auto;right:16px;bottom:12px;transform:rotate(180deg)}
  .pip{position:absolute;inset:0;display:grid;place-items:center;font-size:104px}
  .chip{position:absolute;border-radius:50%;box-shadow:0 14px 22px rgba(0,0,0,.45)}
  .moon{position:absolute;right:120px;top:70px;width:70px;height:70px;border-radius:50%;box-shadow:-18px 10px 0 0 #e8c886;transform:rotate(-20deg)}
</style></head><body>
  <div class="frame"></div>
  <div class="moon"></div>
  <div class="copy">
    <div class="brand"><img src="${icon}">AFTER HOURS</div>
    <h1>Good cards.<br><em>Better company.</em></h1>
    <p>Private Poker, Tarneeb &amp; Trix tables for your friends — live, free, no sign-up.</p>
    <div class="ar">بوكر · طرنيب · تريكس مع أصدقائك</div>
  </div>
  <div class="pills"><span>♠ Texas Hold’em</span><span>♦ Tarneeb</span><span>♥ Trix</span></div>
  ${card("Q", "♦", true, 760, 210, -16)}
  ${card("A", "♠", false, 850, 175, -2)}
  ${card("K", "♥", true, 945, 205, 13)}
  <div class="chip" style="left:740px;top:470px;width:88px;height:88px;background:radial-gradient(circle,#9b4a3e 0 36%,transparent 38%),repeating-conic-gradient(#9b4a3e 0 30deg,#f1dcb6 30deg 60deg)"></div>
  <div class="chip" style="left:1060px;top:150px;width:64px;height:64px;background:radial-gradient(circle,#bd995e 0 36%,transparent 38%),repeating-conic-gradient(#bd995e 0 30deg,#fff3da 30deg 60deg)"></div>
</body></html>`;

const work = mkdtempSync(join(tmpdir(), "og-"));
const page = join(work, "og.html");
writeFileSync(page, html);
const shot = join(work, "og.png");
execFileSync(chrome, [
  "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
  "--window-size=1200,630", "--virtual-time-budget=8000", `--screenshot=${shot}`, `file://${page}`,
], { stdio: "ignore" });
// Share scrapers (WhatsApp in particular) skip images much over ~300 KB, so ship a JPEG.
execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", shot, "--out", resolve("public/og-image.jpg")], { stdio: "ignore" });
console.log("public/og-image.jpg (1200×630)");
