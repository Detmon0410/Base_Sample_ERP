import { Banknote, Boxes, ChartColumn, CircleCheck, Factory, FilePlus2, ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { BarList, GroupedBars } from "@/components/common/Charts";
import { Section } from "@/components/common/FormFields";
import { StockStatus } from "@/components/common/StockStatus";
import { PageHeader } from "@/components/common/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLoad } from "@/hooks/useLoad";
import { getDashboard } from "@/services/dashboard.service";
import { formatCompact, formatCurrency, formatNumber } from "@/utils/format";

function Tile({ to, label, value, icon: Icon }) {
  return (
    <Link to={to} className="flex flex-col gap-1 bg-primary p-5 text-primary-foreground hover:bg-[#6c6b9c]">
      <span className="flex items-center gap-2 text-sm">
        {Icon ? <Icon aria-hidden="true" className="size-5 shrink-0" /> : null}
        {label}
      </span>
      <span className="text-3xl font-bold">{value}</span>
    </Link>
  );
}

/** A thin bar with the share that is done (the percent is also written next to it). */
function Progress({ percent }) {
  return (
    <span className="inline-block h-3 w-24 bg-muted align-middle" aria-hidden="true">
      <span className="block h-full bg-primary" style={{ width: `${percent}%` }} />
    </span>
  );
}

/**
 * The first page (docs/specs/s3-dashboard-crud-pdf.md, section 4): number tiles, two charts and three short lists, all from one call.
 * An Admin sees everything; a Worker sees the orders and the materials only. A tile and a row link to the page that explains the number.
 */
export function DashboardPage() {
  const { t, i18n } = useTranslation(["dashboard", "nav", "common", "master"]);
  const { data, error, loading } = useLoad(getDashboard, []);
  const language = i18n.language;
  const number = (value) => formatNumber(value, language);
  const yen = (value) => formatCurrency(value, language);

  return (
    <>
      <PageHeader title={t("nav:dashboard")} />
      {error ? (
        <p role="alert" className="text-destructive">
          {t("dashboard:failed")}
        </p>
      ) : loading ? (
        <p role="status">{t("common:loading")}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="dash-tiles" className="flex flex-col gap-4">
            <h2 id="dash-tiles" className="sr-only">
              {t("dashboard:numbers")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Tile to="/sale/orders" icon={FilePlus2} label={t("dashboard:new")} value={number(data.orders.New)} />
              <Tile to="/sale/orders" icon={Factory} label={t("dashboard:inProgress")} value={number(data.orders.InProgress)} />
              <Tile to="/sale/orders" icon={CircleCheck} label={t("dashboard:completed")} value={number(data.orders.Completed)} />
            </div>
            {data.invoicing ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Tile to="/accounting/invoices" icon={ReceiptText} label={t("dashboard:unpaidCount")} value={number(data.invoicing.unpaid.count)} />
                <Tile to="/accounting/invoices" icon={Banknote} label={t("dashboard:unpaidTotal")} value={yen(data.invoicing.unpaid.total)} />
                <Tile to="/accounting/invoices" icon={CircleCheck} label={t("dashboard:paidThisMonth")} value={yen(data.invoicing.paidThisMonth.total)} />
              </div>
            ) : null}
          </section>

          {data.invoicing ? (
          <div className="grid gap-6 lg:grid-cols-2"> {/* the charts are for an Admin; a Worker has no charts */}
            <Section icon={ChartColumn} title={t("dashboard:ordersChart")}>
              <BarList
                label={t("dashboard:ordersChart")}
                rows={[
                  { label: t("dashboard:new"), value: data.orders.New },
                  { label: t("dashboard:inProgress"), value: data.orders.InProgress },
                  { label: t("dashboard:completed"), value: data.orders.Completed },
                ]}
                format={number}
              />
            </Section>
            {(
              <Section icon={Banknote} title={t("dashboard:moneyChart")}>
                <GroupedBars
                  label={t("dashboard:moneyChart")}
                  series={[{ label: t("dashboard:invoiced") }, { label: t("dashboard:paid") }]}
                  groups={data.invoicing.months.map((month) => ({ label: month.month.slice(5), values: [month.invoiced, month.paid] }))}
                  format={(value) => (value >= 10000 ? formatCompact(value, language) : yen(value))}
                />
              </Section>
            )}
          </div>
          ) : null}

          <Section icon={Factory} title={t("dashboard:inProgressTitle")}>
            {data.inProgress.length === 0 ? (
              <p className="text-muted-foreground">{t("dashboard:noneInProgress")}</p>
            ) : (
              <Table data-stack>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard:order")}</TableHead>
                    <TableHead>{t("dashboard:customer")}</TableHead>
                    <TableHead>{t("dashboard:progress")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.inProgress.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell data-label={t("dashboard:order")}>
                        <Link to={`/sale/orders/${order.id}`}>{order.orderNumber}</Link>
                      </TableCell>
                      <TableCell data-label={t("dashboard:customer")}>{order.customerName}</TableCell>
                      <TableCell data-label={t("dashboard:progress")}>
                        <Progress percent={order.percent} /> {order.percent}% ({t("dashboard:ofRequired", { done: number(order.done), required: number(order.required) })})
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>

          {data.invoicing ? (
            <Section icon={ReceiptText} title={t("dashboard:unpaidTitle")}>
              {data.invoicing.unpaidList.length === 0 ? (
                <p className="text-muted-foreground">{t("dashboard:noneUnpaid")}</p>
              ) : (
                <Table data-stack>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dashboard:invoice")}</TableHead>
                      <TableHead>{t("dashboard:customer")}</TableHead>
                      <TableHead>{t("dashboard:invoiceDate")}</TableHead>
                      <TableHead className="text-right">{t("dashboard:total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.invoicing.unpaidList.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell data-label={t("dashboard:invoice")}>
                          <Link to={`/accounting/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link>
                        </TableCell>
                        <TableCell data-label={t("dashboard:customer")}>{invoice.customerName}</TableCell>
                        <TableCell data-label={t("dashboard:invoiceDate")}>{invoice.invoiceDate}</TableCell>
                        <TableCell data-label={t("dashboard:total")} className="text-right">
                          {yen(invoice.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>
          ) : null}

          <Section icon={Boxes} title={t("dashboard:stockTitle")}>
            <p className="mb-3 text-sm text-muted-foreground">{t("dashboard:stockHint")}</p>
            {data.leastStock.length === 0 ? (
              <p className="text-muted-foreground">{t("dashboard:noMaterials")}</p>
            ) : (
              <Table data-stack>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard:code")}</TableHead>
                    <TableHead>{t("dashboard:name")}</TableHead>
                    <TableHead className="text-right">{t("dashboard:quantity")}</TableHead>
                    <TableHead>{t("dashboard:status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.leastStock.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell data-label={t("dashboard:code")}>
                        <Link to={`/stock/materials/${material.id}`}>{material.code}</Link>
                      </TableCell>
                      <TableCell data-label={t("dashboard:name")}>{material.name}</TableCell>
                      <TableCell data-label={t("dashboard:quantity")} className="text-right">
                        {number(material.total)}
                      </TableCell>
                      <TableCell data-label={t("dashboard:status")}>
                        <StockStatus status={material.stockStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>
        </div>
      )}
    </>
  );
}
