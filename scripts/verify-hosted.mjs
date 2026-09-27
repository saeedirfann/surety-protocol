import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const base = process.env.APP_URL ?? "http://localhost:3005";
const browser = await chromium.launch({ channel: process.platform === "win32" ? "chrome" : undefined, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
// Minimal EIP-1193 test provider verifies real connector handling; it never signs or sends transactions.
await context.addInitScript(() => {
  const account = "0x1111111111111111111111111111111111111111";
  let connected = false;
  window.ethereum = {
    isMetaMask: true, on() {}, removeListener() {},
    async request({ method }) {
      if (method === "eth_accounts") return connected ? [account] : [];
      if (method === "eth_requestAccounts") { connected = true; return [account]; }
      if (method === "eth_chainId") return "0xaa36a7";
      if (method === "wallet_requestPermissions" || method === "wallet_getPermissions") return [{ parentCapability: "eth_accounts" }];
      if (method === "eth_getBalance") return "0x0";
      if (method === "wallet_switchEthereumChain") return null;
      throw new Error("Test wallet does not sign transactions: " + method);
    },
  };
});
const page = await context.newPage(); page.setDefaultNavigationTimeout(120000);
const errors = []; page.on("pageerror", error => errors.push(error.message));
try {
  const started = Date.now();
  while (true) {
    try { if ((await context.request.get(base + "/api/protocol", { timeout: 3000 })).status() === 200) break; } catch {}
    if (Date.now() - started > 90000) throw new Error("Hosted frontend did not become ready");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const response = await context.request.get(base + "/api/protocol");
  assert.equal(response.status(), 200);
  const data = await response.json();
  assert.equal(response.headers()["x-content-type-options"], "nosniff");
  assert.equal(response.headers()["x-frame-options"], "DENY");
  assert.equal(data.mode, "snapshot", "This regression test runs without any chain/indexer configuration");
  assert.ok(data.agents.items.length >= 3);
  assert.equal((await context.request.get(base + "/api/brand")).status(), 200);
  const denied = await context.request.post(base + "/api/demo", { data: { action: "register", name: "Unsafe", amount: 100 } });
  assert.equal(denied.status(), 403, "Hosted mode must never enable server-side Anvil signing");
  const setupWrite = await context.request.post(base + "/setup", { data: { WORLD_API_KEY: "browser-test-secret" } });
  // Next.js can render a page for POST even without a mutation handler. Assert the security boundary, not its default method status.
  assert.equal((await setupWrite.text()).includes("browser-test-secret"), false, "Setup must not reflect browser-supplied secrets");
  const setupHtml = await (await context.request.get(base + "/setup")).text();
  assert.equal(setupHtml.includes("browser-test-secret"), false, "Setup must not persist browser-supplied secrets");
  assert.equal(setupHtml.includes("hosted-secret-canary"), false, "Server credentials must not appear in rendered HTML");
  await page.goto(base + "/setup");
  await expect(page.getByRole("heading", { level: 1, name: "Secure setup." })).toBeVisible();
  await expect(page.getByText("This host is not configured for public operation.", { exact: false })).toBeVisible();
  assert.equal(await page.locator("input, textarea, form").count(), 0, "Never collect secrets in the public browser");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Setup must not overflow mobile viewport");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await expect(page.getByText("Read-only recorded preview.", { exact: true })).toBeVisible({ timeout: 30000 });
  const connect = page.getByRole("button", { name: "Connect Wallet" });
  if (await connect.count()) {
    await connect.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const wallet = page.getByRole("button", { name: /MetaMask|Injected|Browser Wallet/i }).first();
    await expect(wallet).toBeVisible();
    await wallet.click();
    await expect(page.getByRole("button", { name: /0x11.*1111/i }).first()).toBeVisible({ timeout: 20000 });
  }
  await page.goto(base + "/agents/1");
  await expect(page.getByRole("heading", { name: "Operating policy" })).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "File a claim", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Read-only deployment preview" })).toBeVisible();
  await page.goto(base + "/claims/" + data.claims.items[0].id);
  await expect(page.getByRole("heading", { name: /Assertion/ })).toBeVisible({ timeout: 30000 });
  await page.goto(base + "/transactions/" + data.claims.items[0].txHash);
  await expect(page.getByRole("heading", { name: /Recorded transaction/ })).toBeVisible();
  await page.goto(base); await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log("PASS: hosted data, safe setup without secret inputs, security headers, wallet connector, local-write refusal, deep links, receipts, mobile and browser errors.");
} finally { await browser.close(); }
