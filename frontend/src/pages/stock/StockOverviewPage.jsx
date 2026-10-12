import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLoad } from "@/hooks/useLoad";
import { materialsApi, stockApi } from "@/services/master.service";
import { formatNumber } from "@/utils/format";

const PAGE_SIZE = 20;
// the colour of a block, written out in full so that Tailwind finds every class; the rows of a block must not stripe on their own
const BLOCKS = [
  { body: "bg-card", row: "cursor-pointer odd:bg-card even:bg-card hover:bg-accent" },
  { body: "bg-[#f3f3f9]", row: "cursor-pointer odd:bg-[#f3f3f9] even:bg-[#f3f3f9] hover:bg-accent" },
];
const total = (lots) => lots.reduce((sum, lot) => sum + lot.quantity, 0);

function Tile({ to, label, value }) {
  return (
    <Link to={to} className="flex flex-col gap-1 bg-primary p-5 text-primary-foreground hover:bg-[#6c6b9c]">
      <span className="text-sm">{label}</span>
      <span className="text-3xl font-bold">{value}</span>
    </Link>
  );
}

/**
 * The stock of the whole system on one page (docs/specs/s4-stock-group.md, section 3.1), read only, for an Admin and a Worker: how many
 * materials and lots there are, and one block per material with its total and, under it, every lot with its quantity. Search by code
 * or name. A click on a block opens the material, where an Admin changes the stock.
 */
export function StockOverviewPage() {
  const { t, i18n } = useTranslation(["master", "common"]);
  const navigate = useNavigate();
  const language = i18n.language;
  const number = (value) => formatNumber(value, language);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const overview = useLoad(stockApi.overview, []);
  const { data, error, loading } = useLoad(() => materialsApi.list({ q: q.trim() || undefined, page, pageSize: PAGE_SIZE }), [q, page]);
  const rows = data?.items ?? [];
  const count = data?.meta?.total ?? 0;

  return (
    <>
      <PageHeader title={t("master:stock.overviewTitle")} />

      {overview.data ? (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Tile to="/stock/materials" label={t("master:stock.materialsCount")} value={number(overview.data.materials)} />
          <Tile to="/stock/materials" label={t("master:stock.lotsCount")} value={number(overview.data.lots)} />
        </div>
      ) : null}

      <label className="mb-4 flex max-w-xl flex-col gap-1 text-sm font-semibold">
        {t("master:stock.searchMaterial")}
        <Input
          type="search"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
        />
      </label>

      {error ? (
        <p role="alert" className="text-destructive">
          {t("master:errors.LOAD_FAILED")}
        </p>
      ) : (
        <div className="border border-border bg-card" aria-busy={loading}>
          <Table data-stack>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">{t("master:stock.colMaterial")}</TableHead>
                <TableHead className="px-4">{t("master:stock.colLot")}</TableHead>
                <TableHead className="px-4 text-right">{t("master:stock.quantity")}</TableHead>
              </TableRow>
            </TableHeader>
            {rows.map((material, index) => {
              // a material and its lots are one block with one colour; the blocks alternate
              const block = BLOCKS[index % 2];
              const open = (event) => !event.target.closest("a") && navigate(`/stock/materials/${material.id}`);
              const row = block.row;
              return (
                <TableBody key={material.id} className={block.body}>
                  <TableRow className={row} onClick={open}>
                    <TableCell data-label={t("master:stock.colMaterial")} className="px-4 py-3 font-bold">
                      <Link to={`/stock/materials/${material.id}`}>{material.code}</Link> {material.name}
                    </TableCell>
                    <TableCell data-label={t("master:stock.colLot")} className="px-4 py-3">
                      {t("master:stock.lotsOf", { count: material.lots.length })}
                    </TableCell>
                    <TableCell data-label={t("master:stock.total")} className="px-4 py-3 text-right font-bold">
                      {number(total(material.lots))}
                    </TableCell>
                  </TableRow>
                  {material.lots.map((lot) => (
                    <TableRow key={lot.lotNumber} className={row} onClick={open}>
                      <TableCell className="px-4 py-1" />
                      <TableCell data-label={t("master:stock.colLot")} className="px-4 py-1 pl-8 text-sm text-muted-foreground">
                        {lot.lotNumber}
                      </TableCell>
                      <TableCell data-label={t("master:stock.quantity")} className="px-4 py-1 text-right text-sm">
                        {number(lot.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              );
            })}
          </Table>
          {!loading && rows.length === 0 ? <p className="p-4 text-muted-foreground">{q ? t("master:list.noMatch") : t("master:stock.noMaterialsYet")}</p> : null}
        </div>
      )}

      <Pagination page={page} setPage={setPage} total={count} pageSize={PAGE_SIZE} />
    </>
  );
}
