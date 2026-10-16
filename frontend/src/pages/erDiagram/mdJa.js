/**
 * The Japanese of the words of ER Diagram.md and DB Relations.md, for the page in Japanese: English text of the .md -> Japanese.
 * The names of the tables and columns, the values of a column ("Admin | Worker"), the error codes and the paths stay as they are
 * (they are the names of the database and of the API), so they are not here. The PDF is always English.
 * mdJa.test.js fails when a text of the .md has no Japanese here, or when a Japanese text is left over.
 */
export const JA = {
  // ER Diagram.md: the labels of the relationships
  has: "持つ",
  orders: "発注する",
  "origin of": "元になる",
  contains: "含む",
  "ordered as": "明細になる",
  "is made by": "工程で作られる",
  records: "記録される",
  writes: "入力する",
  needs: "必要とする",
  "used in": "使われる",
  "kept in": "保管される",
  history: "履歴",
  makes: "行う",
  "start deducts": "開始時に引き落とす",
  "billed by": "請求される",
  "paid by": "支払われる",
  "proved by": "証明される",

  // ER Diagram.md: the notes of the columns
  optional: "任意",
  "UK with material_id": "material_id と組で一意",
  "null until started": "開始まで null",
  snapshot: "スナップショット",

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

  // DB Relations.md: the unique keys with a detail
  "User.email (lower-cased)": "User.email（小文字で比較）",
  "ProductionOrder.order_number (`ORD-yyyy-0001`, given by the server)": "ProductionOrder.order_number（`ORD-yyyy-0001`、サーバーが採番）",

  // DB Relations.md: the rules that touch several tables (the event and the rule; the tables written are names)
  "Start production (`POST /orders/:id/start`)": "製造開始（`POST /orders/:id/start`）",
  "Progress entry": "進捗の入力",
  "Issue invoice": "請求書の発行",
  "Pay invoice": "請求書の入金",
  "Manual stock change": "手動の在庫変動",
  "Deducts the BOM of every line, oldest lot first. `409 STOCK_SHORT` if a material is short. Locks products and processes":
    "全明細の部品表の分を古いロットから引き落とす。材料が足りなければ `409 STOCK_SHORT`。製品と工程を固定する",
  "Updates the status and completed quantity of the process. An order is Completed when all processes are": "工程のステータスと完了数を更新する。全工程が完了すると指示書は完了",
  "Only for a Completed order, once. Copies the data (snapshot). Locks the progress of the order": "完了した指示書に1回だけ。内容をコピーする（スナップショット）。指示書の進捗を固定する",
  "Payment date and amount must equal the total (`MUST_EQUAL_TOTAL`). Sets `Paid` and issues one receipt": "入金日と金額は合計と一致すること（`MUST_EQUAL_TOTAL`）。`Paid` にして領収書を1件発行する",
  "`Add`, `Deduct` or `Adjust` a lot at any time. The history is never changed or deleted": "ロットをいつでも `Add`・`Deduct`・`Adjust` できる。履歴は変更も削除もされない",

  // the key of the notation in the drawing (erLayout.js)
  "Notation (crow's foot)": "表記（クロウズフット）",
  "exactly one": "必ず1",
  "zero or one": "0または1",
  "one or many": "1以上",
  "zero or many": "0以上",
  "primary key": "主キー",
  "foreign key": "外部キー",
  unique: "一意",
  note: "注記",
  "note of the column": "列の注記",
};

/** A text of the .md files in the language of the page: Japanese when there is one, else the text as it is. */
export const inLanguage = (text, language) => (String(language).startsWith("ja") ? (JA[text] ?? text) : text);
