import { Fragment } from "react";
import { useParams } from "react-router";

/**
 * Wrap the element of a /new and /:id route: when the id in the URL changes (new -> the saved record, or the
 * Back button between two records) the sheet is built again from scratch instead of keeping the state of the
 * previous record.
 */
export function RemountOnId({ children }) {
  const { id } = useParams();
  return <Fragment key={id ?? "new"}>{children}</Fragment>;
}
