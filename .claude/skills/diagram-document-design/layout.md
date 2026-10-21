# Layout and routing

## Grid and spacing

- Place nodes on a grid (8 px unit). Equal gaps between siblings (about 32-40 px) and between layers (about 40-48 px).
- Same-rank nodes share a baseline; same-kind nodes share a width where practical.
- Arrange nodes first, route connectors second.

## 90-degree routing and anchors

- Horizontal and vertical segments only; rounded elbows (radius about 8 px, never more than half a segment).
- Forward lines leave the bottom and enter the top (TB), or leave the right and enter the left (LR).
- A decision uses its four tips: input at the back tip, the main branch at the forward tip, other branches at the side tips.
- Several lines into one node merge into one arrowhead at the same anchor. Never place two arrowheads closer than about 12 px.
- Lines never pass through unrelated nodes or labels.

## Branching, merging, loops

- Branches: main case straight down, exception to the side, ends balanced left/right.
- Merge only where the paths really join; otherwise end each path.
- Loop (retry, back to list): leave and enter on the same side, in a dedicated outer lane; label the condition near the decision.
- Long return paths (more than about 3 layers) are replaced by an off-page connector or by splitting the diagram.
- Labels sit next to the start of their line on a white background and touch no node or other line.

## Splitting

Split a diagram when it has more than about 15 nodes, more than 2 levels of fan-out, text under 7 pt on the page, or lines that cross more than once. Split by phase, actor or domain; keep an overview page; link pieces with named connectors; give each piece a heading and a figure caption.

## Layout engine notes

- Layered (ELK/dagre) layout with orthogonal routing gives good main-flow structure, but loops and merges need explicit side constraints. Break cycles by source order, so the loop edge is the back edge.
- Give extra branches of a node their own ports; do not let the engine pick.
- If the engine cannot do it cleanly, fall back to hand-placed SVG. A renderer limitation is not validated layout quality.
