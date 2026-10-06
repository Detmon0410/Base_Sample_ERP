import { InboxIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/**
 * What a list shows instead of rows. Two cases:
 *   filtered  the search or a filter matches nothing: "No results" and a button that clears them
 *   (default) the list has no records at all: "Nothing here yet" and the New button, when the user may create
 */
export function ListEmpty({ filtered, text, onClear, clearLabel, newTo, newLabel }) {
  const { t } = useTranslation("common");
  const Icon = filtered ? SearchXIcon : InboxIcon;

  return (
    <Empty className="p-4">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-12 [&_svg:not([class*='size-'])]:size-6">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-semibold">{t(filtered ? "empty.noResultTitle" : "empty.noRecordsTitle")}</EmptyTitle>
        <EmptyDescription className="text-base">{text}</EmptyDescription>
      </EmptyHeader>
      {filtered ? (
        <EmptyContent className="text-base">
          <Button type="button" variant="outline" onClick={onClear}>
            {clearLabel}
          </Button>
        </EmptyContent>
      ) : newTo ? (
        <EmptyContent className="text-base">
          <Button asChild>
            <Link to={newTo}>
              <PlusIcon /> {newLabel}
            </Link>
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
