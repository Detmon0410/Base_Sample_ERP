/**
 * Saves one document of the page as a PDF file: the browser draws the element, the
 * picture is put on A4 pages (more pages when it is long) and the file is downloaded under `fileName`. Japanese text is drawn by the
 * browser, so it needs no font in the file; the price is that the text of the PDF is a picture. The two libraries are loaded only
 * when this is called, so the first load of the app does not carry them.
 */
export async function downloadPdf(element, fileName) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);

  // windowWidth: the document is drawn at the width of a desktop, also on a phone (a phone would stack the table)
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff", windowWidth: 1100 });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageWidth = pageWidth - margin * 2;
  const roomHeight = pageHeight - margin * 2;
  const pxPerMm = canvas.width / imageWidth;
  const sliceHeight = Math.floor(roomHeight * pxPerMm); // how many pixels of the picture fit on one page

  for (let top = 0, page = 0; top < canvas.height; top += sliceHeight, page += 1) {
    const height = Math.min(sliceHeight, canvas.height - top);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = height;
    slice.getContext("2d").drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, imageWidth, height / pxPerMm);
  }

  pdf.save(fileName);
}
