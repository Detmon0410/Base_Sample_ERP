/**
 * The Japanese of the words of ProjectdocInfo/ER Diagram.md and ProjectdocInfo/DB Relations.md, for the ER diagram and the DB
 * relations pages in Japanese: English text of the .md -> Japanese. The names of the tables and columns, the values of a column
 * ("Admin | Worker"), the error codes, the paths and the chain sketches stay as they are (they are the names of the database and of
 * the API), so they are not here. mdJa.test.js fails when a text the pages show has no Japanese here, when a Japanese text is left
 * over, or when a Japanese text changes a `code`.
 */
export const JA = {
  // ER Diagram.md: the labels of the relationships
  has: "持つ",
  contains: "含む",
  "quoted as": "見積明細",
  "confirm creates": "確定で作成する",
  orders: "発注する",
  "ordered as": "明細になる",
  "made by": "工程で作られる",
  records: "記録される",
  writes: "入力する",
  needs: "必要とする",
  "used in": "使われる",
  "kept in": "保管される",
  history: "履歴",
  sells: "販売する",
  "sold by": "販売元",
  receives: "発注を受ける",
  "bought as": "購入明細になる",
  "paid by": "支払われる",
  "received adds": "入荷で追加する",
  creates: "作成する",
  files: "ファイル",
  evidence: "証跡",
  "billed by": "請求される",
  "proved by": "証明される",

  // ER Diagram.md: the notes of the columns (a list of values, "Draft | Confirmed", stays as it is)
  "initial price": "初期単価",
  "start production": "製造開始時",
  "PO received": "PO入荷時",
  "set on confirm": "確定時に設定",

  // ER Diagram.md: the notes
  "`Attachment` is polymorphic (`owner_type` + `owner_id`), so there is no database foreign key to the owner; the service checks it.":
    "`Attachment` はポリモーフィック（`owner_type` + `owner_id`）なので、持ち主へのデータベースの外部キーはありません。サービスが確認します。",
  "`PurchasePayment` is stored on the PO and does not go through the Accounting tables.": "`PurchasePayment` は PO に保存され、経理のテーブルを通りません。",
  "`QT_REFERENCE.production_order_id` is unique: one QT creates one Factory Order.": "`QT_REFERENCE.production_order_id` は一意です。1件のQTから製造指示書が1件作られます。",
  "Invoice, Payment and Receipt are unchanged and keep their snapshot fields (not repeated here).": "Invoice、Payment、Receipt は変わらず、スナップショットの項目を持ちます（ここでは省略）。",
  "`Order status` (`Draft`, `In Progress`, `Completed`) is **computed** from the processes; it is not a column. The stock status (`Normal`, `Low`, `Out`) is computed from the lot totals and `min_level`.":
    "`Order status`（`Draft`・`In Progress`・`Completed`）は工程から**計算**され、列ではありません。在庫ステータス（`Normal`・`Low`・`Out`）はロットの合計と `min_level` から計算されます。",
  "`Invoice` and `Receipt` copy the customer and the product data when they are issued (a snapshot). An order is billed once, and an invoice has at most one payment and one receipt.":
    "`Invoice` と `Receipt` は発行時に顧客と製品の内容をコピーします（スナップショット）。指示書の請求は1回だけで、請求書の入金と領収書は最大1件ずつです。",
  "An order is made only by Confirm QT, so `ProductionOrder.qt_id` is always set and each QT has at most one order.":
    "指示書は QT の確定でのみ作られるため、`ProductionOrder.qt_id` は必ず設定され、1件のQTの指示書は最大1件です。",

  // the key of the notation in the drawing (erLayout.js)
  "Notation (crow's foot)": "表記（クロウズフット）",
  "exactly one": "必ず1",
  "zero or one": "0または1",
  "one or many": "1以上",
  "zero or many": "0以上",
  "no database key": "データベースのキーなし",
  "primary key": "主キー",
  "foreign key": "外部キー",
  unique: "一意",
  note: "注記",
  "note of the column": "列の注記",

  // DB Relations.md: the parts, their intros and the titles of their sections
  "Part 1: The base tables (the Mini ERP before Version 2.0)": "パート1：基本のテーブル（バージョン2.0より前の Mini ERP）",
  "Part 2: Added or changed in Version 2.0 (as built)": "パート2：バージョン2.0で追加・変更されたもの（実装済み）",
  "Table-by-table list of keys, relations and delete rules.": "テーブルごとのキー・リレーション・削除ルールの一覧です。",
  "The rows of QtReference, Material and User are changed by Part 2 below.": "QtReference、Material、User の行は下のパート2で変更されます。",
  "Keys, relations and rules after the Purchase, QT 2.0 and User 2.0 changes.": "購買・QT 2.0・User 2.0 の変更後のキー・リレーション・ルールです。",
  "Only the **new or changed** rows are listed; everything else stays as in Part 1.": "**新規または変更**の行だけを載せています。それ以外はパート1のとおりです。",
  "The order status is `Draft`, `In Progress`, `Completed` (computed; `Draft` replaces `New`).": "指示書のステータスは `Draft`・`In Progress`・`Completed` です（計算値。`Draft` が `New` に代わります）。",
  "An order is made only by Confirm QT.": "指示書は QT の確定でのみ作られます。",
  "Foreign keys": "外部キー",
  "Unique keys": "一意キー",
  "Lifecycle rules that touch several tables": "複数のテーブルにまたがるライフサイクルのルール",
  "Chain of one sale": "1件の販売の流れ",
  "New foreign keys": "新しい外部キー",
  "Changed columns": "変更された列",
  "Chain of the new flows": "新しい流れ",

  // DB Relations.md: the headers of the tables
  Table: "テーブル",
  Column: "列",
  References: "参照先",
  Cardinality: "多重度",
  "Delete rule": "削除ルール",
  Unique: "一意",
  Event: "イベント",
  "Tables written": "書き込むテーブル",
  Rule: "ルール",
  Change: "変更",

  // DB Relations.md: the cardinalities
  "many to one": "多対一",
  "many to one, optional": "多対一（任意）",
  "one to one": "一対一",
  "one to one, optional": "一対一（任意）",
  "many to one, **no database key**": "多対一（**データベースのキーなし**）",

  // DB Relations.md: the delete rules
  "customer in use -> `409 IN_USE`": "顧客が使用中なら `409 IN_USE`",
  "QT used by an order -> `409 IN_USE`": "指示書が使うQTなら `409 IN_USE`",
  "goes with the order": "指示書と一緒に削除",
  "product in use -> `409 IN_USE`": "製品が使用中なら `409 IN_USE`",
  "goes with the line": "明細と一緒に削除",
  "never deleted": "削除しない",
  "user with history -> `409 IN_USE`": "履歴のあるユーザーなら `409 IN_USE`",
  "goes with the product": "製品と一緒に削除",
  "material in a BOM -> `409 IN_USE`": "部品表にある材料なら `409 IN_USE`",
  "goes with the material": "材料と一緒に削除",
  "material with a non-initial change cannot be deleted": "初期在庫以外の変動がある材料は削除できない",
  "set when the start of an order deducts stock": "指示書の開始で在庫を引き落とすときに設定",
  "one invoice per order": "指示書1件に請求書1件",
  "goes with the invoice": "請求書と一緒に削除",
  "one full payment per invoice": "請求書1件に全額入金1件",
  "one receipt per invoice": "請求書1件に領収書1件",
  "goes with the supplier": "仕入先と一緒に削除",
  "material sold by a supplier -> `409 IN_USE`": "仕入先が販売する材料なら `409 IN_USE`",
  "supplier with a PO -> `409 IN_USE`": "POのある仕入先なら `409 IN_USE`",
  "goes with the PO; only a `Draft` PO can be deleted": "POと一緒に削除。削除できるのは `Draft` のPOだけ",
  "material on a PO -> `409 IN_USE`": "POにある材料なら `409 IN_USE`",
  "one payment per PO": "PO1件に支払い1件",
  "set when a PO is received": "POの入荷時に設定",
  "goes with the QT; only a `Draft` QT can be deleted": "QTと一緒に削除。削除できるのは `Draft` のQTだけ",
  "product on a QT -> `409 IN_USE`": "QTにある製品なら `409 IN_USE`",
  "set when the QT is confirmed": "QTの確定時に設定",
  "goes with the owner (service deletes the file too)": "持ち主と一緒に削除（サービスがファイルも削除）",

  // DB Relations.md: the cells with words among the names
  "PurchaseOrder, QtReference or ProductionOrder": "PurchaseOrder・QtReference・ProductionOrder のいずれか",
  "email (lower-cased)": "email（小文字で比較）",
  "order_number (`ORD-yyyy-0001`, given by the server)": "order_number（`ORD-yyyy-0001`、サーバーが採番）",
  "as before": "従来どおり",

  // DB Relations.md: the changed columns
  "adds `status` (`Draft`, `Confirmed`), `customer_po_number`, `customer_po_date`, `production_order_id`; drops `file_name`, `file_type`, `file_path` (moved to Attachment)":
    "`status`（`Draft`・`Confirmed`）、`customer_po_number`、`customer_po_date`、`production_order_id` を追加。`file_name`、`file_type`、`file_path` を削除（Attachment へ移動）",
  "adds `unit`": "`unit` を追加",
  "rule: `role = Worker` needs `department` in (`Sales`, `Factory`)": "ルール：`role = Worker` は `department` が（`Sales`・`Factory`）のいずれか",

  // DB Relations.md: the events and the rules that touch several tables
  "Start production (`POST /orders/:id/start`)": "製造開始（`POST /orders/:id/start`）",
  "Progress entry": "進捗の入力",
  "Issue invoice": "請求書の発行",
  "Pay invoice": "請求書の入金",
  "Manual stock change": "手動の在庫変動",
  "Create PO": "POの作成",
  "Edit PO": "POの編集",
  "Change PO status": "POのステータス変更",
  "Receive PO": "POの入荷",
  "Pay PO": "POの支払い",
  "Upload file": "ファイルのアップロード",
  "Confirm QT": "QTの確定",
  "Start production": "製造開始",
  "Deducts the BOM of every line, oldest lot first. `409 STOCK_SHORT` if a material is short. Locks products and processes":
    "全明細の部品表の分を古いロットから引き落とす。材料が足りなければ `409 STOCK_SHORT`。製品と工程を固定する",
  "Updates the status and completed quantity of the process. An order is Completed when all processes are": "工程のステータスと完了数を更新する。全工程が完了すると指示書は完了",
  "Only for a Completed order, once. Copies the data (snapshot). Locks the progress of the order": "完了した指示書に1回だけ。内容をコピーする（スナップショット）。指示書の進捗を固定する",
  "Payment date and amount must equal the total (`MUST_EQUAL_TOTAL`). Sets `Paid` and issues one receipt": "入金日と金額は合計と一致すること（`MUST_EQUAL_TOTAL`）。`Paid` にして領収書を1件発行する",
  "`Add`, `Deduct` or `Adjust` a lot at any time. The history is never changed or deleted": "ロットをいつでも `Add`・`Deduct`・`Adjust` できる。履歴は変更も削除もされない",
  "Status `Draft`. Only materials of the chosen supplier (`SupplierMaterial`) can be picked. Unit price starts from `SupplierMaterial.unit_price`, the user can change it. `total` = sum of line amounts":
    "ステータスは `Draft`。選んだ仕入先の材料（`SupplierMaterial`）だけを選べる。単価は `SupplierMaterial.unit_price` から始まり、変更できる。`total` = 明細金額の合計",
  "Lines change only in `Draft`": "明細を変更できるのは `Draft` のときだけ",
  "`Draft` -> `Sent` -> `Received`, one step forward, by hand": "`Draft` -> `Sent` -> `Received`、手動で1段階ずつ進む",
  "Adds each line to a lot as a stock change `Add` linked by `purchase_order_id`. **Once only**: a second `Received` does not add again":
    "各明細を `purchase_order_id` でつないだ在庫変動 `Add` としてロットに追加する。**1回だけ**：2回目の `Received` では追加しない",
  "Needs status `Received`. One payment per PO": "ステータス `Received` が必要。PO1件に支払い1件",
  "Kinds `PO_FILE`, `QUOTATION`, `EVIDENCE`, `OTHER`. PDF, PNG or JPG, up to 10 MB. A new `PO_FILE` replaces the old one":
    "種類は `PO_FILE`・`QUOTATION`・`EVIDENCE`・`OTHER`。PDF・PNG・JPG、10 MBまで。新しい `PO_FILE` は古いものと置き換わる",
  "Needs a customer and at least one line. Creates one Draft Factory Order from the QT lines. Once only. The customer PO file is attached to the order. Locks the QT lines":
    "顧客と1行以上の明細が必要。QTの明細から Draft の製造指示書を1件作る。1回だけ。顧客のPOファイルを指示書に添付する。QTの明細を固定する",
  Unchanged: "変更なし",
};

/** A text of the .md files in the language of the page: Japanese when there is one, else the text as it is. */
export const inLanguage = (text, language) => (String(language).startsWith("ja") ? (JA[text] ?? text) : text);
