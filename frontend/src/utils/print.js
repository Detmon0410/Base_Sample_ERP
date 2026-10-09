/**
 * Prints one document of the page, or saves it as a PDF (the print dialog of the browser): only the element marked
 * `data-print-doc="<name>"` is shown on paper (the rules are at the end of index.css). The title of the page is the file name.
 */
export function printDocument(name, title) {
  const before = document.title;
  document.body.dataset.printing = name;
  if (title) document.title = title;
  window.addEventListener(
    "afterprint",
    () => {
      delete document.body.dataset.printing;
      document.title = before;
    },
    { once: true },
  );
  window.print();
}
