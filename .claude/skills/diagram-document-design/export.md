# Document layout and export

## Renderer choice

| Need | Tool |
|---|---|
| Simple diagrams in Markdown, sequence, state | Mermaid |
| Strict orthogonal routing, own styling | ELK (elkjs) layout drawn to SVG |
| Orthogonal with Graphviz | `splines=ortho` (labels and ports are weak) |
| UML | PlantUML |
| Exact placement, rounded connectors | hand SVG |

Check which tools are installed before planning; prefer ones already in the project's `node_modules` or the system. Keep the Markdown (Mermaid) as the editable source, and render from it.

## Page rules

- A4. Portrait by default; landscape for wide diagrams (ER overview, sitemap, context) when it prints the text clearly larger.
- Margins about 18 mm; body 10-10.5 pt; table text 9 pt; diagram text at least 7 pt.
- Vector graphics (SVG) in PDF; in DOCX embed SVG with a PNG fallback.
- Heading, intro sentence and its figure stay on one page; a figure is never split; tables repeat the header row and do not split rows.
- Numbered figure captions; page number footer.
- One document per source file with the same name: `name.md` -> `name.pdf`, `name.docx`.

## Pipeline

1. Parse the Markdown into headings, paragraphs, lists, tables, code and chart blocks.
2. Render each chart to SVG in a headless browser (Playwright/Chromium) and record size and QA issues.
3. Choose orientation and scale per figure from its size.
4. PDF: print the assembled HTML with `preferCSSPageSize`, named landscape pages, footer.
5. DOCX: build from the same blocks (docx library), landscape sections where needed.
6. Fail the build when a figure is below the minimum font size.

Do not hand-edit generated documents; change the Markdown and rebuild.
