/* Resistograph Field Record — offline-first inspection app */

const I18N = {
  en: {
    app: "Resistograph Field Record",
    inspections: "Inspections",
    newTree: "New tree inspection",
    noRecords: "No inspections yet. Start one in the field.",
    treeInfo: "Tree information",
    treeId: "Tree ID / tag",
    species: "Species",
    site: "Site / location",
    inspector: "Inspector",
    notes: "Notes",
    treePhotos: "Tree photos (at least 1)",
    addTreePhoto: "Take / add tree photo",
    gps: "Capture GPS",
    gpsOff: "No GPS yet",
    saveTree: "Save tree & continue",
    drills: "Drillings",
    addDrill: "Add drilling",
    noDrills: "No drillings yet.",
    height: "Height above ground",
    unit: "Unit",
    direction: "Drilling direction",
    captureDir: "Capture compass direction",
    recapture: "Recapture",
    manualDir: "Or type bearing (0–360°)",
    standHint: "Stand at the drill point and point the phone in the same direction the needle travels into the tree. Then tap capture.",
    enableCompass: "Enable compass",
    compassLive: "Compass live",
    compassNeedPerm: "Compass permission needed",
    compassUnavailable: "Compass not available — type the bearing",
    holdSteady: "Hold phone level, away from steel tools",
    photoA: "Photo 1 — drill position",
    photoB: "Photo 2 — printout / screen",
    takePhoto: "Take photo",
    replacePhoto: "Replace",
    saveDrill: "Save drilling",
    needHeight: "Enter height",
    needDir: "Capture or enter direction",
    need2photos: "Take 2 photos for this drilling",
    need1treePhoto: "Add at least 1 tree photo before export",
    back: "Back",
    open: "Open",
    delete: "Delete",
    export: "Export report",
    exportJson: "Backup JSON",
    print: "Print / PDF",
    captured: "Captured",
    magnetic: "Magnetic",
    toward: "Needle toward",
    from: "Entry from",
    date: "Date",
    drillsCount: "drillings",
    photos: "photos",
    saved: "Saved",
    deleted: "Deleted",
    confirmDelete: "Delete this inspection and its photos?",
    confirmDeleteDrill: "Delete this drilling?",
    reportTitle: "Resistograph inspection record",
    optionalNotes: "Drill notes (sound wood, decay, depth…)",
    lang: "中文",
    heading: "Heading",
    ready: "Ready",
    waiting: "Waiting for compass…",
    accuracy: "Keep the phone flat like a compass",
  },
  zh: {
    app: "阻力儀現場記錄",
    inspections: "檢查記錄",
    newTree: "新增樹木檢查",
    noRecords: "尚未有記錄。在現場開始一筆即可。",
    treeInfo: "樹木資料",
    treeId: "樹木編號 / 標籤",
    species: "樹種",
    site: "地點",
    inspector: "檢查員",
    notes: "備註",
    treePhotos: "樹木照片（至少 1 張）",
    addTreePhoto: "拍攝 / 加入樹木照片",
    gps: "擷取 GPS",
    gpsOff: "尚未有 GPS",
    saveTree: "儲存並繼續",
    drills: "鑽孔記錄",
    addDrill: "新增鑽孔",
    noDrills: "尚未有鑽孔。",
    height: "離地高度",
    unit: "單位",
    direction: "鑽孔方向",
    captureDir: "擷取指南針方向",
    recapture: "重新擷取",
    manualDir: "或手動輸入方位角（0–360°）",
    standHint: "站在鑽孔位置，將手機指向鑽針進入樹幹的方向，然後按擷取。",
    enableCompass: "開啟指南針",
    compassLive: "指南針運作中",
    compassNeedPerm: "需要指南針權限",
    compassUnavailable: "無法使用指南針 — 請手動輸入方位角",
    holdSteady: "手機保持水平，遠離鋼製工具",
    photoA: "照片 1 — 鑽孔位置",
    photoB: "照片 2 — 列印紙 / 螢幕",
    takePhoto: "拍照",
    replacePhoto: "更換",
    saveDrill: "儲存鑽孔",
    needHeight: "請輸入高度",
    needDir: "請擷取或輸入方向",
    need2photos: "此鑽孔需要 2 張照片",
    need1treePhoto: "匯出前請至少加入 1 張樹木照片",
    back: "返回",
    open: "開啟",
    delete: "刪除",
    export: "匯出報告",
    exportJson: "備份 JSON",
    print: "列印 / PDF",
    captured: "已擷取",
    magnetic: "磁方位",
    toward: "鑽針朝向",
    from: "進入面",
    date: "日期",
    drillsCount: "個鑽孔",
    photos: "張照片",
    saved: "已儲存",
    deleted: "已刪除",
    confirmDelete: "刪除此檢查及其照片？",
    confirmDeleteDrill: "刪除此鑽孔？",
    reportTitle: "阻力儀檢查記錄",
    optionalNotes: "鑽孔備註（健全材、腐朽、深度…）",
    lang: "EN",
    heading: "方位角",
    ready: "就緒",
    waiting: "等待指南針…",
    accuracy: "將手機平放如指南針",
  },
};

