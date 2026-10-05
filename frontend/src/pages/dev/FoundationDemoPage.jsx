import { ArrowLeftIcon, ClockIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ApprovalActions } from "@/components/common/ApprovalActions";
import { DetailFields, DetailHeader, DetailLayout, DetailSection } from "@/components/common/DetailLayout";
import { LinkedDocuments } from "@/components/common/LinkedDocuments";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatusTimeline } from "@/components/common/StatusTimeline";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/utils/format";

// Developer-only page (route exists only in `pnpm dev`). It shows the shared detail layout, the
// status history, linked documents and the role-based Approve / Reject with fake records, so the
// parts can be reviewed before a real page uses them. Texts here are not translated on purpose.

const LINES = [
  { id: 1, code: "RF-2D-15Q", name: "Refrigerator 2-Door 15Q", qty: 40, price: 68000 },
  { id: 2, code: "RF-1D-9Q", name: "Refrigerator 1-Door 9Q", qty: 25, price: 41000 },
];
const TOTAL = LINES.reduce((sum, line) => sum + line.qty * line.price, 0);

const STATUS_BADGES = {
  draft: <StatusBadge tone="neutral">Draft</StatusBadge>,
  pending: <StatusBadge tone="warning" icon={ClockIcon}>Waiting for approval</StatusBadge>,
  approved: <StatusBadge tone="success">Approved</StatusBadge>,
  rejected: <StatusBadge tone="danger">Rejected</StatusBadge>,
};

const INITIAL_EVENTS = [
  { id: 2, label: "Sent for approval", actor: "Nina Sato", at: "2026-10-02T10:20:00", tone: "neutral" },
  { id: 1, label: "Created as draft", actor: "Nina Sato", at: "2026-10-02T09:05:00", tone: "neutral" },
];

export function FoundationDemoPage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [department, setDepartment] = useState("Sale");
  const [status, setStatus] = useState("pending");
  const [events, setEvents] = useState(INITIAL_EVENTS);

  const decide = (outcome, note) => {
    setStatus(outcome);
    setEvents((current) => [
      {
        id: current.length + 1,
        label: outcome === "approved" ? "Approved" : "Rejected",
        actor: user.name,
        at: new Date().toISOString(),
        tone: outcome === "approved" ? "success" : "danger",
        note,
      },
      ...current,
    ]);
  };

  const reset = () => {
    setStatus("pending");
    setEvents(INITIAL_EVENTS);
  };

  return (
    <>
      <PageHeader title="Foundation demo" />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-dashed bg-card p-4">
        <p className="font-semibold">Demo controls</p>
        <span className="text-muted-foreground">Approval belongs to:</span>
        {["Sale", "Factory", "Purchase", "Accounting"].map((name) => (
          <Button key={name} size="sm" variant={department === name ? "default" : "outline"} onClick={() => setDepartment(name)}>
            {name}
          </Button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={reset}>
          Reset document
        </Button>
      </div>

      <DetailLayout
        header={
          <DetailHeader
            backLink={
              <Link to="/" className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline">
                <ArrowLeftIcon className="size-4" aria-hidden="true" /> Back to Dashboard
              </Link>
            }
            title="QT-2026-0042"
            status={STATUS_BADGES[status]}
            meta={`Created ${formatDate("2026-10-02", i18n.language)} by Nina Sato`}
            actions={<ApprovalActions department={department} pending={status === "pending"} onApprove={async () => decide("approved")} onReject={async (reason) => decide("rejected", reason)} />}
          />
        }
        aside={
          <>
            <StatusTimeline events={events} />
            <LinkedDocuments
              items={[
                { id: "so", type: "Sale Order", number: "SO-2026-0017", to: "/sale/orders", status: <StatusBadge tone="neutral">Draft</StatusBadge> },
                { id: "po", type: "Customer PO", number: "PO-ACME-9931" },
              ]}
            />
          </>
        }
      >
        <DetailSection title="Customer">
          <DetailFields
            items={[
              { label: "Customer", value: "Acme Appliances Co., Ltd." },
              { label: "Contact", value: "Hiroshi Tanaka" },
              { label: "Payment terms", value: "Net 30" },
              { label: "Delivery date", value: formatDate("2026-11-15", i18n.language) },
              { label: "Remarks", value: "", wide: true },
            ]}
          />
        </DetailSection>

        <DetailSection title="Lines">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LINES.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.code}</TableCell>
                  <TableCell>{line.name}</TableCell>
                  <TableCell className="text-right">{line.qty}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.price, i18n.language)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.qty * line.price, i18n.language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-right text-lg font-bold">Total {formatCurrency(TOTAL, i18n.language)}</p>
        </DetailSection>
      </DetailLayout>
    </>
  );
}
