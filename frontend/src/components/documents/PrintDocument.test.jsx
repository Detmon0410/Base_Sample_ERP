import { render, screen, within } from "@testing-library/react";

import { PrintDocument } from "./PrintDocument";

const priced = {
  number: "QT-2026-0011",
  date: "2026-10-01",
  validUntil: "2026-10-31",
  customerCode: "C001",
  customerName: "ABC Appliance Store",
  salesPersonName: "Ken Suzuki",
  remarks: "Deliver in two parts",
  lines: [
    { productId: 1, productCode: "RF-2D", productName: "Refrigerator 2-Door 15Q", qty: 2, uom: "pcs", unitPrice: 68000, amount: 136000 },
    { productId: 2, productCode: "RF-1D", productName: "Refrigerator 1-Door 9Q", qty: 1, uom: "pcs", unitPrice: 41005, amount: 41005 },
  ],
  totals: { subtotal: 177005, tax: 17700, total: 194705, taxRate: 0.1 },
};

describe("PrintDocument", () => {
  it("prints a quotation with the lines, the totals and the remarks", () => {
    render(<PrintDocument kind="quotation" record={priced} />);
    expect(screen.getByRole("heading", { name: "Quotation" })).toBeInTheDocument();
    expect(screen.getByText("QT-2026-0011")).toBeInTheDocument();
    expect(screen.getByText("ABC Appliance Store")).toBeInTheDocument();
    expect(screen.getByText("Valid until")).toBeInTheDocument();
    expect(screen.getByText("¥177,005")).toBeInTheDocument();
    expect(screen.getByText("Consumption tax (10%)")).toBeInTheDocument();
    expect(screen.getByText("¥194,705")).toBeInTheDocument();
    expect(screen.getByText("Deliver in two parts")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(1 + 2 + 3); // header, 2 lines, subtotal / tax / total
  });

  it("numbers the lines", () => {
    render(<PrintDocument kind="quotation" record={priced} />);
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getAllByRole("cell")[0]).toHaveTextContent("1");
    expect(within(rows[2]).getAllByRole("cell")[0]).toHaveTextContent("2");
  });

  it("prints a sale order with the delivery date and the references", () => {
    render(<PrintDocument kind="order" record={{ ...priced, number: "SO-2026-0001", deliveryDate: "2026-10-20", customerPoNumber: "ABC-PO-0912", quotationNumber: "QT-2026-0001" }} />);
    expect(screen.getByRole("heading", { name: "Sale order" })).toBeInTheDocument();
    expect(screen.getByText("2026-10-20")).toBeInTheDocument();
    expect(screen.getByText("ABC-PO-0912")).toBeInTheDocument();
    expect(screen.getByText("QT-2026-0001")).toBeInTheDocument();
  });

  it("prints a delivery note without prices and with two signature lines", () => {
    const note = {
      number: "DN-2026-0001",
      date: "2026-09-28",
      customerCode: "C002",
      customerName: "Best Home Mart",
      saleOrderNumber: "SO-2026-0004",
      warehouseName: "Finished Goods Warehouse",
      lines: [{ productId: 1, productCode: "RF-2D", productName: "Refrigerator 2-Door 15Q", ordered: 6, deliverNow: 4 }],
    };
    render(<PrintDocument kind="delivery" record={note} />);
    expect(screen.getByRole("heading", { name: "Delivery note" })).toBeInTheDocument();
    expect(screen.queryByText(/Unit price/)).not.toBeInTheDocument();
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
    expect(screen.getByText("Delivered by (name, date)")).toBeInTheDocument();
    expect(screen.getByText("Received by (name, stamp, date)")).toBeInTheDocument();
  });
});
