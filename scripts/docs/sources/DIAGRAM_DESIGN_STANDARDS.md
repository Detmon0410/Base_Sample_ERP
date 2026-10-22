# Diagram Design Rules

Apply these rules to all Flowcharts, User Flows, ERDs, DB Relations, Sitemaps, Context Diagrams, DFDs, and API Diagrams.

## 1. Visual Layout

- Professional, clean, structured layout.
- Default: Top-to-Bottom (TB); use Left-to-Right (LR) when appropriate.
- Align nodes to a consistent grid.
- Maintain equal spacing, balanced branches, and clear hierarchy.
- Group related nodes; split oversized diagrams.
- Keep labels short and readable.
- No predefined colors. Follow user/project theme.

## 2. Connectors

- Default: **Orthogonal (90° / Manhattan routing)**.
- Horizontal/vertical segments only; avoid diagonal lines.
- Prefer subtly rounded elbows when supported.
- Connect at logical anchors: top, bottom, left, right.
- Keep lines outside unrelated nodes.
- Minimize crossings, overlaps, bends, and long return paths.
- Use consistent line widths and arrowheads.
- Main flow goes downward; alternatives branch sideways.
- Align parallel connectors and distribute branches evenly.
- Label conditions near their respective lines.
- Preserve notation-specific connectors where required.

## 3. Diagram Rules

| Type             | Required Design                                                                      |
| ---------------- | ------------------------------------------------------------------------------------ |
| Flowchart        | Oval Start/End, rectangle Process, diamond Decision, parallelogram I/O; label Yes/No |
| User Flow        | Screens, actions, decisions, navigation, success/error paths                         |
| ERD              | Crow's Foot notation; entities, attributes, cardinality, optionality                 |
| DB Relations     | Tables with PK/FK, types, 1:1, 1:N; junction table for N:M                           |
| Sitemap          | Hierarchical tree; shared parent connectors, aligned sibling pages                   |
| Context Diagram  | Central system, external actors/systems, labeled directional interactions            |
| DFD              | External entities, processes, data stores, labeled data flows; balance decomposition |
| API Flow         | Endpoint, authentication, validation, processing, HTTP status/error branches         |
| API Architecture | Client → API → Services → Database; boundaries and protocols                         |
| API Sequence     | UML lifelines, chronological messages, returns, alt/loop blocks                      |

## 4. Layout Patterns

- **Tree:** Parent centered above evenly spaced children.
- **Decision:** Diamond with labeled branches; merge only when logically valid.
- **Database:** Related tables adjacent; Crow's Foot at correct ends.
- **Context:** Central system with external entities arranged around it.
- **API:** Group by component/layer; show request direction.
- **Loops:** Route outside the primary flow.
- **Sitemap:** Shared horizontal branching lines; avoid duplicate parent nodes.

## 5. Rendering

- Mermaid: Default for Markdown diagrams.
- Graphviz: Prefer `splines=ortho` for strict right-angle routing.
- PlantUML: Use supported orthogonal layouts and UML notation.
- diagrams.net/SVG: Prefer for exact positioning and rounded connectors.
- Renderer limitations must not be mistaken for validated layout quality.

## 6. Agent Workflow

1. Read requirements and relevant project files.
2. Choose correct diagram type and notation.
3. Identify nodes, relationships, and conditions.
4. Arrange nodes before routing connectors.
5. Apply consistent spacing and 90° routing where appropriate.
6. Validate logic, cardinality, direction, labels, and syntax.
7. Render and inspect when tools are available.
8. Fix overlap, crossing, clipping, and routing issues.

## 7. Constraints

- Never invent system behavior, APIs, entities, or relationships.
- Distinguish existing design from proposed design.
- No decorative complexity.
- No unnecessary diagonal or curved connectors.
- Never sacrifice correctness for visual symmetry.
- Follow the user's visual references for geometry, not colors.

**Goal:** Produce precise, readable, professional diagrams with organized nodes, clean orthogonal connectors, correct notation, and minimal visual clutter.
