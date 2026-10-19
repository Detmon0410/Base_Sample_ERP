import { MermaidDocPage } from "@/pages/mermaidDoc/MermaidDocPage";

import { INTRO, SECTIONS, TITLE } from "./apisDiagram";

/** The APIs Diagram page (Admin): ProjectdocInfo/APIs Diagram.md, the same content (pages/mermaidDoc), the details hidden. */
export function ApisDiagramPage() {
  return <MermaidDocPage title={TITLE} intro={INTRO} sections={SECTIONS} fileName="apis-diagram" />;
}