const DB_NAME = "resistograph-field";
const DB_VER = 1;
let db;
let lang = localStorage.getItem("rf-lang") || "en";
let currentTreeId = null;
let currentDrillId = null;
let liveHeading = null;
let compassWatching = false;
let orientationHandler = null;

function t(key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1800);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("trees")) d.createObjectStore("trees", { keyPath: "id" });
      if (!d.objectStoreNames.contains("photos")) d.createObjectStore("photos", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function putTree(tree) {
  const tx = db.transaction("trees", "readwrite");
  tx.objectStore("trees").put(tree);
  await txDone(tx);
}

async function getTree(id) {
  return new Promise((resolve, reject) => {
    const req = db.transaction("trees").objectStore("trees").get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function allTrees() {
  return new Promise((resolve, reject) => {
    const req = db.transaction("trees").objectStore("trees").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteTree(id) {
  const tree = await getTree(id);
  const photoIds = [];
  if (tree) {
    (tree.treePhotoIds || []).forEach((p) => photoIds.push(p));
    (tree.drills || []).forEach((d) => (d.photoIds || []).forEach((p) => photoIds.push(p)));
  }
  const tx = db.transaction(["trees", "photos"], "readwrite");
  tx.objectStore("trees").delete(id);
  photoIds.forEach((pid) => tx.objectStore("photos").delete(pid));
  await txDone(tx);
}

async function putPhoto(id, blob) {
  const tx = db.transaction("photos", "readwrite");
  tx.objectStore("photos").put({ id, blob, createdAt: Date.now() });
  await txDone(tx);
}

async function getPhoto(id) {
  return new Promise((resolve, reject) => {
    const req = db.transaction("photos").objectStore("photos").get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deletePhoto(id) {
  const tx = db.transaction("photos", "readwrite");
  tx.objectStore("photos").delete(id);
  await txDone(tx);
}

function cardinalFromDeg(deg) {
  if (deg == null || Number.isNaN(deg)) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[i];
}

function oppositeDeg(deg) {
  return (((deg + 180) % 360) + 360) % 360;
}

function formatHeading(deg) {
  if (deg == null || Number.isNaN(Number(deg))) return "—";
  const d = ((Number(deg) % 360) + 360) % 360;
  const from = cardinalFromDeg(oppositeDeg(d));
  const toward = cardinalFromDeg(d);
  return `${d.toFixed(0)}°  ${from} → ${toward}`;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  if (id !== "screen-drill") stopCompass();
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.getElementById("langBtn").textContent = t("lang");
  document.title = t("app");
}

function toggleLang() {
  lang = lang === "en" ? "zh" : "en";
  localStorage.setItem("rf-lang", lang);
  applyI18n();
  if (document.getElementById("screen-home").classList.contains("active")) renderHome();
  if (document.getElementById("screen-tree").classList.contains("active") && currentTreeId) openTree(currentTreeId);
}

/* ---------- Compass ---------- */

function headingFromEvent(ev) {
  if (typeof ev.webkitCompassHeading === "number" && !Number.isNaN(ev.webkitCompassHeading)) {
    return ev.webkitCompassHeading;
  }
  if (typeof ev.alpha === "number") {
    // Absolute orientation: 0 alpha ~ north on many Androids when absolute=true
    let heading = ev.absolute ? 360 - ev.alpha : 360 - ev.alpha;
    heading = ((heading % 360) + 360) % 360;
    return heading;
  }
  return null;
}

function onOrientation(ev) {
  const h = headingFromEvent(ev);
  if (h == null) return;
  liveHeading = h;
  const needle = document.getElementById("needle");
  if (needle) needle.style.transform = `translate(-50%, -50%) rotate(${h}deg)`;
  const degEl = document.getElementById("liveDeg");
  const cardEl = document.getElementById("liveCard");
  if (degEl) degEl.textContent = `${h.toFixed(0)}°`;
  if (cardEl) cardEl.textContent = formatHeading(h);
  const st = document.getElementById("compassStatus");
  if (st) {
    st.className = "status-pill";
    st.textContent = t("compassLive");
  }
}

async function startCompass() {
  const st = document.getElementById("compassStatus");
  try {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm !== "granted") {
        if (st) {
          st.className = "status-pill warn";
          st.textContent = t("compassNeedPerm");
        }
        return false;
      }
    }
    if (orientationHandler) {
      window.removeEventListener("deviceorientationabsolute", orientationHandler);
      window.removeEventListener("deviceorientation", orientationHandler);
    }
    orientationHandler = onOrientation;
    window.addEventListener("deviceorientationabsolute", orientationHandler, true);
    window.addEventListener("deviceorientation", orientationHandler, true);
    compassWatching = true;
    if (st) {
      st.className = "status-pill";
      st.textContent = t("waiting");
    }
    return true;
  } catch (err) {
    if (st) {
      st.className = "status-pill bad";
      st.textContent = t("compassUnavailable");
    }
    return false;
  }
}

function stopCompass() {
  if (orientationHandler) {
    window.removeEventListener("deviceorientationabsolute", orientationHandler);
    window.removeEventListener("deviceorientation", orientationHandler);
    orientationHandler = null;
  }
  compassWatching = false;
}

function captureHeading() {
  let deg = liveHeading;
  const manual = document.getElementById("manualHeading").value;
  if (deg == null && manual !== "") deg = Number(manual);
  if (deg == null || Number.isNaN(Number(deg))) {
    toast(t("needDir"));
    return;
  }
  deg = ((Number(deg) % 360) + 360) % 360;
  document.getElementById("capturedHeading").value = String(Math.round(deg * 10) / 10);
  document.getElementById("capturedLabel").textContent = `${t("captured")}: ${formatHeading(deg)}`;
  toast(`${t("captured")} ${formatHeading(deg)}`);
}

/* ---------- Photos ---------- */

function fileToJpegBlob(file, maxEdge = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error("compress failed"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

async function photoUrl(id) {
  const rec = await getPhoto(id);
  if (!rec || !rec.blob) return "";
  return URL.createObjectURL(rec.blob);
}

async function renderPhotoSlot(container, photoId, emptyLabel) {
  if (!photoId) {
    container.innerHTML = `<div class="empty">${emptyLabel}</div>`;
    container.classList.add("empty");
    return;
  }
  container.classList.remove("empty");
  const url = await photoUrl(photoId);
  container.innerHTML = `<img src="${url}" alt="">`;
}

/* ---------- Screens ---------- */

async function renderHome() {
  showScreen("screen-home");
  currentTreeId = null;
  currentDrillId = null;
  const list = document.getElementById("inspectionList");
  const trees = (await allTrees()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!trees.length) {
    list.innerHTML = `<div class="empty-state">${t("noRecords")}</div>`;
    return;
  }
  list.innerHTML = trees
    .map((tr) => {
      const drills = (tr.drills || []).length;
      const photos = (tr.treePhotoIds || []).length + (tr.drills || []).reduce((n, d) => n + (d.photoIds || []).filter(Boolean).length, 0);
      const when = tr.date || "";
      return `<div class="item" data-open="${tr.id}">
        <div class="title">${escapeHtml(tr.treeId || "—")} <span class="muted">· ${escapeHtml(tr.species || "")}</span></div>
        <div class="small muted">${escapeHtml(tr.site || "")} ${when ? "· " + escapeHtml(when) : ""}</div>
        <div style="margin-top:6px">
          <span class="badge">${drills} ${t("drillsCount")}</span>
          <span class="badge">${photos} ${t("photos")}</span>
        </div>
      </div>`;
    })
    .join("");
  list.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () => openTree(el.getAttribute("data-open")));
  });
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function newTree() {
  const tree = {
    id: uid(),
    treeId: "",
    species: "",
    site: "",
    inspector: localStorage.getItem("rf-inspector") || "",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
    gps: null,
    treePhotoIds: [],
    drills: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await putTree(tree);
  await openTree(tree.id);
}

async function openTree(id) {
  currentTreeId = id;
  currentDrillId = null;
  const tree = await getTree(id);
  if (!tree) return renderHome();
  showScreen("screen-tree");
  document.getElementById("f-treeId").value = tree.treeId || "";
  document.getElementById("f-species").value = tree.species || "";
  document.getElementById("f-site").value = tree.site || "";
  document.getElementById("f-inspector").value = tree.inspector || "";
  document.getElementById("f-date").value = tree.date || "";
  document.getElementById("f-notes").value = tree.notes || "";
  document.getElementById("gpsLabel").textContent = tree.gps
    ? `${tree.gps.lat.toFixed(6)}, ${tree.gps.lng.toFixed(6)}`
    : t("gpsOff");
  await renderTreePhotos(tree);
  renderDrillList(tree);
}

async function saveTreeFields() {
  const tree = await getTree(currentTreeId);
  if (!tree) return;
  tree.treeId = document.getElementById("f-treeId").value.trim();
  tree.species = document.getElementById("f-species").value.trim();
  tree.site = document.getElementById("f-site").value.trim();
  tree.inspector = document.getElementById("f-inspector").value.trim();
  tree.date = document.getElementById("f-date").value;
  tree.notes = document.getElementById("f-notes").value.trim();
  tree.updatedAt = Date.now();
  if (tree.inspector) localStorage.setItem("rf-inspector", tree.inspector);
  await putTree(tree);
}

async function renderTreePhotos(tree) {
  const wrap = document.getElementById("treePhotos");
  wrap.innerHTML = "";
  for (const pid of tree.treePhotoIds || []) {
    const slot = document.createElement("div");
    slot.className = "photo-slot";
    const url = await photoUrl(pid);
    slot.innerHTML = `<img src="${url}" alt=""><div class="cap">${t("treePhotos")}</div>`;
    slot.addEventListener("click", async () => {
      if (!confirm(t("delete") + "?")) return;
      tree.treePhotoIds = tree.treePhotoIds.filter((x) => x !== pid);
      await deletePhoto(pid);
      tree.updatedAt = Date.now();
      await putTree(tree);
      await renderTreePhotos(tree);
    });
    wrap.appendChild(slot);
  }
}

function renderDrillList(tree) {
  const list = document.getElementById("drillList");
  const drills = tree.drills || [];
  if (!drills.length) {
    list.innerHTML = `<div class="empty-state">${t("noDrills")}</div>`;
    return;
  }
  list.innerHTML = drills
    .map((d, i) => {
      const h = d.height ? `${d.height} ${d.unit || "m"}` : "—";
      const dir = formatHeading(d.heading);
      const ok = (d.photoIds || []).filter(Boolean).length >= 2 && d.heading != null && d.height;
      return `<div class="item" data-drill="${d.id}">
        <div class="title">#${i + 1} · ${escapeHtml(h)} · ${escapeHtml(dir)}</div>
        <div class="small muted">${ok ? t("ready") : "…"} · ${(d.photoIds || []).filter(Boolean).length}/2 ${t("photos")}</div>
      </div>`;
    })
    .join("");
  list.querySelectorAll("[data-drill]").forEach((el) => {
    el.addEventListener("click", () => openDrill(el.getAttribute("data-drill")));
  });
}

async function addDrill() {
  await saveTreeFields();
  const tree = await getTree(currentTreeId);
  const drill = {
    id: uid(),
    height: "",
    unit: "m",
    heading: null,
    photoIds: [null, null],
    notes: "",
    createdAt: Date.now(),
  };
  tree.drills = tree.drills || [];
  tree.drills.push(drill);
  tree.updatedAt = Date.now();
  await putTree(tree);
  await openDrill(drill.id);
}

async function openDrill(drillId) {
  currentDrillId = drillId;
  const tree = await getTree(currentTreeId);
  const drill = (tree.drills || []).find((d) => d.id === drillId);
  if (!drill) return openTree(currentTreeId);
  showScreen("screen-drill");
  document.getElementById("f-height").value = drill.height || "";
  document.getElementById("f-unit").value = drill.unit || "m";
  document.getElementById("f-drillNotes").value = drill.notes || "";
  document.getElementById("manualHeading").value = drill.heading != null ? String(drill.heading) : "";
  document.getElementById("capturedHeading").value = drill.heading != null ? String(drill.heading) : "";
  document.getElementById("capturedLabel").textContent =
    drill.heading != null ? `${t("captured")}: ${formatHeading(drill.heading)}` : t("direction");
  await renderDrillPhotos(drill);
  startCompass();
}

async function renderDrillPhotos(drill) {
  const a = document.getElementById("photoA");
  const b = document.getElementById("photoB");
  const ids = drill.photoIds || [null, null];
  if (ids[0]) {
    a.classList.remove("empty");
    a.innerHTML = `<img src="${await photoUrl(ids[0])}" alt=""><div class="cap">${t("photoA")}</div>`;
  } else {
    a.className = "photo-slot empty";
    a.innerHTML = `<div>${t("photoA")}</div>`;
  }
  if (ids[1]) {
    b.classList.remove("empty");
    b.innerHTML = `<img src="${await photoUrl(ids[1])}" alt=""><div class="cap">${t("photoB")}</div>`;
  } else {
    b.className = "photo-slot empty";
    b.innerHTML = `<div>${t("photoB")}</div>`;
  }
}

async function saveDrill() {
  const tree = await getTree(currentTreeId);
  const drill = (tree.drills || []).find((d) => d.id === currentDrillId);
  if (!drill) return;
  const height = document.getElementById("f-height").value.trim();
  const headingRaw = document.getElementById("capturedHeading").value || document.getElementById("manualHeading").value;
  const heading = headingRaw === "" ? null : Number(headingRaw);
  const photos = (drill.photoIds || []).filter(Boolean);
  if (!height) {
    toast(t("needHeight"));
    return false;
  }
  if (heading == null || Number.isNaN(heading)) {
    toast(t("needDir"));
    return false;
  }
  if (photos.length < 2) {
    toast(t("need2photos"));
    return false;
  }
  drill.height = height;
  drill.unit = document.getElementById("f-unit").value;
  drill.heading = ((heading % 360) + 360) % 360;
  drill.notes = document.getElementById("f-drillNotes").value.trim();
  tree.updatedAt = Date.now();
  await putTree(tree);
  toast(t("saved"));
  await openTree(currentTreeId);
  return true;
}

async function deleteCurrentDrill() {
  if (!confirm(t("confirmDeleteDrill"))) return;
  const tree = await getTree(currentTreeId);
  const drill = (tree.drills || []).find((d) => d.id === currentDrillId);
  if (drill) {
    for (const pid of (drill.photoIds || []).filter(Boolean)) await deletePhoto(pid);
  }
  tree.drills = (tree.drills || []).filter((d) => d.id !== currentDrillId);
  tree.updatedAt = Date.now();
  await putTree(tree);
  toast(t("deleted"));
  await openTree(currentTreeId);
}

async function handleTreePhoto(file) {
  if (!file) return;
  await saveTreeFields();
  const tree = await getTree(currentTreeId);
  const blob = await fileToJpegBlob(file);
  const id = uid();
  await putPhoto(id, blob);
  tree.treePhotoIds = tree.treePhotoIds || [];
  tree.treePhotoIds.push(id);
  tree.updatedAt = Date.now();
  await putTree(tree);
  await renderTreePhotos(tree);
}

async function handleDrillPhoto(slotIndex, file) {
  if (!file) return;
  const tree = await getTree(currentTreeId);
  const drill = (tree.drills || []).find((d) => d.id === currentDrillId);
  if (!drill) return;
  const blob = await fileToJpegBlob(file);
  const id = uid();
  const old = (drill.photoIds || [null, null])[slotIndex];
  if (old) await deletePhoto(old);
  await putPhoto(id, blob);
  drill.photoIds = drill.photoIds || [null, null];
  drill.photoIds[slotIndex] = id;
  tree.updatedAt = Date.now();
  await putTree(tree);
  await renderDrillPhotos(drill);
}

function captureGps() {
  if (!navigator.geolocation) {
    toast("GPS unavailable");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const tree = await getTree(currentTreeId);
      tree.gps = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        acc: pos.coords.accuracy,
      };
      tree.updatedAt = Date.now();
      await putTree(tree);
      document.getElementById("gpsLabel").textContent = `${tree.gps.lat.toFixed(6)}, ${tree.gps.lng.toFixed(6)}`;
      toast(t("saved"));
    },
    () => toast("GPS failed"),
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

async function deleteCurrentTree() {
  if (!confirm(t("confirmDelete"))) return;
  await deleteTree(currentTreeId);
  toast(t("deleted"));
  renderHome();
}

/* ---------- Export ---------- */

async function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

async function exportReport() {
  await saveTreeFields();
  const tree = await getTree(currentTreeId);
  if (!tree.treePhotoIds || !tree.treePhotoIds.length) {
    toast(t("need1treePhoto"));
    return;
  }
  const treeImgs = [];
  for (const pid of tree.treePhotoIds) {
    const rec = await getPhoto(pid);
    if (rec) treeImgs.push(await blobToDataUrl(rec.blob));
  }
  const drillBlocks = [];
  for (let i = 0; i < (tree.drills || []).length; i++) {
    const d = tree.drills[i];
    const imgs = [];
    for (const pid of (d.photoIds || []).filter(Boolean)) {
      const rec = await getPhoto(pid);
      if (rec) imgs.push(await blobToDataUrl(rec.blob));
    }
    drillBlocks.push({ d, imgs, i });
  }

  const html = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8">
<title>${escapeHtml(t("reportTitle"))} — ${escapeHtml(tree.treeId || "")}</title>
<style>
  body{font-family:Segoe UI,PingFang HK,Noto Sans TC,sans-serif;margin:24px;color:#122;}
  h1{margin:0 0 8px;font-size:22px}
  .meta{color:#445;margin-bottom:16px}
  table{border-collapse:collapse;width:100%;margin:12px 0}
  th,td{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top}
  th{background:#e8f5ee}
  img{max-width:320px;max-height:240px;margin:6px 6px 6px 0;border:1px solid #ddd}
  .sec{page-break-inside:avoid;margin:18px 0;padding-top:8px;border-top:2px solid #1b4332}
</style></head><body>
<h1>${escapeHtml(t("reportTitle"))}</h1>
<div class="meta">
  <div><b>${t("treeId")}:</b> ${escapeHtml(tree.treeId || "—")} &nbsp; <b>${t("species")}:</b> ${escapeHtml(tree.species || "—")}</div>
  <div><b>${t("site")}:</b> ${escapeHtml(tree.site || "—")} &nbsp; <b>${t("date")}:</b> ${escapeHtml(tree.date || "—")}</div>
  <div><b>${t("inspector")}:</b> ${escapeHtml(tree.inspector || "—")}
    ${tree.gps ? `&nbsp; <b>GPS:</b> ${tree.gps.lat.toFixed(6)}, ${tree.gps.lng.toFixed(6)}` : ""}
  </div>
  ${tree.notes ? `<div><b>${t("notes")}:</b> ${escapeHtml(tree.notes)}</div>` : ""}
</div>
<div class="sec">
  <h2>${t("treePhotos")}</h2>
  ${treeImgs.map((src) => `<img src="${src}" alt="tree">`).join("")}
</div>
<div class="sec">
  <h2>${t("drills")}</h2>
  <table>
    <tr><th>#</th><th>${t("height")}</th><th>${t("direction")}</th><th>${t("from")} → ${t("toward")}</th><th>${t("notes")}</th></tr>
    ${drillBlocks
      .map(({ d, i }) => {
        const deg = d.heading;
        const from = deg != null ? cardinalFromDeg(oppositeDeg(deg)) : "—";
        const toward = deg != null ? cardinalFromDeg(deg) : "—";
        return `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(d.height || "—")} ${escapeHtml(d.unit || "")}</td>
          <td>${deg != null ? Math.round(deg) + "° magnetic" : "—"}</td>
          <td>${from} → ${toward}</td>
          <td>${escapeHtml(d.notes || "")}</td>
        </tr>`;
      })
      .join("")}
  </table>
</div>
${drillBlocks
  .map(
    ({ d, imgs, i }) => `<div class="sec">
      <h3>#${i + 1} — ${escapeHtml(d.height || "")} ${escapeHtml(d.unit || "")} — ${escapeHtml(formatHeading(d.heading))}</h3>
      ${imgs.map((src) => `<img src="${src}" alt="drill">`).join("")}
      ${d.notes ? `<p>${escapeHtml(d.notes)}</p>` : ""}
    </div>`
  )
  .join("")}
<p style="color:#667;font-size:12px">Generated by Resistograph Field Record · headings are magnetic unless noted</p>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `resistograph-${(tree.treeId || "tree").replace(/\s+/g, "_")}-${tree.date || "record"}.html`;
  a.click();
}

async function exportJson() {
  await saveTreeFields();
  const tree = await getTree(currentTreeId);
  const photos = {};
  const collect = async (id) => {
    if (!id || photos[id]) return;
    const rec = await getPhoto(id);
    if (rec) photos[id] = await blobToDataUrl(rec.blob);
  };
  for (const id of tree.treePhotoIds || []) await collect(id);
  for (const d of tree.drills || []) for (const id of d.photoIds || []) await collect(id);
  const payload = { app: "resistograph-field-record", version: 1, exportedAt: new Date().toISOString(), tree, photos };
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `resistograph-${(tree.treeId || "tree").replace(/\s+/g, "_")}.json`;
  a.click();
}

/* ---------- Wire up ---------- */

async function init() {
  db = await openDb();
  applyI18n();
  document.getElementById("langBtn").addEventListener("click", toggleLang);
  document.getElementById("btnNew").addEventListener("click", newTree);
  document.getElementById("btnBackHome").addEventListener("click", async () => {
    await saveTreeFields();
    renderHome();
  });
  document.getElementById("btnBackTree").addEventListener("click", async () => {
    const tree = await getTree(currentTreeId);
    const drill = (tree.drills || []).find((d) => d.id === currentDrillId);
    // allow leaving even if incomplete
    if (drill) {
      drill.height = document.getElementById("f-height").value.trim();
      drill.unit = document.getElementById("f-unit").value;
      drill.notes = document.getElementById("f-drillNotes").value.trim();
      const raw = document.getElementById("capturedHeading").value || document.getElementById("manualHeading").value;
      if (raw !== "" && !Number.isNaN(Number(raw))) drill.heading = Number(raw);
      tree.updatedAt = Date.now();
      await putTree(tree);
    }
    await openTree(currentTreeId);
  });
  document.getElementById("btnSaveTree").addEventListener("click", async () => {
    await saveTreeFields();
    toast(t("saved"));
  });
  document.getElementById("btnAddDrill").addEventListener("click", addDrill);
  document.getElementById("btnGps").addEventListener("click", captureGps);
  document.getElementById("btnDeleteTree").addEventListener("click", deleteCurrentTree);
  document.getElementById("btnExport").addEventListener("click", exportReport);
  document.getElementById("btnJson").addEventListener("click", exportJson);
  document.getElementById("btnEnableCompass").addEventListener("click", startCompass);
  document.getElementById("btnCaptureHeading").addEventListener("click", captureHeading);
  document.getElementById("manualHeading").addEventListener("change", (e) => {
    const v = Number(e.target.value);
    if (!Number.isNaN(v)) {
      document.getElementById("capturedHeading").value = String(((v % 360) + 360) % 360);
      document.getElementById("capturedLabel").textContent = `${t("captured")}: ${formatHeading(v)}`;
    }
  });
  document.getElementById("btnSaveDrill").addEventListener("click", saveDrill);
  document.getElementById("btnDeleteDrill").addEventListener("click", deleteCurrentDrill);

  document.getElementById("fileTreePhoto").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) await handleTreePhoto(f);
  });
  document.getElementById("filePhotoA").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) await handleDrillPhoto(0, f);
  });
  document.getElementById("filePhotoB").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) await handleDrillPhoto(1, f);
  });
  document.getElementById("btnTreePhoto").addEventListener("click", () => document.getElementById("fileTreePhoto").click());
  document.getElementById("btnPhotoA").addEventListener("click", () => document.getElementById("filePhotoA").click());
  document.getElementById("btnPhotoB").addEventListener("click", () => document.getElementById("filePhotoB").click());

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  await renderHome();
}

document.addEventListener("DOMContentLoaded", init);
