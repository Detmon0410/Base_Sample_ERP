import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const FALLBACK_MS = 120000;

/**
 * Prints `children` (the paper version of a document) through a hidden iframe and calls `onDone` when the
 * browser print dialog is closed. Printing the iframe, not the page, means the browser does not lay out the
 * whole app again for print, so the sheet behind does not freeze while the dialog opens.
 * The iframe gets a copy of the page's styles (Tailwind) and an A4 page without margins: our own padding is
 * used, so the browser prints no date or address in the margins.
 */
export function PrintFrame({ children, onDone }) {
  const [frame, setFrame] = useState(null);
  const [loaded, setLoaded] = useState(false); // the empty document of the frame is ready (it is replaced once while loading)
  const [mount, setMount] = useState(null);

  useEffect(() => {
    const doc = loaded ? frame?.contentDocument : null;
    const win = loaded ? frame?.contentWindow : null;
    if (!doc || !win) return undefined;
    let cancelled = false;

    const loading = [];
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      const copy = node.cloneNode(true);
      if (copy.tagName === "LINK") loading.push(new Promise((resolve) => ((copy.onload = resolve), (copy.onerror = resolve))));
      doc.head.appendChild(copy);
    });
    const page = doc.createElement("style");
    page.textContent = "@page { size: A4; margin: 0 } html, body { margin: 0; background: #fff } body { padding: 14mm }";
    doc.head.appendChild(page);
    setMount(doc.body);

    Promise.all(loading).then(() => {
      if (cancelled) return;
      // give React one moment to draw into the iframe, then open the print dialog
      setTimeout(() => {
        if (cancelled) return;
        win.addEventListener("afterprint", onDone, { once: true });
        win.focus();
        win.print();
      }, 150);
    });
    const fallback = setTimeout(onDone, FALLBACK_MS);
    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
    // onDone is a state setter of the caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, loaded]);

  return (
    <>
      <iframe ref={setFrame} onLoad={() => setLoaded(true)} srcDoc="<!doctype html><html><head></head><body></body></html>" title="print" aria-hidden="true" tabIndex={-1} style={{ position: "fixed", right: 0, bottom: 0, width: 0, height: 0, border: 0 }} />
      {mount ? createPortal(children, mount) : null}
    </>
  );
}
