import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// mermaid needs a real browser to measure text: here a chart is its code in an <svg>, so the test sees what would be drawn
vi.mock("./flowRender", () => ({ renderChart: vi.fn(async (code) => `<svg data-code="${encodeURIComponent(code)}"><text>${code.split("\n")[0]}</text></svg>`) }));
vi.mock("./mermaidDocPdf", () => ({ downloadMermaidDocPdf: vi.fn(async () => {}) }));

import i18n from "@/i18n";
import { ApisDiagramPage } from "@/pages/apisDiagram/ApisDiagramPage";
import { INTRO as APIS_INTRO, SECTIONS as APIS } from "@/pages/apisDiagram/apisDiagram";
import { ContextDiagramPage } from "@/pages/contextDiagram/ContextDiagramPage";
import { SECTIONS as CONTEXT } from "@/pages/contextDiagram/contextDiagram";
import { FlowChartPage } from "@/pages/flowChart/FlowChartPage";
import { SECTIONS as FLOW } from "@/pages/flowChart/flowChart";
import { UserFlowPage } from "@/pages/userFlow/UserFlowPage";
import { SECTIONS as USER_FLOW } from "@/pages/userFlow/userFlow";
import { HIDDEN } from "@/utils/censor";
import { plain } from "@/utils/textPdf";

import { renderChart } from "./flowRender";
import { downloadMermaidDocPdf } from "./mermaidDocPdf";

