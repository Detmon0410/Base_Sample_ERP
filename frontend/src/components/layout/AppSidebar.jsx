import { ChevronRightIcon, FactoryIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { CountBadge } from "@/components/common/CountBadge";
import { ResizeHandle } from "@/components/common/ResizeHandle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { DASHBOARD_ITEM, findActive, getVisibleGroups } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { SIDEBAR_DEFAULT_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "@/hooks/useSidebarWidth";

// Soft background, primary text and a left bar for the page the user is on.
const ACTIVE_STYLE = "data-active:shadow-[inset_3px_0_0_var(--primary)]";

function NavGroup({ group, activeGroupKey }) {
  const { t } = useTranslation("nav");
  const { state } = useSidebar();
  const { pathname } = useLocation();
  const isActiveGroup = activeGroupKey === group.key;
  const [open, setOpen] = useState(isActiveGroup);
  const Icon = group.icon;
  const label = t(group.labelKey);
  const counts = useNotifications().groups[group.key]; // requests waiting for this department: { total, items }

  // Open the group that contains the page the user navigates to (adjusted while rendering).
  const [wasActiveGroup, setWasActiveGroup] = useState(isActiveGroup);
  if (isActiveGroup !== wasActiveGroup) {
    setWasActiveGroup(isActiveGroup);
    if (isActiveGroup) setOpen(true);
  }

  // Collapsed sidebar: one icon per group that opens the group's first page.
  if (state === "collapsed") {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActiveGroup}
          tooltip={label}
          className={ACTIVE_STYLE}
        >
          <Link to={group.items[0].to} aria-label={counts?.total ? `${label}, ${t("requests.waiting", { count: counts.total })}` : label} className="relative">
            <Icon />
            <span>{label}</span>
            <CountBadge count={counts?.total} variant="dot" className="absolute top-0.5 right-0.5 size-2" />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isActiveGroup && !open} className={ACTIVE_STYLE}>
            <Icon />
            <span>{label}</span>
            <CountBadge count={counts?.total} variant="dot" className="ml-auto" />
            <ChevronRightIcon className={`${counts?.total ? "" : "ml-auto "}size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90`} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {group.items.map((item) => {
              const active = findActive(pathname)?.item.key === item.key;
              return (
                <SidebarMenuSubItem key={item.key}>
                  <SidebarMenuSubButton asChild isActive={active}>
                    <Link to={item.to} aria-current={active ? "page" : undefined} className="justify-between">
                      <span>{t(item.labelKey)}</span>
                      <CountBadge count={counts?.items?.[item.key]} hint={t(`requests.items.${item.key}`, { defaultValue: "" })} />
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/** `width`: result of useSidebarWidth. Dragging the dots on the right edge changes the width of the expanded sidebar. */
export function AppSidebar({ width }) {
  const { t } = useTranslation(["nav", "common"]);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const active = findActive(pathname);
  const DashboardIcon = DASHBOARD_ITEM.icon;
  const dashboardActive = pathname === "/";

  return (
    <Sidebar collapsible="icon" aria-label={t("nav:mainMenu")} className="group-data-[side=left]:border-r-0">
      {/* The same blue band as the top bar. The line on the right edge of the sidebar is drawn by the element below,
          which starts under this header, so no line is ever behind or over the band. */}
      <SidebarHeader className="h-12 justify-center bg-primary px-3 py-0 text-primary-foreground group-data-[collapsible=icon]:px-0">
        <div className="flex w-full items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center">
          <div
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-primary"
          >
            <FactoryIcon className="size-4.5" />
          </div>
          <span className="truncate text-base font-bold tracking-wide text-primary-foreground group-data-[collapsible=icon]:hidden">
            {t("common:app.name")}
          </span>
        </div>
      </SidebarHeader>

      <div aria-hidden="true" className="pointer-events-none absolute top-12 right-0 bottom-0 w-px bg-sidebar-border" />

      <SidebarContent className="px-2 py-2 group-data-[collapsible=icon]:px-1.5">
        <SidebarGroup className="p-0">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={dashboardActive}
                tooltip={t("nav:dashboard")}
                className={ACTIVE_STYLE}
              >
                <Link to="/" aria-current={dashboardActive ? "page" : undefined}>
                  <DashboardIcon />
                  <span>{t("nav:dashboard")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {getVisibleGroups(user).map((group) => (
              <NavGroup key={group.key} group={group} activeGroupKey={active?.group?.key} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <ResizeHandle
        edge="right"
        label={t("nav:resizeSidebar")}
        value={width.width}
        min={SIDEBAR_MIN_WIDTH}
        max={SIDEBAR_MAX_WIDTH}
        defaultValue={SIDEBAR_DEFAULT_WIDTH}
        growKey="ArrowRight"
        valueFromPointer={(clientX) => clientX}
        onChange={width.setWidth}
        onCommit={width.commit}
        onDragChange={(dragging) => document.body.classList.toggle("sidebar-resizing", dragging)}
        className="top-12 group-data-[collapsible=icon]:hidden"
      />
    </Sidebar>
  );
}
