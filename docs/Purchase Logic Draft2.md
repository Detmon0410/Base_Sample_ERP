# Purchase Logic Draft 2

Draft of the purchase flow, rewritten from the latest notes. It simplifies [Purchase_req.md](BaseRequirement_md/Purchase_req.md): the whole flow lives on **one page**, the user sets the status by hand, and there is no separate Goods Receipt document.

## Flow

1. **Check stock.** The user opens the Purchase page and sees what is left of each material.
2. **Create a PO** for any item that is running low. Fill in:
   - Supplier
   - Required date
   - Department
   - Items from that supplier's list, with the quantity of each
   - Unit price: starts from the supplier's price on the system (the "initial price"), and the user can change it
3. **Save.** The PO is saved as `Draft`.
4. **Print the PO as a PDF** to send to the supplier. The PDF has name and signature spaces.
5. **Update the status by hand:** `Draft` -> `Sent` -> `Received`.
6. **On `Received`:**
   - Stock goes up by the received quantities.
   - The user records the **payment** for the purchase.
7. **Attach files** to the PO at any step (see Attachments).

```text
Stock low -> Create PO (Draft) -> Print PDF -> Sent -> Received -> Stock +qty
                                                          |
                                                          v
                                                  Payment recorded
```

## One Page

Everything is on one Purchase page, with no separate screens per step:

| Area | Content |
|---|---|
| Stock | Material, remaining quantity, low-stock flag, and a "Create PO" action |
| PO form | Supplier, required date, department, item lines, quantities, prices, total |
| PO list | PO No., supplier, required date, status, and the status buttons |
| PO detail | Lines, Print PDF, Payment, Attachments |

## Purchase Order

| Field | Notes |
|---|---|
| PO No. | Running number |
| Supplier | Chosen from the supplier list |
| Required date | When the goods are needed |
| Department | Which department the purchase is for |
| Lines | Material, quantity, unit, unit price, amount. Only the chosen supplier's items can be picked |
| Total | Sum of the line amounts |
| Status | `Draft`, `Sent`, `Received` |
| Names and signatures | Blank spaces on the PDF: for example prepared by, approved by, received by |

### Status

- The user moves the status by hand. There is no approval step.
- Changes go forward one step at a time: `Draft` -> `Sent` -> `Received`.
- Lines can be edited only in `Draft`.
- `Received` adds the received quantities to stock **once**. Moving to `Received` again must not add them twice.

## Payment

- A PO in `Received` needs a payment record.
- Store: payment date, amount, method, reference no., and note.
- The PO shows whether it is paid.

## Attachments

Files can be uploaded and kept with the PO as evidence:

- **PO file:** the printed PO or the supplier's PO details. A new upload updates the document.
- **Quotation:** the supplier quotation, or the quotation for a completed sale.
- **Production order evidence:** images or documents.
- **Other printable documents.**

Each file keeps its type, name, who uploaded it, and when.

## Assumptions to confirm

1. "Supplier E" is read as "the chosen supplier". If it is a specific supplier, tell me.
2. "Send" is read as the status `Sent`.
3. "Receipt" is read as the `Received` status. It is not a separate Goods Receipt document.
4. There is no partial receiving. A PO is either not received or fully received. Partial deliveries would need an extra status.
5. Department is a plain list on the PO. It is not a permission or approval rule.
6. Quotations and production-order evidence belong to the Sale and Factory pages. The Purchase page reuses the same upload feature.
7. Payment is stored on the PO. It does not go through the Accounting module.