// The chart pages (Flow Chart, User Flow, APIs Diagram): the title of the .md, every section with its chart, table and paragraph in order, the
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
    const { unmount } = render(<FlowChartPage />);
    try {
      expect(screen.getByRole("heading", { level: 1, name: "フローチャート" })).toBeInTheDocument();
      const charts = await screen.findAllByRole("img");
      expect(codeOf(charts[0])).toContain("F[QTの確定]");
      expect(codeOf(charts[2])).toContain("[*] --> Draft: 保存");
      expect(codeOf(charts[7])).toContain("S3[(MaterialLot)]");
      expect(document.body.textContent).not.toMatch(DOCS);
    } finally {
      unmount(); // before the language changes back, so the page does not draw again after the test
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
  it("has the title of the .md, every section with its charts, list and tables", async () => {
    render(<UserFlowPage />);
    expect(screen.getByRole("heading", { level: 1, name: "User Flow" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(USER_FLOW.map((section) => section.title));
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toContain("Errors a user may see");
    const charts = await screen.findAllByRole("img");
    expect(charts).toHaveLength(8);
    expect(charts.map(codeOf)).toEqual(chartsOf(USER_FLOW).map((code) => code.replaceAll(" -> ", " → ")));
    expect(screen.getByText("The Admin can do everything the two Workers can.")).toBeInTheDocument();
    expect(within(screen.getByRole("list")).getAllByRole("listitem")[1]).toHaveTextContent("A menu that has only one visible entry is shown as that entry alone.");
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(4);
    const rows = within(tables[1]).getAllByRole("row");
    expect(rows).toHaveLength(1 + 16);
    expect(rows[0]).toHaveTextContent("AreaAdminSale WorkerFactory Worker");
    expect(rows[2]).toHaveTextContent("QT: create, print, upload PO, confirm, delete a Draftyesyesno access");
    expect(within(tables[3]).getAllByRole("row")[3]).toHaveTextContent("409 STOCK_SHORTstart production without enough materialpurchase or add stock, then start again");
    expect(document.body.textContent).not.toMatch(DOCS);
  });

  it("shows the words in Japanese on the Japanese page", async () => {
    await i18n.changeLanguage("ja");
    const { unmount } = render(<UserFlowPage />);
    try {
      expect(screen.getByRole("heading", { level: 1, name: "ユーザーフロー" })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 2 })[3]).toHaveTextContent("工場担当");
      const charts = await screen.findAllByRole("img");
      expect(codeOf(charts[2])).toContain("T[今日：その日の作業]");
      expect(codeOf(charts[2])).toContain("S1[ロットを Add・Deduct・Adjust<br/>理由を付けて]");
      const rows = within(screen.getAllByRole("table")[1]).getAllByRole("row");
      expect(rows[0]).toHaveTextContent("機能管理者営業担当工場担当");
      expect(rows[12]).toHaveTextContent("仕入先可不可閲覧のみ");
    } finally {
      unmount(); // before the language changes back, so the page does not draw again after the test
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
    expect(sections[1].blocks[1]).toEqual({ items: USER_FLOW[1].blocks[1].items });
    expect(sections[5].blocks[1]).toEqual({ text: "The Admin can do everything the two Workers can." });
    expect(sections[8].blocks[0].table.rows).toEqual(USER_FLOW[8].blocks[0].table.rows);
  });
});

// what the APIs Diagram page never shows: the database, the addresses, the paths of the API, the logins, the files of the server
const SECRET = /kanou_mini_erp|localhost|:5173|:3000|DATABASE_URL|@gmail\.com|\/orders\/:id|\/auth\/|\/api\b|routes\/|backend\/|pnpm|Bearer <token>/;

describe("the APIs Diagram page", () => {
  it("has the title, no intro (the .md has none), every section, the sub-heading and the tables of the .md, with the details hidden", async () => {
    const { container } = render(<ApisDiagramPage />);
    expect(screen.getByRole("heading", { level: 1, name: "APIs Diagram" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(APIS.map((section) => section.title));
    expect(screen.getByRole("heading", { level: 3, name: "Purchase flow" })).toBeInTheDocument();
    const charts = await screen.findAllByRole("img");
    expect(charts).toHaveLength(6);
    // the status: its words stay, the folder, the database, the command and the logins are dark bars
    expect(screen.getByText(/All endpoints above are implemented in/).closest("p")).toHaveTextContent(`All endpoints above are implemented in ${HIDDEN} and covered by the tests. The development database ${HIDDEN} still has to be created with ${HIDDEN} (users ${HIDDEN}, ${HIDDEN}, ${HIDDEN}).`);
    expect(container.querySelectorAll("[data-hidden]").length).toBeGreaterThan(20);
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(3);
    expect(within(tables[0]).getAllByRole("row")[6]).toHaveTextContent(`${HIDDEN} (before start)yesyes403`);
    expect(within(tables[1]).getAllByRole("row")[5]).toHaveTextContent("409DUPLICATE_VALUEUnique code, email, qtNumber used");
    // the error codes, the tables and the status values stay; nothing that would help to get in is in the page or in a chart
    expect(document.body.textContent).toContain("STOCK_SHORT");
    expect(document.body.textContent).not.toMatch(SECRET);
    for (const chart of charts) expect(codeOf(chart)).not.toMatch(SECRET);
    expect(codeOf(charts[0])).toContain(`DB[(MySQL<br/>${HIDDEN})]`);
    expect(codeOf(charts[2])).toContain(`Fac->>API: ${HIDDEN}\n`);
    expect(codeOf(charts[5])).toContain("QtReference ||--o| ProductionOrder : \"confirm creates\"");
    expect(document.body.textContent).not.toMatch(DOCS);
  });

  it("hides the same in Japanese", async () => {
    await i18n.changeLanguage("ja");
    const { unmount } = render(<ApisDiagramPage />);
    try {
      expect(screen.getByRole("heading", { level: 1, name: "API図" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "7. エラーコード" })).toBeInTheDocument();
      const charts = await screen.findAllByRole("img");
      expect(codeOf(charts[2])).toContain(`Sale->>API: ${HIDDEN} （Draft、明細）`);
      expect(codeOf(charts[4])).toContain(`state "指示書 Draft" as Order_Draft`);
      expect(document.body.textContent).not.toMatch(SECRET);
      for (const chart of charts) expect(codeOf(chart)).not.toMatch(SECRET);
    } finally {
      unmount(); // before the language changes back, so the page does not draw again after the test
      await i18n.changeLanguage("en");
    }
  });

  it("gives the PDF the sections (no intro); the PDF hides the same", async () => {
    const user = userEvent.setup();
    downloadMermaidDocPdf.mockClear();
    render(<ApisDiagramPage />);
    await screen.findAllByRole("img");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(downloadMermaidDocPdf).toHaveBeenCalledTimes(1));
    const [{ title, intro, sections, fileName }] = downloadMermaidDocPdf.mock.calls[0];
    expect(title).toBe("APIs Diagram");
    expect(fileName).toMatch(/^apis-diagram-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(intro).toEqual(APIS_INTRO);
    expect(sections[3].blocks[1]).toEqual({ heading: "Purchase flow" });
    expect(sections[6].blocks[0].table.align).toEqual(["right", "left", "left"]);
    // the texts are hidden where the PDF writes them (utils/textPdf.js: plain); the charts are already drawn hidden
    expect(plain(sections[8].blocks[0].text)).not.toMatch(SECRET);
    for (const block of sections.flatMap((section) => section.blocks).filter((item) => item.svg)) expect(decodeURIComponent(block.svg)).not.toMatch(SECRET);
  });
});

describe("the Context Diagram page", () => {
  it("has the title, the two levels, the tables and the last sentence of the .md; the address of the API is hidden", async () => {
    render(<ContextDiagramPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Context Diagram" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(CONTEXT.map((section) => section.title));
    const charts = await screen.findAllByRole("img");
    expect(charts).toHaveLength(2);
    expect(codeOf(charts[0])).toBe(chartsOf(CONTEXT)[0]);
    expect(codeOf(charts[1])).toContain(`API[REST API ${HIDDEN}<br/>auth, master,`);
    expect(codeOf(charts[1])).toContain("PDF[PDF print: QT form, PO]");
    const tables = screen.getAllByRole("table");
    expect(within(tables[0]).getAllByRole("row")).toHaveLength(1 + 5);
    expect(within(tables[0]).getAllByRole("row")[4]).toHaveTextContent("Customer (outside)customer PO, paymentQT form, invoice, receipt (handed over by users)");
    expect(within(tables[1]).getAllByRole("row")).toHaveLength(1 + 2);
    expect(screen.getByText("Sales orders, delivery, supplier invoices in Accounting, serial numbers and tax.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(DOCS);
  });

  it("shows the words in Japanese, the names kept", async () => {
    await i18n.changeLanguage("ja");
    const { unmount } = render(<ContextDiagramPage />);
    try {
      expect(screen.getByRole("heading", { level: 1, name: "コンテキスト図" })).toBeInTheDocument();
      const charts = await screen.findAllByRole("img");
      expect(codeOf(charts[0])).toContain('ERP[["Mini ERP 2.0"]]');
      expect(codeOf(charts[0])).toContain('Fac -. "仕入先に支払う" .-> Sup');
      expect(codeOf(charts[1])).toContain('subgraph Client["フロントエンド"]');
      expect(within(screen.getAllByRole("table")[0]).getAllByRole("row")[0]).toHaveTextContent("エンティティシステムに渡すものシステムから受け取るもの");
    } finally {
      unmount(); // before the language changes back, so the page does not draw again after the test
      await i18n.changeLanguage("en");
    }
  });
});
