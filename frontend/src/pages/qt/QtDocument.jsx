import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/common/FormFields";
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

/** The QT form as a paper of the page, with Download PDF and Print (any status). Only for a QT that is saved. */
export function QtDocument({ qt, language }) {
  const { t } = useTranslation("master");
  return (
    <Section icon={Printer} title={t("qt.doc.section")}>
      <div className="flex flex-col gap-4">
        <DocumentActions name="qt" number={qt.qtNumber} />
        <QtPaper qt={qt} language={language} />
      </div>
    </Section>
  );
}
