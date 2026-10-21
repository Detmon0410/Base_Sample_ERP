# Notation by diagram type

## Flowchart and user flow

| Element | Shape |
|---|---|
| Start / end / terminal page | stadium (oval) |
| Process, screen, step | rounded rectangle |
| Decision | diamond, one question, labeled branches (Yes/No or the value) |
| Input / output, document | parallelogram |
| Data store | cylinder |
| Sub-process | rectangle with double side bars |
| Error / exception | same shape as process, error color |
| Off-page link | small circle or terminal with the target diagram's name |

- A user flow shows screens, actions, decisions, navigation, success and error paths. Menu choices are not decisions: use a process box.
- A node with several outgoing lines that are all taken (a fork) is drawn from one stub; a decision's branches leave from separate tips.
- Dotted line = optional or side action (upload, note). Solid = main flow.
- Do not write an arrow in text where a line exists.

## ERD and DB relations

- ERD: crow's foot. Entity box with title bar, attribute rows `type name [PK|FK|UK] [note]`.
- Cardinality symbols at the correct end: exactly one `||`, zero or one `o|`, one or many `|{`, zero or many `o{`. Optionality must match the nullable FK.
- Relationship label = verb phrase, placed near the middle of its line.
- Every FK column has a line; a link with no database key (polymorphic owner) is dashed and says so.
- Many-to-many appears only through its junction table.
- DB relations: one table per box with PK/FK/type, 1:1 and 1:N marked; group tables by domain (about 6-8 per page) and keep related tables adjacent. Replace ASCII chains with real diagrams.

## Sitemap

- Hierarchical tree. Parent centered above evenly spaced children, aligned siblings, shared horizontal bus line per parent, no duplicate parent nodes.
- Same level = same kind of thing (menu level or page level, not both). Long notes go in a table beside the tree.
- Wide trees: landscape, or one tree per top-level branch.

## Context and DFD

- Context (level 0): one central system, external entities around it, one labeled arrow per direction, each on its own anchor. Show only flows between entity and system.
- DFD: external entities (rectangle/stadium), processes (rounded, numbered), data stores (open-ended or cylinder), labeled data flows. A child diagram keeps the same inputs and outputs as its parent process (balance).
- An architecture or deployment picture is not a DFD: title it accordingly.

## API and sequence

- API flow: endpoint -> authentication -> authorization -> validation -> processing -> response, with HTTP status/error branches.
- API architecture: Client -> API -> Services -> Database, boundaries as groups, protocol on each arrow.
- Sequence (UML): lifelines left to right in call order, solid arrows for calls, dashed for returns, `alt`/`opt`/`loop` frames for conditions, notes for computed values. Show error responses inside `alt`, not as always-happening messages. Who may call = actor name, not extra lifelines.

## State diagram

One record per diagram. States are statuses that exist; events label transitions; initial and final markers; reopen/back transitions on a side lane. Do not draw computed values as stored states without saying so.
