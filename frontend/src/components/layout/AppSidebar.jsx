import { ChevronRightIcon, FactoryIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { DASHBOARD_ITEM, findActive, getVisibleGroups } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";

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
          <Link to={group.items[0].to} aria-label={label}>
            <Icon />
            <span>{label}</span>
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
            <ChevronRightIcon className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {group.items.map((item) => {
              const active = findActive(pathname)?.item.key === item.key;
              return (
                <SidebarMenuSubItem key={item.key}>
                  <SidebarMenuSubButton asChild isActive={active}>
                    <Link to={item.to} aria-current={active ? "page" : undefined}>
                      <span>{t(item.labelKey)}</span>
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

export function AppSidebar() {
  const { t } = useTranslation(["nav", "common"]);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const active = findActive(pathname);
  const DashboardIcon = DASHBOARD_ITEM.icon;
  const dashboardActive = pathname === "/";

  return (
    <Sidebar collapsible="icon" aria-label={t("nav:mainMenu")}>
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-4 py-0 group-data-[collapsible=icon]:px-0">
        <div className="flex w-full items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center">
          <div
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"
          >
            <FactoryIcon className="size-5" />
          </div>
          <span className="truncate text-lg font-bold tracking-wide text-primary group-data-[collapsible=icon]:hidden">
            {t("common:app.name")}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 group-data-[collapsible=icon]:px-1.5">
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
      <SidebarRail />
    </Sidebar>
  );
}
