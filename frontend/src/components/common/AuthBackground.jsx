/** Login background: a very light blue that fades into the grey of the pages. Purely visual (aria-hidden, no pointer events). */
export function AuthBackground() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#e6f3fa] to-page" />;
}
