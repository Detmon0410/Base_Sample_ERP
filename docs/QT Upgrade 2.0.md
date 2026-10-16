# QT Upgrade 2.0

Upgrade of the quotation (QT) page. Today a QT is only a reference made outside the system ([api/qt.md](api/qt.md)). In 2.0 the system can **print the QT form**, **keep the customer's PO file**, and **create the factory order once the user confirms the QT**.

## Flow

1. **Create the QT.** Fill in QT No., date, customer, notes, and the lines (product, quantity, unit price, amount). Save it as `Draft`.
2. **Print the QT form** as a PDF and send it to the customer.
3. **Upload the customer's PO** when it arrives (PDF, PNG or JPG). The PO file is stored with the QT.
4. **Confirm the QT.** The user presses *Confirm QT*. The QT becomes `Confirmed`.
5. **The system creates the Factory Order** from the confirmed QT, copying the customer, the product lines and the quantities. The QT keeps a link to that order.

```text
Create QT (Draft) -> Print QT form -> Upload customer PO -> Confirm QT -> Factory Order created
```

All of this is on the one QT page: the list, the form, the Print button, the PO upload and the Confirm button.

## Print QT Form

- A *Print* button on the QT page produces a PDF of the QT form.
- Contents: QT No., date, customer name and address, the lines with a total, notes, and blank spaces for name and signature (prepared by, approved by, customer).
- The PDF can be printed again at any status.

## Upload PO From the Customer

- One PO file per QT: PDF, PNG or JPG, up to 10 MB (same limits as the existing QT file).
- Also keep the customer's PO No. and PO date, typed by the user.
- A new upload replaces the old file.
- The PO file is kept as evidence and is shown on the Factory Order.

## Confirm QT -> Create Factory Order

| Rule | Detail |
|---|---|
| Who | Any user who can use the QT page |
| Needs | The QT has at least one line and a customer. The PO file is expected, and the user is warned (not blocked) if it is missing |
| Result | The QT status becomes `Confirmed` and one Factory Order is created in `Draft` |
| Once only | A QT creates only one Factory Order. Pressing *Confirm* again does nothing and shows the existing order |
| Locked | A confirmed QT cannot change its lines, customer or quantities |
| Undo | Cancelling the Factory Order does not reopen the QT. A new QT is made if the sale changes |

### Factory Order fields filled from the QT

- Customer
- QT No. (reference) and customer PO No.
- Product lines and quantities
- The customer's PO file, as an attachment
- Status `Draft`

## Status

`Draft` -> `Confirmed`. The user moves the status by hand (no approval step). A QT in `Draft` can be deleted. A `Confirmed` QT cannot, because a Factory Order uses it ([api/qt.md](api/qt.md) already returns `409 IN_USE` in this case).

## Changes to the Existing QT

| Item | Now | In 2.0 |
|---|---|---|
| Lines and total | none (reference only) | product, quantity, unit price, amount |
| QT form | made outside | printed from the system |
| File | optional QT file | optional QT file **plus** the customer's PO file, PO No. and PO date |
| Status | none | `Draft`, `Confirmed` |
| Factory Order | typed QT reference | created from the confirmed QT |

## Assumptions to confirm

1. "Factory Order" is the Work Order / production order of the Factory module, and it is created in `Draft`.
2. A QT has only two statuses. `Sent`, `Rejected` and `Expired` from [Sale_req.md](BaseRequirement_md/Sale_req.md) are left out to keep it simple.
3. The PO file is expected but not forced before confirming (the same way the QT file is optional today).
4. There is no Sale Order step in this version. The confirmed QT goes straight to the Factory Order.
5. Prices come from the product master and the user can edit them on the QT.
