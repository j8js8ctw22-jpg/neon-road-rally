#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { createRequire } = require("module");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (error) {
    if (error?.code !== "MODULE_NOT_FOUND") throw error;
  }
  const candidates = [
    process.env.NRR_PLAYWRIGHT_NODE_MODULES,
    ...String(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean),
    process.env.HOME
      ? path.join(process.env.HOME, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules")
      : ""
  ].filter(Boolean);
  for (const nodeModulesPath of candidates) {
    const packagePath = path.join(nodeModulesPath, "playwright", "package.json");
    if (fs.existsSync(packagePath)) return createRequire(packagePath)("playwright");
  }
  throw new Error("Cannot find Playwright. Set NODE_PATH or NRR_PLAYWRIGHT_NODE_MODULES.");
}

function assert(condition, message, details = {}) {
  if (condition) return;
  const suffix = Object.keys(details).length ? ` ${JSON.stringify(details)}` : "";
  throw new Error(`${message}${suffix}`);
}

const { chromium } = loadPlaywright();
const repoRoot = path.resolve(__dirname, "..");
const bravePath = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const baseUrl = process.env.NRR_SMOKE_URL || "http://127.0.0.1:8098/";
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "nrr-record-book-"));
const exportPath = path.join(outputDir, "record-book.json");
const corruptPath = path.join(outputDir, "record-book-corrupt.json");

async function waitForApp(page) {
  await page.waitForFunction(() => Boolean(window.neonRoadRally), null, { timeout: 5000 });
}

