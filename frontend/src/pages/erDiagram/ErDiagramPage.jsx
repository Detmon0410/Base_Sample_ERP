import { Download } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { todayIso } from "@/utils/dates";

import { CROSS_TABLE_RULES, foreignKeyOf, UNIQUE_DETAILS } from "./dbRelations";
import { buildDiagram } from "./erLayout";
import { ENTITIES, NOTE_KEYS, RELATIONSHIPS } from "./erModel";
import { inLanguage } from "./mdJa";
import { CARDINALITY, downloadErDiagramPdf } from "./erPdf";

const ANCHOR = { start: "start", middle: "middle", end: "end" };

/** One shape of erLayout.js as SVG. */
function Shape({ shape }) {
  if (shape.kind === "rect") {
    return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} fill={shape.fill ?? "none"} stroke={shape.stroke ?? "none"} strokeWidth={shape.width} />;
  }
  if (shape.kind === "line") {
    return <polyline points={shape.points.map((point) => point.join(",")).join(" ")} fill="none" stroke={shape.stroke} strokeWidth={shape.width} strokeLinejoin="round" />;
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

/** A cell of DB Relations.md: the parts between `backticks` are code. One span, so a stacked cell (phone) keeps it as one text. */
function Md({ text }) {
  return (
    <span>
      {text.split("`").map((part, index) =>
        index % 2 ? (
          <code key={index} className="bg-muted px-1 font-mono text-[0.9em]">
            {part}
          </code>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </span>
  );
}

/** A plain table of rows of text, with the headers `heads`. */
function TextTable({ heads, rows, mono = [] }) {
  return (
    <div className="border border-border bg-card">
      <Table data-stack>
        <TableHeader>
          <TableRow>
            {heads.map((head, index) => (
              <TableHead key={head} className={index === 0 ? "px-4" : undefined}>
                {head}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.join("|")}>
              {row.map((cell, index) => (
                <TableCell key={index} data-label={heads[index]} className={[index === 0 ? "px-4" : "", mono.includes(index) ? "font-mono text-sm" : "", "whitespace-normal"].join(" ")}>
                  <Md text={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * The ER diagram of the system (Admin), on one page with the relations of the database:
 *   - the drawing and its notes, as written in ProjectdocInfo/ER Diagram.md (erModel.js);
 *   - what the drawing does not show, as written in ProjectdocInfo/DB Relations.md (dbRelations.js): the delete rule of each
 *     relationship, the unique keys with a detail, the rules across tables.
 * "Download PDF" saves the same content as a PDF (A3 landscape) in the language of the page: page 1 the drawing, page 2 the rest.
 */
export function ErDiagramPage() {
  const { t, i18n } = useTranslation("erDiagram");
  const [busy, setBusy] = useState(false);
  const language = i18n.language;
  // the words of the .md files in the language of the page (mdJa.js); the names of the tables and columns stay as they are
  const tr = (text) => inLanguage(text, language);
  const diagram = useMemo(() => buildDiagram(language), [language]);
  const counts = { tables: ENTITIES.length, relationships: RELATIONSHIPS.length };

  const download = async () => {
    setBusy(true);
    try {
      // the PDF is in the language of the page, with the same words as the page
      await downloadErDiagramPdf({
        language,
        diagram,
        fileName: `er-diagram-${todayIso()}.pdf`,
        texts: {
          title: t("pdfTitle"),
          subtitle: t("pdfSubtitle", { ...counts, date: todayIso() }),
          relationshipsTitle: t("relationships"),
          columns: [t("colParent"), t("colChild"), t("colKey"), t("colCardinality"), t("colMeaning"), t("colDeleteRule")],
          notesTitle: t("notesTitle"),
          notes: NOTE_KEYS.map((key) => t(`notes.${key}`)),
          uniqueDetails: t("uniqueDetails"),
          rulesTitle: t("rulesTitle"),
          rulesColumns: [t("colEvent"), t("colTablesWritten"), t("colRule")],
        },
        relationshipRows: RELATIONSHIPS.map((relationship) => [
          relationship.parent,
          relationship.child,
          relationship.fk,
          `${CARDINALITY[relationship.parentEnd]} : ${CARDINALITY[relationship.childEnd]}`,
          tr(relationship.label),
          tr(foreignKeyOf(relationship)[4]),
        ]),
        uniqueDetails: UNIQUE_DETAILS.map(tr),
        ruleRows: CROSS_TABLE_RULES.map(([event, tables, rule]) => [tr(event), tables, tr(rule)]),
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
        actions={
          <Button type="button" disabled={busy} onClick={download}>
            <Download aria-hidden="true" />
            {busy ? t("makingPdf") : t("downloadPdf")}
          </Button>
        }
      />

      <div className="overflow-x-auto border border-border bg-white">
        <svg
          viewBox={`0 0 ${diagram.width} ${diagram.height}`}
          role="img"
          aria-label={t("diagramLabel", counts)}
          className="block w-full min-w-[1100px]"
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
        {NOTE_KEYS.map((key) => (
          <li key={key}>{t(`notes.${key}`)}</li>
        ))}
      </ul>

      <h2 className="mt-6 mb-2 text-lg font-bold">{t("relationships")}</h2>
      <TextTable
        heads={[t("colParent"), t("colChild"), t("colKey"), t("colCardinality"), t("colMeaning"), t("colDeleteRule")]}
        mono={[0, 1, 2]}
        rows={RELATIONSHIPS.map((relationship) => [
          relationship.parent,
          relationship.child,
          relationship.fk,
          `${t(`ends.${relationship.parentEnd}`)} : ${t(`ends.${relationship.childEnd}`)}`,
          tr(relationship.label),
          tr(foreignKeyOf(relationship)[4]),
        ])}
      />

      <p className="mt-3 text-sm">
        {t("uniqueDetails")}{" "}
        {UNIQUE_DETAILS.map((detail, index) => (
          <Fragment key={detail}>
            {index ? "; " : ""}
            <Md text={tr(detail)} />
          </Fragment>
        ))}
      </p>

      <h2 className="mt-6 mb-2 text-lg font-bold">{t("rulesTitle")}</h2>
      <TextTable heads={[t("colEvent"), t("colTablesWritten"), t("colRule")]} rows={CROSS_TABLE_RULES.map(([event, tables, rule]) => [tr(event), tables, tr(rule)])} />

    </>
  );
}
