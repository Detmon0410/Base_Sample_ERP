---
name: diagram-document-design
description: Design, audit and export clean diagrams for printed documents (DOCX/PDF on A4) from Markdown sources. Use when asked to create, fix, redesign or review flowcharts, user flows, ERDs, DB relations, sitemaps, context diagrams, DFDs, API/sequence diagrams, or to export diagram documents. Covers notation, 90-degree routing, layout, splitting, theming and visual QA.
---

# Diagram document design

Goal: precise, readable diagrams with correct notation, orthogonal connectors and minimal clutter, delivered as documents (not a website).

## Workflow

1. **Read only the Markdown sources** (and the project's design-standards and theme files if they exist, e.g. `DIAGRAM_DESIGN_STANDARDS.md`, `diagram-theme.md`). Never parse PDF/DOCX as input. Never invent business rules, entities, endpoints or relationships; mark proposed vs existing design.
2. **Audit** each diagram: lines through nodes, overlapping connectors/arrowheads, unclear direction, long return paths, unbalanced branches, missing Yes/No labels, overcrowding, ambiguous merges, too big for the page. Report file, section, severity (H/M/L), fix. Also list conflicts *between* documents; do not resolve them silently.
3. **Plan and get approval** before editing: priority order, split strategy, renderer, document structure, open questions.
4. **Implement**: update the Markdown source first, then render, then export.
5. **Validate** (see [qa.md](qa.md)) before delivering. Fix defects, re-render.

## Choose the diagram

| Need | Diagram | Notation file section |
|---|---|---|
| Order of steps, decisions | Flowchart / user flow | [notation.md](notation.md#flowchart-and-user-flow) |
| Tables, keys, cardinality | ERD (crow's foot) / DB relations | [notation.md](notation.md#erd-and-db-relations) |
| Page hierarchy | Sitemap tree | [notation.md](notation.md#sitemap) |
| System and its outside | Context / DFD | [notation.md](notation.md#context-and-dfd) |
| Calls over time | Sequence | [notation.md](notation.md#api-and-sequence) |
| Layers, services | API architecture | [notation.md](notation.md#api-and-sequence) |
| Life cycle of one record | State diagram | one small diagram per record |

## Theme

Take colors from the project theme file or from a reference diagram the user names; never invent a palette. If none can be found, ask. Keep the palette in the project, not in this skill. Map each node *role* (start/end, action, decision, error, I/O, store, external) to theme colors, and tell roles apart by shape as well as color.

## Rules that matter most

- Main flow downward (or left to right for wide, shallow diagrams); alternatives branch sideways.
- 90-degree connectors with rounded elbows; anchors only at top/bottom/left/right of a shape.
- One idea per diagram: about 12-15 nodes, at most 2 levels of fan-out. Otherwise split by phase/actor/domain and link with named off-page connectors.
- Loops run in their own lane outside the main column, never back through it.
- Every decision has a label on every outgoing branch; merge only where logically valid.
- Text must print at 7 pt or more on the page. If it does not, split, do not shrink.
- Details: [layout.md](layout.md) (routing, grid, branching), [export.md](export.md) (tools, A4, DOCX/PDF), [qa.md](qa.md) (checks, troubleshooting).
