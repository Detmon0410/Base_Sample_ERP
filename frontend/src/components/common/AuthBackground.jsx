/**
 * Login background: plain white with one soft blue glow behind the form.
 * The glow is sized in % of the screen, so it keeps its proportions at any browser zoom.
 * Purely visual (aria-hidden, no pointer events).
 */
export function AuthBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-white bg-[radial-gradient(ellipse_55%_60%_at_50%_52%,rgb(20_71_230/0.13),rgb(20_71_230/0.05)_45%,transparent_72%)]"
    />
  );
}
