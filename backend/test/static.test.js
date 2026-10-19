import fs from "node:fs";
import { once } from "node:events";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

// FRONTEND_DIR: the backend serves the built frontend and keeps /api as it is. The variable is read when the app is loaded, so it is set first.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kanou-site-"));
fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>the site</title>");
fs.writeFileSync(path.join(dir, "logo.png"), "png");
process.env.FRONTEND_DIR = dir;

await import("../test-support/env.js");
const { default: app } = await import("../src/app.js");

describe("the backend serves the built frontend", () => {
  let server;
  let base;
  before(async () => {
    server = app.listen(0);
    await once(server, "listening");
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("gives index.html for / and for a page of the app (a route of the browser)", async () => {
    for (const url of ["/", "/sale/quotations/12", "/accounting"]) {
      const res = await fetch(base + url);
      assert.equal(res.status, 200, url);
      assert.match(await res.text(), /the site/, url);
    }
  });

  it("gives a file as it is", async () => {
    const res = await fetch(`${base}/logo.png`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "png");
  });

  it("keeps /api as the API: the health answer, and a JSON refusal (not the page) for an API call without a token", async () => {
    const health = await fetch(`${base}/api/health`);
    assert.equal((await health.json()).data.status, "ok");
    const missing = await fetch(`${base}/api/nothing-here`);
    assert.equal(missing.status, 401); // the token is asked before the route is looked up
    assert.equal((await missing.json()).success, false);
  });
});
