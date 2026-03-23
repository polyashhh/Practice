import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.createHash("sha1").update(String(Date.now()) + Math.random()).digest("hex");
}
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}
async function readJson(filePath, fallback) {
  try {
    const s = await fs.readFile(filePath, "utf-8");
    return JSON.parse(s);
  } catch (e) {
    return fallback;
  }
}
async function writeJsonAtomic(filePath, data) {
  const tmp = filePath + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}
export class TinyDb {
  constructor(dir) {
    this.dir = dir;
    this.resourcesPath = path.join(dir, "digital_resources.json");
    this.logsPath = path.join(dir, "download_log.json");
  }
  async initWithSampleDataIfEmpty() {
    await ensureDir(this.dir);
    const resources = await readJson(this.resourcesPath, null);
    if (!Array.isArray(resources)) {
      const sample = [
        {
          _id: "dr_001",
          title: "Clean Code (ebook)",
          author: "Robert C. Martin",
          format: "pdf",
          fileSize: 5242880,
          tags: ["programming", "best-practices"],
          downloadCount: 0
        },
        {
          _id: "dr_002",
          title: "Мастер и Маргарита (аудиокнига)",
          author: "Булгаков Михаил Афанасьевич",
          format: "mp3",
          fileSize: 73400320,
          tags: ["classic", "audio"],
          downloadCount: 0
        },
        {
          _id: "dr_003",
          title: "Design Patterns (summary)",
          author: "Gang of Four",
          format: "epub",
          fileSize: 3145728,
          tags: ["architecture", "patterns"],
          downloadCount: 0
        }
      ];
      await writeJsonAtomic(this.resourcesPath, sample);
    }
    const logs = await readJson(this.logsPath, null);
    if (!Array.isArray(logs)) {
      await writeJsonAtomic(this.logsPath, []);
    }
  }
  async listResources() {
    return await readJson(this.resourcesPath, []);
  }
  async getResource(id) {
    const items = await this.listResources();
    return items.find((x) => x._id === id) || null;
  }
  async createResource(obj) {
    const items = await this.listResources();
    const id = obj._id || uuid();
    if (items.some((x) => x._id === id)) {
      throw new Error("Resource with same _id already exists");
    }
    const res = {
      _id: id,
      title: String(obj.title || ""),
      author: String(obj.author || ""),
      format: String(obj.format || ""),
      fileSize: Number(obj.fileSize || 0),
      tags: Array.isArray(obj.tags) ? obj.tags.map(String) : [],
      downloadCount: Number(obj.downloadCount || 0)
    };
    items.push(res);
    await writeJsonAtomic(this.resourcesPath, items);
    return res;
  }
  async updateResource(id, patch) {
    const items = await this.listResources();
    const idx = items.findIndex((x) => x._id === id);
    if (idx < 0) return null;
    const cur = items[idx];
    const next = {
      ...cur,
      ...(patch.title !== undefined ? { title: String(patch.title) } : {}),
      ...(patch.author !== undefined ? { author: String(patch.author) } : {}),
      ...(patch.format !== undefined ? { format: String(patch.format) } : {}),
      ...(patch.fileSize !== undefined ? { fileSize: Number(patch.fileSize) } : {}),
      ...(patch.tags !== undefined ? { tags: Array.isArray(patch.tags) ? patch.tags.map(String) : [] } : {})
    };
    items[idx] = next;
    await writeJsonAtomic(this.resourcesPath, items);
    return next;
  }
  async deleteResource(id) {
    const items = await this.listResources();
    const next = items.filter((x) => x._id !== id);
    const deleted = next.length !== items.length;
    if (deleted) await writeJsonAtomic(this.resourcesPath, next);
    return deleted;
  }
  async logDownload(resourceId, userId) {
    const resources = await this.listResources();
    const idx = resources.findIndex((x) => x._id === resourceId);
    if (idx < 0) return { ok: false, message: "Resource not found" };
    resources[idx].downloadCount = Number(resources[idx].downloadCount || 0) + 1;
    await writeJsonAtomic(this.resourcesPath, resources);
    const logs = await readJson(this.logsPath, []);
    const entry = {
      _id: uuid(),
      resourceId,
      userId: String(userId || "u_demo"),
      timestamp: new Date().toISOString()
    };
    logs.push(entry);
    await writeJsonAtomic(this.logsPath, logs);

    return { ok: true, entry, resource: resources[idx] };
  }
}