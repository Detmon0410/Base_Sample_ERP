import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// mermaid needs a real browser to measure text: here a chart is its code in an <svg>, so the test sees what would be drawn
vi.mock("./flowRender", () => ({ renderChart: vi.fn(async (code) => `<svg data-code="${encodeURIComponent(code)}"><text>${code.split("\n")[0]}</text></svg>`) }));
vi.mock("./mermaidDocPdf", () => ({ downloadMermaidDocPdf: vi.fn(async () => {}) }));

import i18n from "@/i18n";
import { FlowChartPage } from "@/pages/flowChart/FlowChartPage";
import { SECTIONS as FLOW } from "@/pages/flowChart/flowChart";
import { UserFlowPage } from "@/pages/userFlow/UserFlowPage";
import { SECTIONS as USER_FLOW } from "@/pages/userFlow/userFlow";

import { renderChart } from "./flowRender";
import { downloadMermaidDocPdf } from "./mermaidDocPdf";

// The chart pages (Flow Chart, User Flow): the title of the .md, every section with its chart, table and paragraph in order, the
// words in the language of the page, and the PDF with the same. The pages never name the documents they come from.

const DOCS = /\.md\b|ProjectdocInfo|docs\//i;
const codeOf = (chart) => decodeURIComponent(chart.querySelector("svg").getAttribute("data-code"));
const chartsOf = (sections) => sections.flatMap((section) => section.blocks.filter((block) => block.chart).map((block) => block.chart));

describe("the Flow Chart page", () => {
  it("has the title of the .md and draws every chart with its title and notes", async () => {
    render(<FlowChartPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Flow Chart" })).toBeInTheDocument();
    const charts = await screen.findAllByRole("img");
    expect(charts).toHaveLength(9);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(FLOW.map((section) => section.title));
    // in English the chart is the code of the .md (an arrow " -> " in a box is shown "→")
    charts.forEach((chart, index) => expect(codeOf(chart)).toBe(chartsOf(FLOW)[index].replaceAll(" -> ", " → ")));
    expect(screen.getByText(/Lines can be edited only in/)).toHaveTextContent("Lines can be edited only in Draft. A Draft PO can be deleted.");
    expect(document.body.textContent).not.toMatch(DOCS);
  });

  it("draws the charts with Japanese words on the Japanese page, the states and names kept", async () => {
    await i18n.changeLanguage("ja");
    try {
      render(<FlowChartPage />);
      expect(screen.getByRole("heading", { level: 1, name: "フローチャート" })).toBeInTheDocument();
      const charts = await screen.findAllByRole("img");
      expect(codeOf(charts[0])).toContain("F[QTの確定]");
      expect(codeOf(charts[2])).toContain("[*] --> Draft: 保存");
      expect(codeOf(charts[7])).toContain("S3[(MaterialLot)]");
      expect(document.body.textContent).not.toMatch(DOCS);
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("shows a message when the charts cannot be drawn", async () => {
    renderChart.mockRejectedValueOnce(new Error("no"));
    render(<FlowChartPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("The charts could not be drawn");
  });
});

describe("the User Flow page", () => {
  it("has the title of the .md, the three roles, the table of who can do what and the chart of print and upload", async () => {
    render(<UserFlowPage />);
    expect(screen.getByRole("heading", { level: 1, name: "User Flow" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["Sale Worker", "Factory Worker", "Admin", "Who can do what", "Print and upload (any page with files)"]);
    const charts = await screen.findAllByRole("img");
    expect(charts.map(codeOf)).toEqual(chartsOf(USER_FLOW).map((code) => code.replaceAll(" -> ", " → ")));
    expect(screen.getByText("The Admin can do everything the two Workers can.")).toBeInTheDocument();
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(1 + 11);
    expect(rows[0]).toHaveTextContent("AreaAdminSale WorkerFactory Worker");
    expect(rows[1]).toHaveTextContent("QT: create, print, upload PO, confirmyesyesno access");
    expect(document.body.textContent).not.toMatch(DOCS);
  });

  it("shows the words in Japanese on the Japanese page", async () => {
    await i18n.changeLanguage("ja");
    try {
      render(<UserFlowPage />);
      expect(screen.getByRole("heading", { level: 1, name: "ユーザーフロー" })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 2 })[1]).toHaveTextContent("工場担当");
      const charts = await screen.findAllByRole("img");
      expect(codeOf(charts[1])).toContain("D[今日：その日の作業]");
      expect(codeOf(charts[1])).toContain("P4[Sent → Received]");
      const rows = within(screen.getByRole("table")).getAllByRole("row");
      expect(rows[0]).toHaveTextContent("機能管理者営業担当工場担当");
      expect(rows[8]).toHaveTextContent("仕入先可不可閲覧のみ");
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("downloads the PDF with the content of the page, on the paper chosen", async () => {
    const user = userEvent.setup();
    downloadMermaidDocPdf.mockClear();
    render(<UserFlowPage />);
    await screen.findAllByRole("img");
    await user.selectOptions(screen.getByLabelText("Paper size"), "a3");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(downloadMermaidDocPdf).toHaveBeenCalledTimes(1));
    const [{ language, paper, title, sections, texts, fileName }] = downloadMermaidDocPdf.mock.calls[0];
    expect([language, paper, title]).toEqual(["en", "a3", "User Flow"]);
    expect(fileName).toMatch(/^user-flow-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(texts).toEqual({ system: "Refrigerator Factory Mini ERP", footer: expect.stringMatching(/^Made on /) });
    expect(sections.map((section) => section.title)).toEqual(USER_FLOW.map((section) => section.title));
    expect(sections[2].blocks[1]).toEqual({ text: "The Admin can do everything the two Workers can." });
    expect(sections[3].blocks[0].table.rows).toEqual(USER_FLOW[3].blocks[0].table.rows);
  });
});
