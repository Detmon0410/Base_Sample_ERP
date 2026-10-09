import i18n from "i18next";

/** The text of an error code: the first of `orders`, `master` that has one (a missing key is never asked for), else `fallback`. */
function errorText(t, code, fallback) {
  const namespace = ["orders", "master"].find((ns) => i18n.exists(`${ns}:errors.${code}`));
  return namespace ? t(`${namespace}:errors.${code}`) : t(`master:errors.${fallback}`);
}

/**
 * Shows what the server said about a form: every issue ({ path, code }) under its field, and returns the sentence for the
 * alert at the top of the form.
 */
export function applyServerErrors(form, error, t) {
  const issues = Array.isArray(error?.details) ? error.details : [];
  for (const item of issues) form.setError(item.path.join("."), { type: "server", message: errorText(t, item.code, "INVALID") });
  if (issues.length) return t("master:form.checkFields");
  return errorText(t, error?.code, "UNKNOWN_ERROR");
}

/** "In Progress" -> "InProgress": the key of a status in the texts. */
export const statusKey = (status) => String(status).replace(" ", "");
