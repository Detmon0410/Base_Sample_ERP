# Visual QA and troubleshooting

## Check every rendered diagram

Automatic (geometry): no line through a node, no line on top of another (except a shared end), no overlapping labels or label on a node, arrowheads not touching, nothing outside the drawing, crossings count reported, printed font size.

By eye (look at the PNG/page, not only the report):
- every decision branch labeled; labels next to their lines
- main flow reads top to bottom; loops are in outer lanes
- merges have one arrowhead; forks leave from one stub
- rounded elbows, equal spacing, aligned siblings
- shapes and colors match the notation and theme
- text matches the source Markdown (no lost or reworded labels)
- page: figure fits, heading kept with figure, no clipped edge, landscape pages only where intended

Compare diagram logic with the source after any edit: same nodes, same edges, same conditions.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Two opposing arrows on top of each other | one arrow, or a return lane |
| Line crosses the main column to loop back | back edge on the outer side port; or off-page connector |
| Tiny text when fitted to the page | split the diagram, or landscape |
| Many fan-out children make the row too wide | group them, or LR, or a table |
| Label on a node or line | place beside the first segment, try the other side, shorten the label |
| Decision branches leave the same tip | assign tips: forward, side, side; back-edges to their outer tip |
| Layout engine ignores a side | use ports with fixed sides, not just edge hints |
| Renderer output differs from the app's | decide which is the source of truth; keep their text identical |
| Fonts differ in the PDF | embed or use a common font; re-check text widths |
| Cycle drawn upward through nodes | break cycles by declaration order so the loop edge is the back edge |
