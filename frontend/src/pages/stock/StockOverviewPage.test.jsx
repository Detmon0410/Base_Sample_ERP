import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { materialsApi, stockApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { setToken } from "@/utils/session";

import { StockOverviewPage } from "./StockOverviewPage";

// The overview of the whole stock, driven like a person would: every material with its lots, the search, a click on a block.

const renderAs = (user) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter initialEntries={["/stock"]}>
        <Routes>
          <Route path="/stock" element={<StockOverviewPage />} />
          <Route path="/stock/materials/:id" element={<p>the page of a material</p>} />
          <Route path="/stock/materials" element={<p>the list of materials</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("the stock overview page", () => {
  it("shows every material with its total and, under it, every lot; the numbers on top count them", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[0]));
    const steel = await materialsApi.create({ code: "OV-STEEL", name: "Steel sheet", lots: [{ lotNumber: "S1", quantity: 100 }, { lotNumber: "S2", quantity: 20.5 }] });
    await materialsApi.create({ code: "OV-FOAM", name: "Foam", lots: [{ lotNumber: "F1", quantity: 7 }] });
    await materialsApi.create({ code: "OV-EMPTY", name: "No lot yet" });
    await stockApi.change(steel.id, { kind: "Deduct", lotNumber: "S1", quantity: 30, changeDate: "2026-10-04", note: "" });

    renderAs(mockUsers[0]);
    expect(await screen.findByRole("link", { name: /^Materials\s*3$/ })).toHaveAttribute("href", "/stock/materials");
    expect(screen.getByRole("link", { name: /^Lots\s*3$/ })).toBeInTheDocument();

    const steelBlock = (await screen.findByRole("link", { name: "OV-STEEL" })).closest("tbody");
    const rows = within(steelBlock).getAllByRole("row");
    expect(rows).toHaveLength(3); // the material and its two lots
    expect(rows[0]).toHaveTextContent("Steel sheet");
    expect(rows[0]).toHaveTextContent("Lots: 2");
    expect(rows[0]).toHaveTextContent("90.5"); // 100 - 30 + 20.5
    expect(rows[1]).toHaveTextContent("S1");
    expect(rows[1]).toHaveTextContent("70");
    expect(rows[2]).toHaveTextContent("S2");
    expect(rows[2]).toHaveTextContent("20.5");

    const empty = screen.getByRole("link", { name: "OV-EMPTY" }).closest("tbody");
    expect(within(empty).getAllByRole("row")).toHaveLength(1);
    expect(empty).toHaveTextContent("Lots: 0");

    // the search by code or by name
    await user.type(screen.getByLabelText("Search (material code or name)"), "foam");
    await waitFor(() => expect(screen.queryByRole("link", { name: "OV-STEEL" })).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "OV-FOAM" })).toBeInTheDocument();

    // a click on a lot row (not on the link) opens the material
    await user.click(screen.getByText("F1"));
    expect(await screen.findByText("the page of a material")).toBeInTheDocument();
  });

  it("shows the status of a material with a minimum level, counts the Low and the Out, and filters by the status", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[0]));
    await materialsApi.create({ code: "OS-NORMAL", name: "Plenty", minLevel: 5, lots: [{ lotNumber: "N", quantity: 50 }] });
    await materialsApi.create({ code: "OS-LOW", name: "Running down", minLevel: 20, lots: [{ lotNumber: "L", quantity: 8 }] });
    await materialsApi.create({ code: "OS-OUT", name: "Finished", minLevel: 3, lots: [{ lotNumber: "O", quantity: 0 }] });
    await materialsApi.create({ code: "OS-NONE", name: "No minimum", lots: [{ lotNumber: "X", quantity: 1 }] });

    renderAs(mockUsers[0]);
    const block = async (code) => (await screen.findByRole("link", { name: code })).closest("tbody");
    expect(within(await block("OS-NORMAL")).getAllByText("Normal").length).toBeGreaterThan(0);
    expect(await block("OS-LOW")).toHaveTextContent("Low");
    expect(await block("OS-OUT")).toHaveTextContent("Out");
    expect(await block("OS-NONE")).not.toHaveTextContent(/Normal|Low|Out/); // no minimum level, no status
    expect(await screen.findByRole("link", { name: /^Low\s*[1-9]/ })).toBeInTheDocument(); // the numbers on top

    await user.selectOptions(screen.getByLabelText("Status"), "Low");
    await waitFor(() => expect(screen.queryByRole("link", { name: "OS-NORMAL" })).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "OS-LOW" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "OS-OUT" })).not.toBeInTheDocument();
  });

  it("is open to a Worker, and says so when nothing matches", async () => {
    const user = userEvent.setup();
    renderAs(mockUsers[1]);
    await screen.findByRole("table");
    await user.type(screen.getByLabelText("Search (material code or name)"), "no such material");
    expect(await screen.findByText("No record matches.")).toBeInTheDocument();
  });
});
