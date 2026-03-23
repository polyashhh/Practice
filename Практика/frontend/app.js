const $ = (id) => document.getElementById(id);
const state = {
  apiBase: "http://127.0.0.1:3000",
  reportUrl: "http://127.0.0.1:8001/report.php?type=overdue"
};
function setMsg(el, text, kind) {
  if (!el) return;
  el.textContent = text || "";
  el.className = "msg" + (kind === "ok" ? " msg--ok" : kind === "err" ? " msg--err" : "");
  el.style.display = text ? "block" : "none";
}
function formatBytes(n) {
  const num = Number(n || 0);
  if (!num) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = num;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function badgeStatus(status) {
  const s = String(status || "");
  return `<span class="badge">${escapeHtml(s || "-")}</span>`;
}
async function apiGet(path) {
  const url = state.apiBase.replace(/\/$/, "") + path;
  const resp = await fetch(url, { method: "GET" });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.message || `HTTP ${resp.status}`);
  return data;
}
async function apiPost(path, body) {
  const url = state.apiBase.replace(/\/$/, "") + path;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.message || `HTTP ${resp.status}`);
  return data;
}
function initTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = {
    physical: $("tab-physical"),
    digital: $("tab-digital"),
    report: $("tab-report")
  };
  function openTab(name) {
    tabs.forEach(t => t.classList.toggle("tab--active", t.dataset.tab === name));
    Object.entries(panels).forEach(([k, el]) => { if (el) el.classList.toggle("panel--active", k === name); });
  }
  tabs.forEach(t => t.addEventListener("click", () => openTab(t.dataset.tab)));
  openTab("physical");
}
function loadConfig() {
  const savedApi = localStorage.getItem("hl_apiBase");
  const savedReport = localStorage.getItem("hl_reportUrl");
  if (savedApi) state.apiBase = savedApi;
  if (savedReport) state.reportUrl = savedReport;
  $("apiBase").value = state.apiBase;
  $("reportUrl").value = state.reportUrl;
  $("btnSaveConfig").addEventListener("click", () => {
    const v = String($("apiBase").value || "").trim();
    if (v) state.apiBase = v;
    localStorage.setItem("hl_apiBase", state.apiBase);
    const r = String($("reportUrl").value || "").trim();
    if (r) state.reportUrl = r;
    localStorage.setItem("hl_reportUrl", state.reportUrl);
    setMsg($("phyMsg"), "Настройки сохранены.", "ok");
    setTimeout(() => setMsg($("phyMsg"), "", ""), 1200);
  });
  $("btnReportOpen").addEventListener("click", () => {
    state.reportUrl = String($("reportUrl").value || "").trim() || state.reportUrl;
    localStorage.setItem("hl_reportUrl", state.reportUrl);
    $("reportFrame").src = state.reportUrl;
  });
  $("reportFrame").src = state.reportUrl;
}
function renderPhysicalRows(items) {
  const tbody = $("phyTbody");
  if (!tbody) return;
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;">Ничего не найдено</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(b => {
    const inv = escapeHtml(b.inventory_number || "");
    const title = escapeHtml(b.title || "");
    const author = escapeHtml(b.author || "");
    const year = escapeHtml(b.year || "");
    const location = escapeHtml(b.location || "");
    const status = String(b.status || "");
    const canLoan = status === "available";
    const btn = `<button class="btn btn--ghost" data-loan="${inv}" ${canLoan ? "" : "disabled"}>Выдать</button>`;
    return `<tr><td>${inv}</td><td>${title}</td><td>${author}</td><td>${year}</td><td>${location}</td><td>${badgeStatus(status)}</td><td>${btn}</td></tr>`;
  }).join("");
  tbody.querySelectorAll("[data-loan]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const inv = btn.getAttribute("data-loan");
      const reader = String($("phyReaderCard").value || "").trim();
      if (!reader) { setMsg($("phyMsg"), "Введите номер читательского билета.", "err"); return; }
      btn.disabled = true;
      try {
        const res = await apiPost("/api/physical/loan", { inventory_number: inv, reader_card: reader });
        const r = res.result || {};
        const ok = r.success === true || r.success === "true";
        setMsg($("phyMsg"), ok ? `Успешно: ${r.message || "книга выдана"}` : `Ошибка: ${r.message || "не удалось выдать"}`, ok ? "ok" : "err");
        $("btnPhySearch").click();
      } catch (e) { setMsg($("phyMsg"), `Ошибка: ${e.message}`, "err");
      } finally { btn.disabled = false; }
    });
  });
}
function initPhysical() {
  $("btnPhySearch").addEventListener("click", async () => {
    const inv = String($("phyInv").value || "").trim();
    const author = String($("phyAuthor").value || "").trim();
    setMsg($("phyMsg"), "", "");
    if (!inv && !author) { setMsg($("phyMsg"), "Введите инвентарный номер или автора.", "err"); return; }
    $("btnPhySearch").disabled = true;
    try {
      if (inv) {
        const data = await apiGet(`/api/physical/books?inventory_number=${encodeURIComponent(inv)}`);
        const b = data.book || {};
        if (!b.found) { renderPhysicalRows([]); setMsg($("phyMsg"), b.message || "Книга не найдена.", "err"); } 
        else { renderPhysicalRows([b]); setMsg($("phyMsg"), "Найдено: 1", "ok"); }
      } else {
        const data = await apiGet(`/api/physical/books?author=${encodeURIComponent(author)}`);
        const items = (data.items || []);
        renderPhysicalRows(items);
        setMsg($("phyMsg"), `Найдено: ${items.length}`, "ok");
      }
    } catch (e) { renderPhysicalRows([]); setMsg($("phyMsg"), `Ошибка: ${e.message}`, "err");
    } finally { $("btnPhySearch").disabled = false; }
  });
}
function renderDigitalRows(items) {
  const tbody = $("digTbody");
  if (!tbody) return;
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted" style="text-align:center;">Список пуст</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(r => {
    const id = escapeHtml(r._id || "");
    const title = escapeHtml(r.title || "");
    const author = escapeHtml(r.author || "");
    const format = escapeHtml(r.format || "");
    const size = formatBytes(r.fileSize);
    const tags = Array.isArray(r.tags) ? r.tags.map(escapeHtml).join(", ") : "";
    const dc = Number(r.downloadCount || 0);
    return `<tr><td>${id}</td><td>${title}</td><td>${author}</td><td>${format}</td><td>${escapeHtml(size)}</td><td>${escapeHtml(tags)}</td><td>${dc}</td><td><button class="btn btn--ghost" data-dl="${id}">Скачать</button></td></tr>`;
  }).join("");
  tbody.querySelectorAll("[data-dl]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-dl");
      const userId = String($("digUserId").value || "u_demo").trim() || "u_demo";
      btn.disabled = true;
      setMsg($("digMsg"), "", "");
      try {
        const res = await apiPost("/api/digital/download", { resourceId: id, userId });
        const url = res.downloadUrl || "";
        const title = (res.resource && res.resource.title) ? res.resource.title : id;
        setMsg($("digMsg"), `Скачивание зафиксировано: "${title}". Ссылка: ${url}`, "ok");
        $("btnDigitalLoad").click();
      } catch (e) { setMsg($("digMsg"), `Ошибка: ${e.message}`, "err");
      } finally { btn.disabled = false; }
    });
  });
}
function initDigital() {
  $("btnDigitalLoad").addEventListener("click", async () => {
    $("btnDigitalLoad").disabled = true;
    setMsg($("digMsg"), "", "");
    try {
      const data = await apiGet("/api/digital/resources");
      renderDigitalRows(data.items || []);
      setMsg($("digMsg"), `Загружено: ${(data.items || []).length}`, "ok");
    } catch (e) { renderDigitalRows([]); setMsg($("digMsg"), `Ошибка: ${e.message}`, "err");
    } finally { $("btnDigitalLoad").disabled = false; }
  });
}
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  loadConfig();
  initPhysical();
  initDigital();
});