async function openLeaderboards(page) {
  await page.evaluate(() => window.neonRoadRally.showLeaderboard());
  await page.locator("details.leaderboard-data-tools summary").click();
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(bravePath) ? bravePath : undefined
  });
  const consoleIssues = [];
  const watchConsole = (page, label) => {
    page.on("console", (message) => {
      if (["warning", "error"].includes(message.type())) consoleIssues.push(`${label} ${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => consoleIssues.push(`${label} pageerror: ${error.message}`));
  };

  try {
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const desktopPage = await desktopContext.newPage();
    watchConsole(desktopPage, "desktop");
    await desktopPage.goto(baseUrl, { waitUntil: "load" });
    await desktopPage.evaluate(() => localStorage.clear());
    await desktopPage.reload({ waitUntil: "load" });
    await waitForApp(desktopPage);
    await desktopPage.evaluate(() => {
      const app = window.neonRoadRally;
      const player = app.profiles.createPlayer("QA DRIVER");
      player.bestScore = 54321;
      app.profiles.save();
    });
    await openLeaderboards(desktopPage);
    const [download] = await Promise.all([
      desktopPage.waitForEvent("download", { timeout: 5000 }),
      desktopPage.locator('details.leaderboard-data-tools button[data-action="exportRecordBook"]').click()
    ]);
    await download.saveAs(exportPath);
    const exported = JSON.parse(fs.readFileSync(exportPath, "utf8"));
    assert(exported.schema === "neon-road-rally-record-book", "Desktop export has the wrong schema", exported);
    assert(exported.schemaVersion === 1, "Desktop export has the wrong schema version", exported);
    assert(/^fnv1a32:[0-9a-f]{8}$/.test(exported.checksum), "Desktop export checksum is missing", exported);
    assert(exported.payload.players.some((player) => player.name === "QA DRIVER"), "Desktop export omitted the player");
    await desktopContext.close();

    const ipadContext = await browser.newContext({
      viewport: { width: 1024, height: 768 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
      userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"
    });
    await ipadContext.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseUrl).origin });
    const ipadPage = await ipadContext.newPage();
    watchConsole(ipadPage, "ipad");
    await ipadPage.goto(baseUrl, { waitUntil: "load" });
    await ipadPage.evaluate(() => localStorage.clear());
    await ipadPage.reload({ waitUntil: "load" });
    await waitForApp(ipadPage);
    await openLeaderboards(ipadPage);

    await ipadPage.locator("#recordBookImportInput").setInputFiles(exportPath);
    await ipadPage.waitForFunction(() => document.querySelector(".record-book-status")?.textContent.includes("Record Book merged"));
    const imported = await ipadPage.evaluate(() => ({
      playerNames: window.neonRoadRally.profiles.data.players.map((player) => player.name),
      bestScores: window.neonRoadRally.profiles.data.players.map((player) => player.bestScore),
      status: document.querySelector(".record-book-status")?.textContent || "",
      save: localStorage.getItem("neonRoadRally.v1") || "",
      metadata: localStorage.getItem("neonRoadRally.recordBook.v1") || ""
    }));
    assert(imported.playerNames.includes("QA DRIVER"), "iPad import did not restore the exported player", imported);
    assert(imported.bestScores.includes(54321), "iPad import did not restore the personal best", imported);
    assert(imported.metadata, "iPad import did not initialize Record Book metadata", imported);

    await ipadPage.locator("#recordBookImportInput").setInputFiles(exportPath);
    await ipadPage.waitForFunction(() => document.querySelector(".record-book-status")?.textContent.includes("No changes"));
    const reimportStatus = await ipadPage.locator(".record-book-status").textContent();
    assert(/No changes/.test(reimportStatus || ""), "Re-import should report no changes", { reimportStatus });

    const corrupt = JSON.parse(JSON.stringify(exported));
    corrupt.payload.personalBests[0].bestScore += 1;
    fs.writeFileSync(corruptPath, `${JSON.stringify(corrupt, null, 2)}\n`);
    const saveBeforeCorruptImport = await ipadPage.evaluate(() => localStorage.getItem("neonRoadRally.v1"));
    await ipadPage.locator("#recordBookImportInput").setInputFiles(corruptPath);
    await ipadPage.waitForFunction(() => document.querySelector(".record-book-status")?.textContent.includes("checksum does not match"));
    const corruptResult = await ipadPage.evaluate(() => ({
      status: document.querySelector(".record-book-status")?.textContent || "",
      save: localStorage.getItem("neonRoadRally.v1")
    }));
    assert(/checksum does not match/i.test(corruptResult.status), "Corrupted import should explain the checksum failure", corruptResult);
    assert(corruptResult.save === saveBeforeCorruptImport, "Corrupted import changed the local save");

    const layout = await ipadPage.evaluate(() => {
      const panel = document.querySelector(".leaderboard-data-tools").getBoundingClientRect();
      const buttons = Array.from(document.querySelectorAll(".record-book-tool-actions button")).map((button) => {
        const rect = button.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
      return { viewportWidth: innerWidth, panel: { left: panel.left, right: panel.right }, buttons };
    });
    assert(layout.panel.left >= 0 && layout.panel.right <= layout.viewportWidth, "Record Book panel overflows iPad landscape", layout);
    assert(layout.buttons.every((button) => button.left >= layout.panel.left && button.right <= layout.panel.right), "Record Book buttons overflow their panel", layout);

    await ipadPage.locator('details.leaderboard-data-tools button[data-action="exportRecordBook"]').click();
    await ipadPage.waitForTimeout(500);
    const ipadExportState = await ipadPage.evaluate(() => ({
      status: document.querySelector(".record-book-status")?.textContent || "",
      hasShare: typeof navigator.share === "function",
      hasClipboardWrite: typeof navigator.clipboard?.writeText === "function",
      manualCopyVisible: Boolean(document.getElementById("recordBookCopyText"))
    }));
    assert(/copied to the clipboard/i.test(ipadExportState.status), "iPad clipboard fallback did not report success", ipadExportState);
    const clipboardExport = JSON.parse(await ipadPage.evaluate(() => navigator.clipboard.readText()));
    assert(clipboardExport.schema === "neon-road-rally-record-book", "iPad clipboard fallback did not copy Record Book JSON");
    await ipadContext.close();

    assert(consoleIssues.length === 0, "Browser console issues detected", { consoleIssues });
    console.log("RECORD_BOOK_BROWSER_SMOKE_OK");
    console.log(JSON.stringify({
      desktopExport: true,
      ipadImport: true,
      reimportNoChange: true,
      corruptRejectedWithoutMutation: true,
      ipadLayoutContained: true,
      ipadClipboardFallback: true
    }, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
