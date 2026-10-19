import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Md, TextTable } from "@/components/common/MdText";
import { PageHeader } from "@/components/common/PageHeader";
import { PdfDownload } from "@/components/common/PdfDownload";
import { inLanguage } from "@/i18n/mdJa";
import { todayIso } from "@/utils/dates";

import { buildDiagram } from "./erLayout";
import { ENTITIES, NOTES, RELATIONSHIPS, TITLE, VERSION_ADDED } from "./erModel";
import { downloadErDiagramPdf } from "./erPdf";

const ANCHOR = { start: "start", middle: "middle", end: "end" };

/** One shape of erLayout.js as SVG. */
function Shape({ shape }) {
  if (shape.kind === "rect") {
    return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} fill={shape.fill ?? "none"} stroke={shape.stroke ?? "none"} strokeWidth={shape.width} />;
  }
  if (shape.kind === "line") {
    return (
      <polyline
        points={shape.points.map((point) => point.join(",")).join(" ")}
        fill="none"
        stroke={shape.stroke}
        strokeWidth={shape.width}
        strokeLinejoin="round"
        strokeDasharray={shape.dash?.join(" ")}
      />
    );
  }
  if (shape.kind === "circle") return <circle cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.width} />;
  return (
    <text
      x={shape.x}
      y={shape.y}
      fontSize={shape.size}
      fontWeight={shape.bold ? 700 : 400}
      fontStyle={shape.italic ? "italic" : "normal"}
      fill={shape.color}
      textAnchor={ANCHOR[shape.anchor ?? "start"]}
      dominantBaseline="central"
    >
      {shape.text}
    </text>
  );
}

/**
 * The ER Diagram page (Admin): ProjectdocInfo/ER Diagram.md, the same content in the same order: the title of the .md, the diagram
 * (every table with its columns, keys and notes; the relationships in crow's foot notation, a dashed line has no database key, a
 * bridge where two lines cross), the section "What Version 2.0 added" and the "Notes". The words follow the language of the page
 * (i18n/mdJa.js); the names of the tables and columns stay as they are. "Download PDF" saves the same, A3 (the default: the drawing
 * is large) or A4, landscape: the drawing on page 1, then the two sections. The model is in erModel.js (made from the .md); the
 * drawing comes from erLayout.js and is the same on the page and in the PDF.
 */
export function ErDiagramPage() {
  const { t, i18n } = useTranslation("erDiagram");
  const [busy, setBusy] = useState(false);
  const [paper, setPaper] = useState("a3");
  const language = i18n.language;
  // the words of the .md in the language of the page (i18n/mdJa.js); the names of the tables and columns stay as they are
  const tr = (text) => inLanguage(text, language);
  const diagram = useMemo(() => buildDiagram(language), [language]);
  const counts = { tables: ENTITIES.length, relationships: RELATIONSHIPS.length };
  const added = { title: tr(VERSION_ADDED.title), head: VERSION_ADDED.head.map(tr), rows: VERSION_ADDED.rows.map((row) => row.map(tr)) };

  const download = async () => {
    setBusy(true);
    try {
      await downloadErDiagramPdf({
        language,
        paper,
        diagram,
        fileName: `er-diagram-${todayIso()}.pdf`,
        texts: { system: t("common:pdf.system"), title: tr(TITLE), footer: t("common:pdf.madeOn", { date: todayIso() }), notesTitle: tr("Notes") },
        added,
        notes: NOTES.map(tr),
      });
    } catch {
      toast.error(t("pdfFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={tr(TITLE)}
        actions={<PdfDownload paper={paper} onPaperChange={setPaper} busy={busy} onDownload={download} label={t("downloadPdf")} busyLabel={t("makingPdf")} />}
      />

      <div className="overflow-x-auto border border-border bg-white">
        <svg
          viewBox={`0 0 ${diagram.width} ${diagram.height}`}
          role="img"
          aria-label={t("diagramLabel", counts)}
          className="block w-full min-w-[1300px]"
          style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
        >
          <rect width={diagram.width} height={diagram.height} fill="#ffffff" />
          {diagram.shapes.map((shape, index) => (
            <Shape key={index} shape={shape} />
          ))}
        </svg>
      </div>

      <h2 className="mt-6 mb-2 text-lg font-bold">{added.title}</h2>
      <TextTable heads={added.head} rows={added.rows} />

      <h2 className="mt-6 mb-2 text-lg font-bold">{tr("Notes")}</h2>
      <ul className="list-disc space-y-1 pl-6">
        {NOTES.map((note) => (
          <li key={note}>
            <Md text={tr(note)} />
          </li>
        ))}
      </ul>
    </>
  );
}
