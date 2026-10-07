import { menuTable, permissionTable } from "./permissions";

const show = (table) => table.map(({ department, rows }) => [department, rows.map(({ key, cells }) => `${key}:${["Admin", "Manager", "Worker"].map((role) => (cells[role] ? "Y" : "-")).join("")}`).join(" ")]);

// Admin / Manager / Worker, Y = may. The table is computed from the real rules, so this test is the list of what the
// program does: when a rule changes, this test and the page "Departments and roles" change together.
describe("the permission table of the application (U3)", () => {
  it("says what each role can do in each department", () => {
    expect(show(permissionTable())).toEqual([
      ["Sale", "work:YYY sendQuotation:YYY acceptQuotation:YYY requestConfirm:--Y approveOrder:YY- sendToFactory:YYY cancelRunningOrder:YY- confirmDelivery:YYY closeOrder:YY- revertOrder:YY-"],
      ["Factory", "work:YYY schedule:YY- start:YYY startStep:YYY doneStep:YYY reopenStep:YY- finish:YY- cancelRunning:YY- transfer:YY- revertWorkOrder:YY-"],
      ["Stock", "view:YYY createAdjustment:YYY approveAdjustment:YY-"],
      ["Purchase", "work:YYY editOrder:YYY sendOrder:YY- receiveGoods:YYY postReceipt:YYY closeOrder:YY- cancelPostedReceipt:YY-"],
      ["Accounting", "work:YYY issueInvoice:YY- approveBill:YY- confirmReceipt:YYY confirmPayment:YY- cancelConfirmedMoney:YY- postEntry:YY- changeMaster:YY-"],
      ["Administration", "users:Y-- masterData:Y--"],
    ]);
  });

  it("never gives a Worker an approval and gives an Admin everything except asking for approval of one's own work", () => {
    for (const { rows } of permissionTable()) for (const row of rows.filter((item) => item.key !== "requestConfirm")) expect(row.cells.Admin).toBe(true);
    const approvals = ["approveOrder", "schedule", "approveAdjustment", "sendOrder", "issueInvoice", "approveBill", "confirmPayment", "postEntry", "changeMaster"];
    for (const { rows } of permissionTable()) for (const row of rows.filter((item) => approvals.includes(item.key))) expect(row.cells.Worker).toBe(false);
  });

  it("says which menus each kind of user sees", () => {
    const rows = menuTable().map((row) => `${row.key}:${Object.values(row.sees).map((v) => (v ? "Y" : "-")).join("")}`); // Sale Factory Purchase Accounting Admin
    expect(rows).toEqual(["sale:Y---Y", "factory:-Y--Y", "stock:-YY-Y", "purchase:--Y-Y", "accounting:---YY", "traceability:YYYYY", "masterData:----Y", "administration:----Y"]);
  });
});
