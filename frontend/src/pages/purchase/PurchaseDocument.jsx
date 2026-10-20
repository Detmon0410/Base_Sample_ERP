import { useTranslation } from "react-i18next";

import { HiddenPaper, Paper, PaperHeader, PaperNotes, PaperParties, PaperTable, PaperTotal, Signatures } from "@/components/documents/Paper";
import { DocumentActions } from "@/pages/invoices/Documents";
import { formatCurrency, formatNumber } from "@/utils/format";

/** The paper of the PO: the company, number, supplier, required date, department, the lines with the total, the notes and blank spaces for the names. */
function PurchasePaper({ po, language }) {
  const { t } = useTranslation(["purchase", "common"]);
  return (
    <Paper name="po">
      <PaperHeader title={t("purchase:doc.title")} number={po.poNumber} />
      <PaperParties
        partyLabel={t("purchase:doc.to")}
        name={po.supplierName}
        address={po.supplierAddress}
        factsLabel={t("common:paper.details")}
        facts={[
          [t("purchase:doc.requiredDate"), po.requiredDate],
          [t("purchase:doc.department"), po.department],
        ]}
      />
      <PaperTable
        rows={po.lines}
        rowKey={(line) => line.id}
        columns={[
          { key: "material", header: t("purchase:lines.material"), cell: (line) => `${line.materialCode} ${line.materialName}` },
          { key: "quantity", header: t("purchase:lines.quantity"), align: "right", cell: (line) => `${formatNumber(line.quantity, language)} ${line.unit ?? ""}` },
          { key: "unitPrice", header: t("purchase:lines.unitPrice"), align: "right", cell: (line) => formatCurrency(line.unitPrice, language) },
          { key: "amount", header: t("purchase:lines.amount"), align: "right", cell: (line) => formatCurrency(line.amount, language) },
        ]}
      />
      <PaperTotal text={`${t("purchase:lines.total")}: ${formatCurrency(po.total, language)}`} />
      <PaperNotes title={t("common:paper.notes")}>{po.notes}</PaperNotes>
      <Signatures labels={[t("purchase:doc.preparedBy"), t("purchase:doc.approvedBy"), t("purchase:doc.receivedBy")]} />
    </Paper>
  );
}

/** Download PDF and Print of the PO (any status); the paper itself is kept out of sight and used by the buttons. */
export function PurchaseDocument({ po, language }) {
  return (
    <>
      <DocumentActions name="po" number={po.poNumber} />
      <HiddenPaper>
        <PurchasePaper po={po} language={language} />
      </HiddenPaper>
    </>
  );
}
