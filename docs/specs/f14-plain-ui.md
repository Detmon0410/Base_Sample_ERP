# F14 — Plain UI (light level)

Status: **BUILT (light level)** · Request: make the UI less polished ("does not need to be pretty"). This level changes the look through a few shared places only; no page structure, no behaviour and no text changed.

## What changed

| Part | Before | After | Where |
|---|---|---|---|
| Boxes (cards of a sheet, boxes of a list) | white, soft shadow, large rounded corner | white, **thin grey border**, small corner, **no shadow** | `CARD_CLASS`, `PANEL_CLASS` in `components/common/SheetSection.jsx`, plus the journal box, the work order card, the KPI card and the login card |
| Title of a box | a coloured icon before the title | **title only** (the icon is no longer drawn) | `SheetSection` |
| Movement | sheets slide in, things fade, the refresh icon spins, loading blocks pulse | **nothing moves** (every animation and transition lasts 1 ms; a sheet or a dialog still opens and closes) | `index.css` |
| Colours of statuses | 8 colour families (grey, sky, amber, emerald, red, orange, violet, teal) | **5 tones**: grey, blue (sky), amber, green (emerald), red. Orange became red, violet became blue, teal became green. Every status keeps its icon and its text | `STATUS_COLORS` in `config/sale.js`, the serial status badge, the trace markers |

## What was kept on purpose

* The size of the text (18 px), the height of the controls (about 48 px), visible focus, keyboard use, and the contrast of the text: the users are 40–50 and older.
* A status is always text + icon, never colour alone.
* The role helmet and the date/time in the header (customer requirements N7, N8), the menu icons, and the new-row dots (the workflow test; the red request counters of the menu were removed later).
* The side sheet, the status stepper and the vertical timelines (the medium level, see below).

## Not done (medium level, only if asked)

Status stepper as plain tabs · timelines as tables · detail sheets as full pages · fewer tooltips and info icons · a plain dashboard with numbers only.
