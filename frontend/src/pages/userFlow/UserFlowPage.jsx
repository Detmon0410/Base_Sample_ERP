import { MermaidDocPage } from "@/pages/mermaidDoc/MermaidDocPage";

import { SECTIONS, TITLE } from "./userFlow";

/** The User Flow page (Admin): ProjectdocInfo/User Flow.md, the same content (pages/mermaidDoc). */
export function UserFlowPage() {
  return <MermaidDocPage title={TITLE} sections={SECTIONS} fileName="user-flow" />;
}
