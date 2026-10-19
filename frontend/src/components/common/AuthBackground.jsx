/** Login background: the plain grey of the pages. Purely visual (aria-hidden, no pointer events). */
export function AuthBackground() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-page" />;
}
