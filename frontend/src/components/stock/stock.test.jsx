import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { AuthContext } from "@/lib/auth-context";
import { notEnoughStockText } from "@/utils/stockErrors";

import { DocumentLink } from "./DocumentLink";
import { SignedQty } from "./SignedQty";
import { StockStatusBadge } from "./StockStatusBadge";

describe("StockStatusBadge", () => {
  it("says the status in words, for a material and for a product", () => {
    const { rerender } = render(<StockStatusBadge status="shortage" />);
    expect(screen.getByText("Shortage")).toBeInTheDocument();
    rerender(<StockStatusBadge status="near_shortage" />);
    expect(screen.getByText("Near shortage")).toBeInTheDocument();
    rerender(<StockStatusBadge status="out_of_stock" />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });
});

describe("SignedQty", () => {
  it("shows the sign and the colour of an increase and a decrease", () => {
    const { container, rerender } = render(<SignedQty value={12} uom="pcs" language="en" />);
    expect(container).toHaveTextContent("+12pcs");
    expect(container.firstChild).toHaveClass("text-success");
    rerender(<SignedQty value={-1250.5} uom="kg" language="en" />);
    expect(container).toHaveTextContent("−1,250.5kg");
    expect(container.firstChild).toHaveClass("text-destructive");
    rerender(<SignedQty value={0} language="en" />);
    expect(container.firstChild).not.toHaveClass("text-success");
  });
});

describe("DocumentLink", () => {
  const show = (props, memberships) =>
    render(
      <AuthContext.Provider value={{ user: { memberships } }}>
        <MemoryRouter>
          <DocumentLink {...props} />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

  it("links to a document the user may open", () => {
    show({ docType: "WO", docId: 3, docNumber: "WO-2026-0003" }, [{ department: "Factory", role: "Worker" }]);
    expect(screen.getByRole("link", { name: "WO-2026-0003" })).toHaveAttribute("href", "/factory/work-orders/3");
  });

  it("is plain text for a document of another department, a receipt without a page and a movement without a document", () => {
    const factory = [{ department: "Factory", role: "Worker" }];
    const { unmount } = show({ docType: "DN", docId: 2, docNumber: "DN-2026-0002" }, factory);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("DN-2026-0002")).toBeInTheDocument();
    unmount();
    const second = show({ docType: "GR", docId: null, docNumber: "GR-2026-0001" }, factory);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    second.unmount();
    show({ docType: null, docId: null, docNumber: null }, factory);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("notEnoughStockText", () => {
  it("lists what is missing, and is null for any other error", () => {
    const error = { code: "NOT_ENOUGH_STOCK", details: [{ items: [{ code: "COMP", uom: "pcs", needed: 12, has: 8 }, { code: "DOOR", uom: "pcs", needed: 4, has: 1 }] }] };
    expect(notEnoughStockText(error)).toBe("Not enough stock. COMP: needs 12 pcs, has 8; DOOR: needs 4 pcs, has 1");
    expect(notEnoughStockText({ code: "NOT_ENOUGH_STOCK" })).toBe("Not enough stock.");
    expect(notEnoughStockText({ code: "FORBIDDEN" })).toBeNull();
  });
});
