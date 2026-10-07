import { Link } from "react-router";

import { DOC_DEPARTMENT, DOC_PATH } from "@/config/stock";
import { useAuth } from "@/hooks/useAuth";
import { canAccessDepartment } from "@/utils/permissions";

/**
 * The number of the document that made a stock movement. It is a link when the document has a page and the user may
 * open it (a Sale delivery is not for a Factory user); otherwise it is plain text. A goods receipt has no page yet.
 */
export function DocumentLink({ docType, docId, docNumber, fallback = "—" }) {
  const { user } = useAuth();
  if (!docNumber) return <span className="text-muted-foreground">{fallback}</span>;
  const path = DOC_PATH[docType];
  const department = DOC_DEPARTMENT[docType];
  const allowed = department === null || canAccessDepartment(user, department);
  if (!path || docId == null || !allowed) return <span>{docNumber}</span>;
  return (
    <Link to={`${path}/${docId}`} className="font-semibold text-primary underline-offset-2 hover:underline">
      {docNumber}
    </Link>
  );
}
