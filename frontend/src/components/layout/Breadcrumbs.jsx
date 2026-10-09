import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { findActive } from "@/config/navigation";

/** Dashboard / Group / Page / (New | Details). The last item is the current page. */
function useCrumbs(pathname, t) {
  if (pathname === "/") return [{ label: t("dashboard") }];

  const crumbs = [{ label: t("dashboard"), to: "/" }];
  const match = findActive(pathname);
  if (!match) return crumbs;

  const { group, item } = match;
  const rest = pathname.slice(item.to.length).split("/").filter(Boolean);
  crumbs.push({ label: t(group.labelKey) });
  crumbs.push(rest.length ? { label: t(item.labelKey), to: item.to } : { label: t(item.labelKey) });
  if (rest.length) {
    const first = rest[0];
    crumbs.push({ label: first === "new" ? t("breadcrumb.new") : t("breadcrumb.detail") });
  }
  return crumbs;
}

export function Breadcrumbs() {
  const { t } = useTranslation("nav");
  const { pathname } = useLocation();
  const crumbs = useCrumbs(pathname, t);

  return (
    <Breadcrumb aria-label={t("breadcrumb.label")}>
      <BreadcrumbList className="text-base text-white/80 flex-nowrap whitespace-nowrap max-[1279px]:[&>li:not(:last-child)]:hidden [&_a]:text-white/85 [&_a:hover]:text-white">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-semibold text-white">{crumb.label}</BreadcrumbPage>
                ) : crumb.to ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </BreadcrumbItem>
              {isLast ? null : <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
