import { chromium } from "playwright";
import { DIR } from "./walk-lib.mjs";
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(`<body style="font-family:Arial;padding:40px"><h2>PURCHASE ORDER</h2><p>No. PO-2026-0008 &nbsp; Date 2026-10-21</p><p>Sakura Cold Storage Co., Ltd.</p><table border=1 cellpadding=6 style="border-collapse:collapse"><tr><th>Item</th><th>Qty</th></tr><tr><td>Compact freezer 50</td><td>2</td></tr></table><p>Sample customer PO file for the user guide.</p></body>`);
await p.pdf({ path: DIR + "customer-po.pdf", format: "A4" });
await b.close();
