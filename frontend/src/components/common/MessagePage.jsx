import { LayoutDashboard } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Centered single-message page (403, 404, ...) with one way out. */
export function MessagePage({ code, title, description, actionTo = "/" }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          {code ? <p className="text-5xl font-bold text-primary">{code}</p> : null}
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
          <Button asChild size="lg" className="mt-2">
            <Link to={actionTo}><LayoutDashboard aria-hidden="true" />{t("actions.backToDashboard")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
