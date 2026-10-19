import { MermaidDocPage } from "@/pages/mermaidDoc/MermaidDocPage";

import { SECTIONS, TITLE } from "./contextDiagram";

/** The Context Diagram page (Admin): ProjectdocInfo/Context Diagram.md, the same content (pages/mermaidDoc), the details hidden. */
export function ContextDiagramPage() {
  return <MermaidDocPage title={TITLE} sections={SECTIONS} fileName="context-diagram" />;
}
