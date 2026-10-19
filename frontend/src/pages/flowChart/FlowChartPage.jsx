import { MermaidDocPage } from "@/pages/mermaidDoc/MermaidDocPage";

import { SECTIONS, TITLE } from "./flowChart";

/** The Flow Chart page (Admin): ProjectdocInfo/Flow Chart.md, the same content (pages/mermaidDoc). */
export function FlowChartPage() {
  return <MermaidDocPage title={TITLE} sections={SECTIONS} fileName="flow-chart" />;
}
