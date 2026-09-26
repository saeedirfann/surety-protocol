import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = "http://localhost:3000";
const browser = await chromium.launch({ channel: process.platform === "win32" ? "chrome" : undefined, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
page.setDefaultNavigationTimeout(120000);
const errors = [];
page.on("pageerror", error => errors.push(error.message));
async function state() { const r = await fetch(`${base}/api/protocol`); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function until(predicate, timeout = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { try { const data = await state(); if (predicate(data)) return data; } catch {} await new Promise(r => setTimeout(r, 1000)); }
  throw new Error("Timed out waiting for indexed state");
}
async function action(input, succeeds = true) {
  const r = await fetch(`${base}/api/demo`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify(input) });
  const data = await r.json(); assert.equal(r.ok, succeeds, JSON.stringify(data)); return data;
}
async function newClaim(amount, evidence) {
  const receipt = await action({ action: "claim", agentId: 1, amount, evidence });
  assert.match(receipt.assertionId, /^0x[0-9a-f]{64}$/i);
  return { id: receipt.assertionId };
}
try {
  await until(d => d.agents.items.length >= 3);
  await page.goto(base);
  await expect(page.getByRole("link", { name: "Atlas", exact: false }).first()).toBeVisible({ timeout: 120000 });
  await page.screenshot({ path: "RepoAssets/dashboard.png", fullPage: true });
  await page.getByLabel("Search agents").fill("Sentinel");
  await expect(page.getByRole("link", { name: "Atlas", exact: false })).toHaveCount(0);
  await page.getByLabel("Search agents").fill("");
  await page.getByRole("button", { name: "Register agent", exact: true }).click();
  await page.getByLabel("Agent name").fill("Meridian");
  await page.getByLabel("Description").fill("Browser-tested bonded operator.");
  await page.getByRole("button", { name: "Confirm demo transaction" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 30000 });
  await until(d => d.agents.items.some(a => JSON.parse(a.metadata).name === "Meridian"));
  await page.goto(`${base}/agents/1`);
  await expect(page.getByRole("heading", { name: "Operating policy" })).toBeVisible();
  await page.screenshot({ path: "RepoAssets/agent-detail.png", fullPage: true });
  const d = await state();
  assert.match((await action({ action: "screen", agentId: 1, amount: 20, target: d.deployment.token })).outcome, /passed/);
  assert.match((await action({ action: "screen", agentId: 1, amount: 100, target: d.deployment.token })).outcome, /Blocked/);
  await action({ action: "claim", agentId: 1, amount: 99999, evidence: "Over coverage" }, false);
  const beforePaid = new Set((await state()).claims.items.map(c => c.id));
  await action({ action: "claim", agentId: 1, amount: 150, evidence: "Unauthorized expenditure: evidence retained in local demo." });
  await action({ action: "withdraw", agentId: 1, amount: 1 }, false);
  const paidState = await until(data => data.claims.items.some(c => !beforePaid.has(c.id)));
  const paid = paidState.claims.items.find(c => !beforePaid.has(c.id));
  const initialPaid = BigInt(d.agents.items.find(a => a.id === "1").totalPaid);
  await until(data => data.claims.items.some(c => c.id === paid.id && c.status === "Paid") && BigInt(data.agents.items.find(a => a.id === "1").totalPaid) > initialPaid);
  const bondBefore = (await state()).agents.items.find(a => a.id === "1").bond;
  const rejected = await newClaim(100, "Frivolous claim: no verifiable policy breach.");
  await action({ action: "dispute", claimId: rejected.id });
  await until(data => data.claims.items.some(c => c.id === rejected.id && c.status === "Disputed"));
  await page.goto(`${base}/claims/${rejected.id}`);
  await expect(page.getByRole("button", { name: "Reject frivolous claim" })).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Reject frivolous claim" }).click();
  await expect(page.getByText("Agent collateral protected; claimant bond forfeited by UMA.")).toBeVisible({ timeout: 30000 });
  const settled = await until(data => data.claims.items.some(c => c.id === rejected.id && c.status === "Rejected"));
  assert.equal(settled.agents.items.find(a => a.id === "1").bond, bondBefore);
  await page.screenshot({ path: "RepoAssets/rejected-claim.png", fullPage: true });
  await page.getByRole("button", { name: /^Claims/ }).first().click();
  await expect(page.getByRole("heading", { name: "All claims" })).toBeVisible();
  await page.goto(`${base}/claims/${paid.id}`);
  await expect(page.getByText("Damages paid; claimant bond returned by UMA.")).toBeVisible();
  await page.screenshot({ path: "RepoAssets/paid-claim.png", fullPage: true });
  await page.goto(base);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Mobile page must not overflow");
  await page.screenshot({ path: "RepoAssets/mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  writeFileSync("shared/demo-snapshot.json", JSON.stringify({ ...await state(), capturedAt: new Date().toISOString() }, null, 2) + "\n");
  console.log("PASS: browser registration, search, policy pass/block, over-coverage rejection, locked withdrawal, automatic payout, frivolous rejection, navigation, mobile layout, no browser errors.");
} finally { await browser.close(); }
