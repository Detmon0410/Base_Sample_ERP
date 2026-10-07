import { ClockIcon, IdCardIcon, KeyRoundIcon, UsersRoundIcon } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { PasswordField } from "@/components/admin/PasswordField";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { RecordSheet, SheetFormBody } from "@/components/common/RecordSheet";
import { InfoTip } from "@/components/common/InfoTip";
import { SheetSection } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRecordForm } from "@/hooks/useRecordForm";
import { userService } from "@/services/users.service";
import { formatDateTime } from "@/utils/format";

import { AssignmentsTable } from "./AssignmentsTable";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { EMPTY_USER, newUserSchema, toFormValues, toPayload, userSchema } from "./userSchema";

const FIELD_ERRORS = { EMAIL_ALREADY_EXISTS: "email" };

/** U2 — /admin/users/new and /admin/users/:id */
export function UserFormPage() {
  const { t, i18n } = useTranslation(["users", "master", "nav"]);
  const isNewRoute = useParams().id === undefined;
  const [resetOpen, setResetOpen] = useState(false);
  const page = useRecordForm({
    service: userService,
    schema: isNewRoute ? newUserSchema : userSchema,
    emptyValues: EMPTY_USER,
    toValues: toFormValues,
    toPayload,
    listPath: "/admin/users",
    idPrefix: "user",
    fieldErrors: FIELD_ERRORS,
  });
  const { isNew, record, form, errors, message, fieldProps } = page;
  const isSelf = !isNew && record.isSelf;
  const locked = !isNew && Boolean(record.hasActivity);

  return (
    <RecordSheet
      page={page}
      entityTitle={t("nav:items.users")}
      newTitle={t("users:form.title.new")}
      titleOf={(user) => user.name}
      singular={t("users:form.singular")}
      formId="user-form"
      locks={{ status: isSelf, delete: isSelf || locked }}
    >
      <form id="user-form" noValidate onSubmit={page.onSubmit} className="flex min-h-0 flex-1 flex-col">
        <SheetFormBody>
          <FormSection title={t("users:form.sections.account")} icon={IdCardIcon} aside={isSelf ? <InfoTip label={t("users:form.selfLabel")}>{t("users:form.self")}</InfoTip> : undefined}>
            <FormField id="user-name" label={t("users:form.fields.name")} required error={message(errors.name)}>
              <Input id="user-name" autoFocus={isNew} placeholder={t("users:form.placeholders.name")} {...fieldProps("name")} {...form.register("name")} />
            </FormField>
            <FormField id="user-email" label={t("users:form.fields.email")} required error={message(errors.email)}>
              <Input id="user-email" type="email" autoComplete="off" placeholder={t("users:form.placeholders.email")} {...fieldProps("email")} {...form.register("email")} />
            </FormField>
          </FormSection>

          {isNew ? (
            <FormSection title={t("users:form.sections.password")} icon={KeyRoundIcon} columns={1} aside={<InfoTip label={t("users:form.password.hintLabel")}>{t("users:form.password.hint")}</InfoTip>}>
              <FormField id="user-password" label={t("users:form.fields.password")} required error={message(errors.password)}>
                <Controller
                  control={form.control}
                  name="password"
                  render={({ field }) => <PasswordField id="user-password" ref={field.ref} value={field.value} onChange={field.onChange} {...fieldProps("password", true)} />}
                />
              </FormField>
            </FormSection>
          ) : null}

          <SheetSection title={t("users:form.sections.assignments")} icon={UsersRoundIcon} aside={<InfoTip label={t("users:form.assignments.hintLabel")}>{t("users:form.assignments.hint")}</InfoTip>}>
            <AssignmentsTable form={form} disabled={isSelf} />
          </SheetSection>

          {!isNew ? (
            <SheetSection
              title={t("users:form.sections.info")}
              icon={ClockIcon}
              aside={
                <span className="flex items-center gap-2">
                  {locked && !isSelf ? <InfoTip label={t("users:form.inUseLabel")}>{t("users:form.inUse")}</InfoTip> : null}
                  {!isSelf ? (
                    <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setResetOpen(true)}>
                      <KeyRoundIcon aria-hidden="true" /> {t("users:form.resetPassword.button")}
                    </Button>
                  ) : null}
                </span>
              }
            >
              <dl className="grid gap-4 @lg:grid-cols-3">
                <div>
                  <dt className="text-sm font-semibold text-muted-foreground">{t("users:form.info.lastLoginAt")}</dt>
                  <dd>{record.lastLoginAt ? formatDateTime(record.lastLoginAt, i18n.language) : t("users:form.info.never")}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-muted-foreground">{t("master:common.createdAt")}</dt>
                  <dd>{formatDateTime(record.createdAt, i18n.language)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-muted-foreground">{t("master:common.updatedAt")}</dt>
                  <dd>{formatDateTime(record.updatedAt, i18n.language)}</dd>
                </div>
              </dl>
            </SheetSection>
          ) : null}
        </SheetFormBody>
      </form>
      {!isNew && !isSelf ? <ResetPasswordDialog user={record} open={resetOpen} onOpenChange={setResetOpen} /> : null}
    </RecordSheet>
  );
}
