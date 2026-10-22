# Diagram Theme

The colours of every diagram of the documents in `docs/ProjectdocInfo`. They come from [User Flow](User%20Flow.md) → "Everyone: sign in and move around" (its `classDef` lines); no other colour is used. The roles that chart does not have reuse its four colours and differ by shape. The document build (`scripts/docs`) reads the JSON block below; the rules of layout are in [Diagram Design Standards](DIAGRAM_DESIGN_STANDARDS.md).

| Role                                | Shape                       | Fill        | Stroke      | Text        |
| ----------------------------------- | --------------------------- | ----------- | ----------- | ----------- |
| startEnd: start, end, terminal page | stadium                     | `#1e1e1e`   | `#1e1e1e`   | `#ffffff`   |
| action: screen, step, process       | rounded rectangle           | `#f3e8ff`   | `#a855f7`   | `#1e293b`   |
| decision                            | diamond                     | `#e0f2fe`   | `#0284c7`   | `#1e293b`   |
| error                               | rounded rectangle           | `#fee2e2`   | `#ef4444`   | `#991b1b`   |
| io: input / output, document        | parallelogram               | as action   | as action   | as action   |
| store: data store, database         | cylinder                    | as action   | as action   | as action   |
| external: actor, outside system     | stadium                     | as startEnd | as startEnd | as startEnd |
| erHeader: title bar of a table      | rectangle                   | as decision | as decision | as decision |
| menu: menu entry in a sitemap | rounded rectangle | as action | as action | as action |
| page: page in a sitemap | rounded rectangle | as decision | as decision | as decision |
| connector, line label               | line 1.5 px, label on white | –           | `#1e293b`   | `#1e293b`   |

In Mermaid, give a node its role with `:::role` and copy the four `classDef` lines of the reference chart into the chart.

```json
{
  "font": "Arial, Helvetica, sans-serif",
  "fontSize": 13,
  "labelFontSize": 12,
  "roles": {
    "startEnd": {
      "fill": "#1e1e1e",
      "stroke": "#1e1e1e",
      "text": "#ffffff",
      "strokeWidth": 2
    },
    "action": {
      "fill": "#f3e8ff",
      "stroke": "#a855f7",
      "text": "#1e293b",
      "strokeWidth": 1.5
    },
    "decision": {
      "fill": "#e0f2fe",
      "stroke": "#0284c7",
      "text": "#1e293b",
      "strokeWidth": 1.5
    },
    "error": {
      "fill": "#fee2e2",
      "stroke": "#ef4444",
      "text": "#991b1b",
      "strokeWidth": 1.5
    },
    "io": "action",
    "store": "action",
    "external": "startEnd",
    "erHeader": "decision",
    "menu": "action",
    "page": "decision"
  },
  "connector": {
    "stroke": "#1e293b",
    "strokeWidth": 1.5,
    "labelText": "#1e293b",
    "labelBackground": "#ffffff"
  }
}
```
