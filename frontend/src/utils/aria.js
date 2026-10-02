/** `aria-describedby` value for a form control: the error id if there is an error, else the hint id. */
export function describedBy(id, { error, hint }) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
