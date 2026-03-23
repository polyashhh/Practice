import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { loadConfig } from "./config.js";
import { TinyDb } from "./tinydb.js";
import {
  createSoapClient,
  soapGetBookByInventory,
  soapRegisterLoan,
  soapReturnBook,
  soapSearchBooksByAuthor
} from "./soap.js";
import { parseBookXml, parseBookListXml, parseOverdueReportXml } from "./xml.js";
dotenv.config();
const cfg = loadConfig();
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
const db = new TinyDb(cfg.tinydbDir);
let soapClient = null;
async function ensureSoapClient() {
  if (soapClient) return soapClient;
  soapClient = await createSoapClient(cfg.soapWsdlUrl, cfg.soapEndpointUrl);
  return soapClient;
}
async function startupCheck() {
  try {
    await db.initWithSampleDataIfEmpty();
    const client = await ensureSoapClient();
    const xml = await soapGetBookByInventory(client, cfg.soapTestInventory);
    await parseBookXml(xml);
    console.log("[OK] SOAP server доступен, тест прошёл:", cfg.soapTestInventory);
  } catch (e) {
    console.log("[WARN] SOAP server недоступен или ошибка теста:", e.message);
  }
}
app.get("/api/health", async (req, res) => {
  res.json({ ok: true });
});
app.get("/api/physical/books", async (req, res) => {
  try {
    const inv = String(req.query.inventory_number || "").trim();
    const author = String(req.query.author || "").trim();
    if (!inv && !author) {
      return res.status(400).json({
        ok: false,
        message: "Укажите inventory_number или author"
      });
    }
    const client = await ensureSoapClient();

    if (inv) {
      const xml = await soapGetBookByInventory(client, inv);
      const book = await parseBookXml(xml);
      return res.json({ ok: true, mode: "inventory_number", book });
    }
    const xml = await soapSearchBooksByAuthor(client, author);
    const list = await parseBookListXml(xml);
    return res.json({ ok: true, mode: "author", ...list });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
});
app.post("/api/physical/loan", async (req, res) => {
  try {
    const inv = String(req.body.inventory_number || "").trim();
    const rc = String(req.body.reader_card || "").trim();

    if (!inv || !rc) {
      return res.status(400).json({ ok: false, message: "Нужны inventory_number и reader_card" });
    }

    const client = await ensureSoapClient();
    const result = await soapRegisterLoan(client, inv, rc);

    return res.json({ ok: true, result });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
});
app.post("/api/physical/return", async (req, res) => {
  try {
    const inv = String(req.body.inventory_number || "").trim();
    if (!inv) return res.status(400).json({ ok: false, message: "Нужен inventory_number" });

    const client = await ensureSoapClient();
    const result = await soapReturnBook(client, inv);

    return res.json({ ok: true, result });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
});
app.get("/api/digital/resources", async (req, res) => {
  try {
    const items = await db.listResources();
    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});
app.get("/api/digital/resources/:id", async (req, res) => {
  try {
    const item = await db.getResource(req.params.id);
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, item });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});
app.post("/api/digital/resources", async (req, res) => {
  try {
    const created = await db.createResource(req.body || {});
    res.status(201).json({ ok: true, item: created });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});
app.put("/api/digital/resources/:id", async (req, res) => {
  try {
    const updated = await db.updateResource(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, item: updated });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});
app.delete("/api/digital/resources/:id", async (req, res) => {
  try {
    const deleted = await db.deleteResource(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});
app.post("/api/digital/download", async (req, res) => {
  try {
    const resourceId = String(req.body.resourceId || "").trim();
    const userId = String(req.body.userId || "u_demo").trim();

    if (!resourceId) return res.status(400).json({ ok: false, message: "Нужен resourceId" });

    const r = await db.logDownload(resourceId, userId);
    if (!r.ok) return res.status(404).json({ ok: false, message: r.message });

    const fakeUrl = `/download/${encodeURIComponent(resourceId)}`;

    res.json({
      ok: true,
      downloadUrl: fakeUrl,
      resource: r.resource,
      log: r.entry
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});
app.get("/api/internal/overdue-report", async (req, res) => {
  try {
    const url = cfg.legacyReportXmlUrl;
    const resp = await axios.get(url, { timeout: 15000, responseType: "text" });

    const parsed = await parseOverdueReportXml(resp.data);
    res.json({ ok: true, ...parsed });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});
startupCheck().finally(() => {
  app.listen(cfg.port, () => {
    console.log(`Node gateway started: http://127.0.0.1:${cfg.port}`);
  });
});