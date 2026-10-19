import { useTranslation } from "react-i18next";

import { DocumentActions } from "@/pages/invoices/Documents";
import { Paper, PaperHeader, PaperNotes, PaperParties, PaperTable, PaperTotal, Signatures } from "@/components/documents/Paper";
import { formatCurrency, formatNumber } from "@/utils/format";

/** The paper of the QT: the company, number, date, customer, the lines with the total, the notes and blank spaces for the names and the signatures. */
function QtPaper({ qt, language }) {
  const { t } = useTranslation(["master", "common"]);
  return (
    <Paper name="qt">
      <PaperHeader title={t("master:qt.doc.title")} number={qt.qtNumber} date={qt.qtDate} />
      <PaperParties
        partyLabel={t("master:qt.doc.to")}
        name={qt.customerName}
        address={qt.customerAddress}
        factsLabel={t("common:paper.details")}
        facts={[
          [t("master:qt.qtDate"), qt.qtDate],
          [t("master:qt.po.number"), qt.customerPoNumber],
        ]}
      />
      <PaperTable
        rows={qt.lines}
        rowKey={(line) => line.productId}
        columns={[
          { key: "product", header: t("master:qt.lines.product"), cell: (line) => `${line.productCode} ${line.productName}` },
          { key: "quantity", header: t("master:qt.lines.quantity"), align: "right", cell: (line) => formatNumber(line.quantity, language) },
          { key: "unitPrice", header: t("master:qt.lines.unitPrice"), align: "right", cell: (line) => formatCurrency(line.unitPrice, language) },
          { key: "amount", header: t("master:qt.lines.amount"), align: "right", cell: (line) => formatCurrency(line.amount, language) },
        ]}
      />
      <PaperTotal text={`${t("master:qt.lines.total")}: ${formatCurrency(qt.total, language)}`} note={t("master:qt.doc.noTax")} />
      <PaperNotes title={t("common:paper.notes")}>{qt.notes}</PaperNotes>
      <Signatures labels={[t("master:qt.doc.preparedBy"), t("master:qt.doc.approvedBy"), t("master:qt.doc.customerSign")]} />
    </Paper>
  );
}

/**
 * The paper of the QT, kept out of sight: the page shows only the buttons Download PDF and Print (`QtDocumentActions`, at the top of the page),
 * and they use this paper. It is drawn off the screen at the width of a desktop so the PDF has the same layout on every screen. Only for a QT that is saved.
 */
export function QtDocument({ qt, language }) {
  return (
    <div aria-hidden="true" data-print-holder className="pointer-events-none fixed top-0 -left-[10000px] w-[800px]">
      <QtPaper qt={qt} language={language} />
    </div>
  );
}

/** Download PDF and Print of the QT paper (any status). */
export function QtDocumentActions({ qt }) {
  return <DocumentActions name="qt" number={qt.qtNumber} />;
}
