import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, userDataDir: "/private/tmp/claude-501/-Users-imac/eefed7ce-2f74-4ece-94f2-946ee32ad92f/scratchpad/chrome-prof", args: ["--no-first-run", "--disable-gpu"], timeout: 180000, protocolTimeout: 600000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (const w of [1440, 375]) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem("mvs.locale", "fr"); } catch {} });
  await page.setViewport({ width: w, height: 800, deviceScaleFactor: 2 });
  const click = async (sel, re) => { await page.evaluate((s, src) => [...document.querySelectorAll(s)].find((e) => new RegExp(src).test(e.textContent || ""))?.click(), sel, re.source); await wait(600); };
  await page.goto("http://127.0.0.1:5174/admin.html#/channels", { waitUntil: "networkidle2", timeout: 180000 }); await wait(800);
  await click("button", /Gérer WhatsApp/); await click("dialog[open] button", /autre numéro/);
  let el = await page.$("dialog[open] .jk-steps"); await el.screenshot({ path: `../nb/step-${w}-1.png` });
  await click("dialog[open] button", /Afficher le QR code/); await wait(500);
  el = await page.$("dialog[open] .jk-steps"); await el.screenshot({ path: `../nb/step-${w}-2.png` });
  await page.goto("http://127.0.0.1:5174/admin.html#/triggers/new", { waitUntil: "networkidle2" }); await wait(800);
  await page.type("dialog[open] .jk-wizard-card input:not([type=radio])", "prix"); await click("dialog[open] button", /^Suivant$/); await click("dialog[open] button", /^Suivant$/);
  el = await page.$("dialog[open] .jk-steps"); await el.screenshot({ path: `../nb/step-${w}-wiz.png` });
  console.log(w, await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  await page.close();
}
await browser.close();
