import { parseStringPromise } from "xml2js";
function pickText(v) {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return pickText(v[0]);
  if (typeof v === "object") return "";
  return String(v);
}
export async function parseBookXml(xml) {
  const obj = await parseStringPromise(xml, { explicitArray: true, attrkey: "$" });
  const book = obj.book || {};
  const attrs = book.$ || {};

  const found = String(attrs.found || "false") === "true";

  const out = {
    found,
    inventory_number: pickText(book.inventory_number),
    id: pickText(book.id),
    title: pickText(book.title),
    author: pickText(book.author),
    year: pickText(book.year),
    location: pickText(book.location),
    status: pickText(book.status),
    message: pickText(book.message)
  };

  return out;
}
export async function parseBookListXml(xml) {
  const obj = await parseStringPromise(xml, { explicitArray: true, attrkey: "$" });
  const books = obj.books || {};
  const attrs = books.$ || {};

  const items = (books.book || []).map((b) => ({
    id: pickText(b.id),
    inventory_number: pickText(b.inventory_number),
    title: pickText(b.title),
    author: pickText(b.author),
    year: pickText(b.year),
    location: pickText(b.location),
    status: pickText(b.status)
  }));

  return {
    authorQuery: String(attrs.authorQuery || ""),
    count: Number(attrs.count || items.length),
    items
  };
}
export async function parseOverdueReportXml(xml) {
  const obj = await parseStringPromise(xml, { explicitArray: true, attrkey: "$" });
  const report = obj.report || {};
  const attrs = report.$ || {};
  const summary = report.summary ? report.summary[0] : {};
  const itemsNode = report.items ? report.items[0] : {};
  const itemList = (itemsNode.item || []).map((it) => ({
    loan_id: pickText(it.loan_id),
    inventory_number: pickText(it.inventory_number),
    title: pickText(it.title),
    author: pickText(it.author),
    year: pickText(it.year),
    location: pickText(it.location),
    reader_card: pickText(it.reader_card),
    date_taken: pickText(it.date_taken),
    due_date: pickText(it.due_date),
    days_overdue: Number(pickText(it.days_overdue) || 0),
    days_since_taken: Number(pickText(it.days_since_taken) || 0)
  }));
  return {
    meta: {
      type: String(attrs.type || ""),
      generated_at: String(attrs.generated_at || ""),
      allowed_days: Number(attrs.allowed_days || 0)
    },
    summary: {
      total_overdue: Number(pickText(summary.total_overdue) || itemList.length)
    },
    items: itemList
  };
}