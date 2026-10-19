import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// mermaid needs a real browser to measure text: here a chart is its code in an <svg>, so the test sees what would be drawn
vi.mock("./flowRender", () => ({ renderChart: vi.fn(async (code) => `<svg data-code="${encodeURIComponent(code)}"><text>${code.split("\n")[0]}</text></svg>`) }));
vi.mock("./flowChartPdf", () => ({ downloadFlowChartPdf: vi.fn(async () => {}) }));

import i18n from "@/i18n";

import { SECTIONS } from "./flowChart";
import { downloadFlowChartPdf } from "./flowChartPdf";
import { FlowChartPage } from "./FlowChartPage";
import { renderChart } from "./flowRender";

// The flow chart page: every chart of the .md drawn with its title and notes, the words in the language of the page, and the PDF
// with the same charts. The page never names the documents it comes from.

const DOCS = /\.md\b|ProjectdocInfo|docs\//i;
const codeOf = (chart) => decodeURIComponent(chart.querySelector("svg").getAttribute("data-code"));

describe("the flow chart page", () => {
  it("draws every chart of the .md with its title and notes", async () => {
    render(<FlowChartPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Flow chart" })).toBeInTheDocument();
    const charts = await screen.findAllByRole("img");
    expect(charts).toHaveLength(SECTIONS.length);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(SECTIONS.map((section) => section.title));
    // in English the chart is the code of the .md (an arrow " -> " in a box is shown "→")
    charts.forEach((chart, index) => expect(codeOf(chart)).toBe(SECTIONS[index].code.replaceAll(" -> ", " → ")));
    expect(codeOf(charts[0])).toContain("M[Admin: full payment → Paid + receipt]");
    expect(screen.getByText(/Lines can be edited only in/)).toHaveTextContent("Lines can be edited only in Draft. A Draft PO can be deleted.");
    expect(document.body.textContent).not.toMatch(DOCS);
  });

  it("draws the charts with Japanese words on the Japanese page, the states and names kept", async () => {
    await i18n.changeLanguage("ja");
    try {
      render(<FlowChartPage />);
      const charts = await screen.findAllByRole("img");
      expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent("メインフロー");
      const main = codeOf(charts[0]);
      expect(main).toContain("F[QTの確定]");
      expect(main).toContain("H -- いいえ --> P1[下の購買フローへ]");
      const po = codeOf(charts[2]);
      expect(po).toContain("Sent --> Received: ユーザー、在庫を1回だけ追加");
      expect(po).toContain("[*] --> Draft: 保存");
      expect(codeOf(charts[7])).toContain("S3[(MaterialLot)]");
      expect(screen.getByText(/明細を編集できるのは/)).toBeInTheDocument();
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

  it("downloads the PDF with the charts of the page, on the paper chosen", async () => {
    const user = userEvent.setup();
    downloadFlowChartPdf.mockClear();
    render(<FlowChartPage />);
    await screen.findAllByRole("img");
    await user.selectOptions(screen.getByLabelText("Paper size"), "a3");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(downloadFlowChartPdf).toHaveBeenCalledTimes(1));
    const [{ language, paper, sections, texts, fileName }] = downloadFlowChartPdf.mock.calls[0];
    expect(language).toBe("en");
    expect(paper).toBe("a3");
    expect(fileName).toMatch(/^flow-chart-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(texts).toEqual({ system: "Refrigerator Factory Mini ERP", title: "Flow chart", subtitle: "9 charts: the flows and the statuses", footer: expect.stringMatching(/^Made on /) });
    expect(sections).toHaveLength(SECTIONS.length);
    expect(sections[2].notes).toEqual(SECTIONS[2].notes);
    expect(within(document.body).getAllByRole("img")[0].innerHTML).toBe(sections[0].svg);
  });
});
