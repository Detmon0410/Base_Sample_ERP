import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { materialsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { purchaseApi } from "@/services/purchase.service";
import { suppliersApi } from "@/services/suppliers.service";
import { setToken } from "@/utils/session";

import { AccountingPage } from "./AccountingPage";

// The money that goes out: the purchase orders that were received and are not paid yet are on the Accounting page, and the paid ones too.

describe("accounting: we pay the suppliers", () => {
  let unpaid;
  let paid;

  beforeAll(async () => {
    setToken(tokenOf(mockUsers[0]));
    const steel = await materialsApi.create({ code: "AS-STEEL", name: "Accounting steel", unit: "kg", minLevel: 1, lots: [{ lotNumber: "A1", quantity: 5 }] });
    const supplier = await suppliersApi.create({ code: "AS-SUP", name: "Accounting Supplier", active: true, items: [{ materialId: steel.id, unitPrice: 100 }] });
    const make = async (quantity) => {
      const po = await purchaseApi.create({ supplierId: supplier.id, requiredDate: "2026-11-01", department: "Factory", lines: [{ materialId: steel.id, quantity, unitPrice: 100 }] });
      await purchaseApi.setStatus(po.id, { status: "Sent" });
      return purchaseApi.setStatus(po.id, { status: "Received", lots: po.lines.map((line) => ({ lineId: line.id, lotNumber: `AS-${po.id}` })) });
    };
    unpaid = await make(10); // 1,000
    paid = await make(20); // 2,000
    await purchaseApi.pay(paid.id, { paymentDate: "2026-10-20", amount: 2000, method: "Cash", referenceNo: "", note: "" });
  });

  it("shows what we have to pay with its total, the PO to open, and the paid ones on the other tab", async () => {
    const user = userEvent.setup();
    render(
      <AuthContext.Provider value={{ user: toPublicUser(mockUsers[0]), status: "authenticated" }}>
        <MemoryRouter initialEntries={["/accounting"]}>
          <Routes>
            <Route path="/accounting/*" element={<AccountingPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await user.click(await screen.findByRole("button", { name: "We pay suppliers" }));
    expect(await screen.findByRole("tab", { name: /To pay/ })).toHaveAttribute("aria-selected", "true");
    const row = await screen.findByRole("row", { name: new RegExp(unpaid.poNumber) });
    expect(row).toHaveTextContent("Accounting Supplier");
    expect(row).toHaveTextContent("¥1,000");
    expect(screen.queryByRole("row", { name: new RegExp(paid.poNumber) })).not.toBeInTheDocument();
    expect(within(row).getByRole("link", { name: new RegExp(`^Pay: ${unpaid.poNumber}`) })).toHaveAttribute("href", `/purchase/orders/${unpaid.id}`);

    await user.click(screen.getByRole("tab", { name: /Paid out/ }));
    const done = await screen.findByRole("row", { name: new RegExp(paid.poNumber) });
    expect(done).toHaveTextContent("2026-10-20");
    expect(done).toHaveTextContent("¥2,000");
  });
});
