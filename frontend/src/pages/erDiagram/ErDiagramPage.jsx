import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Md, TextTable } from "@/components/common/MdText";
import { PageHeader } from "@/components/common/PageHeader";
import { PdfDownload } from "@/components/common/PdfDownload";
import { inLanguage } from "@/i18n/mdJa";
import { todayIso } from "@/utils/dates";

import { buildDiagram } from "./erLayout";
import { ENTITIES, hasNoKey, NOTES, RELATIONSHIPS } from "./erModel";
import { CARDINALITY, downloadErDiagramPdf } from "./erPdf";

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

/** The column of the child a line stands for; a line with no database key stands for the pair owner_type + owner_id. */
const keyOf = (relationship) => (hasNoKey(relationship) ? "owner_type + owner_id" : relationship.fk);

/**
 * The ER diagram of the system (Admin), as written in ProjectdocInfo/ER Diagram.md: every table with its columns, keys and notes,
 * the relationships in crow's foot notation (a dashed line has no database key), the notes, and the relationships as a table.
 * "Download PDF" saves the same content as a PDF in the language of the page, on landscape A3 (the default: the drawing is large)
 * or A4: the drawing on page 1, then the notes and the relationships.
 * The model is in erModel.js; the drawing comes from erLayout.js and is the same on the page and in the PDF.
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
  const heads = [t("colParent"), t("colChild"), t("colKey"), t("colCardinality"), t("colMeaning")];

  const download = async () => {
    setBusy(true);
    try {
      await downloadErDiagramPdf({
        language,
        paper,
        diagram,
        fileName: `er-diagram-${todayIso()}.pdf`,
        texts: {
          system: t("common:pdf.system"),
          title: t("title"),
          subtitle: t("pdfSubtitle", counts),
          footer: t("common:pdf.madeOn", { date: todayIso() }),
          notesTitle: t("notesTitle"),
          relationshipsTitle: t("relationships"),
          columns: heads,
        },
        relationshipRows: RELATIONSHIPS.map((relationship) => [
          relationship.parent,
          relationship.child,
          keyOf(relationship),
          `${CARDINALITY[relationship.parentEnd]} : ${CARDINALITY[relationship.childEnd]}`,
          tr(relationship.label),
        ]),
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
        title={t("title")}
        description={t("description")}
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

      <h2 className="mt-6 mb-2 text-lg font-bold">{t("notesTitle")}</h2>
      <ul className="list-disc space-y-1 pl-6">
        {NOTES.map((note) => (
          <li key={note}>
            <Md text={tr(note)} />
          </li>
        ))}
      </ul>

      <h2 className="mt-6 mb-2 text-lg font-bold">{t("relationships")}</h2>
      <TextTable
        heads={heads}
        mono={[0, 1, 2]}
        rows={RELATIONSHIPS.map((relationship) => [
          relationship.parent,
          relationship.child,
          keyOf(relationship),
          `${t(`ends.${relationship.parentEnd}`)} : ${t(`ends.${relationship.childEnd}`)}`,
          tr(relationship.label),
        ])}
      />
    </>
  );
}
