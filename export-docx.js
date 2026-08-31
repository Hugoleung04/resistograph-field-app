/* Fill the official Resis test.docx template and download it. */

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const IMG_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
const EMU = 914400;
const CM = 360000;

const PHOTO_SIZE = {
  tree: { wCm: 12.45, hCm: 16.6 },
  drill1: { wCm: 4.15, hCm: 5.53 },
  drill2: { wCm: 14.25, hCm: 10.69 },
};

function paraText(p) {
  return Array.from(p.getElementsByTagNameNS(W_NS, "t"))
    .map((t) => t.textContent || "")
    .join("");
}

function setParaText(p, text) {
  const ts = Array.from(p.getElementsByTagNameNS(W_NS, "t"));
  if (!ts.length) return;
  ts[0].textContent = text;
  for (let i = 1; i < ts.length; i++) ts[i].textContent = "";
}

function findParas(doc, pred) {
  return Array.from(doc.getElementsByTagNameNS(W_NS, "p")).filter((p) => pred(paraText(p)));
}

function replaceTokenInDoc(doc, token, replacement) {
  for (const p of findParas(doc, (t) => t.includes(token))) {
    setParaText(p, paraText(p).split(token).join(replacement));
  }
}

function nextRid(relsDoc) {
  let max = 0;
  Array.from(relsDoc.getElementsByTagNameNS(REL_NS, "Relationship")).forEach((rel) => {
    const m = String(rel.getAttribute("Id") || "").match(/^rId(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return "rId" + (max + 1);
}

function ensureJpegContentType(ctXml) {
  if (/Extension="jpeg"/.test(ctXml)) return ctXml;
  return ctXml.replace(
    "<Default Extension=\"png\" ContentType=\"image/png\"/>",
    "<Default Extension=\"png\" ContentType=\"image/png\"/><Default Extension=\"jpeg\" ContentType=\"image/jpeg\"/>"
  );
}

function addImageRel(relsDoc, rid, mediaName) {
  const rel = relsDoc.createElementNS(REL_NS, "Relationship");
  rel.setAttribute("Id", rid);
  rel.setAttribute("Type", IMG_REL);
  rel.setAttribute("Target", "media/" + mediaName);
  relsDoc.documentElement.appendChild(rel);
}

function drawingXml(rid, cx, cy, name) {
  return (
    `<w:r xmlns:w="${W_NS}" xmlns:r="${R_NS}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<w:rPr><w:noProof/></w:rPr>` +
    `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${Math.floor(Math.random() * 900000) + 1000}" name="${name}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>` +
    `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
  );
}

function insertImageInParagraph(doc, p, rid, photo, widthCm, heightCm, name) {
  const cx = Math.round(widthCm * CM);
  const cy = Math.round(heightCm * CM);
  const xml = drawingXml(rid, cx, cy, name);
  const imported = new DOMParser().parseFromString(
    `<w:p xmlns:w="${W_NS}">${xml}</w:p>`,
    "application/xml"
  );
  const run = imported.getElementsByTagNameNS(W_NS, "r")[0];
  if (!run) return;
  while (p.firstChild) p.removeChild(p.firstChild);
  let pPr = null;
  const pPrs = p.getElementsByTagNameNS(W_NS, "pPr");
  if (pPrs.length) pPr = pPrs[0];
  else {
    pPr = doc.createElementNS(W_NS, "pPr");
    p.insertBefore(pPr, p.firstChild);
  }
  const oldJc = pPr.getElementsByTagNameNS(W_NS, "jc");
  for (const el of Array.from(oldJc)) el.parentNode.removeChild(el);
  const jc = doc.createElementNS(W_NS, "jc");
  jc.setAttribute("w:val", "center");
  jc.setAttributeNS(W_NS, "val", "center");
  pPr.appendChild(jc);
  p.appendChild(doc.importNode(run, true));
}

function stripHighlights(doc) {
  Array.from(doc.getElementsByTagNameNS(W_NS, "highlight")).forEach((el) => {
    if (el.parentNode) el.parentNode.removeChild(el);
  });
}

function tableHasText(tbl, needle) {
  return paraText(tbl).includes
    ? Array.from(tbl.getElementsByTagNameNS(W_NS, "t"))
        .map((t) => t.textContent || "")
        .join("")
        .includes(needle)
    : false;
}

function fullTableText(tbl) {
  return Array.from(tbl.getElementsByTagNameNS(W_NS, "t"))
    .map((t) => t.textContent || "")
    .join("");
}

function findTableWith(doc, needle) {
  return Array.from(doc.getElementsByTagNameNS(W_NS, "tbl")).find((tbl) =>
    fullTableText(tbl).includes(needle)
  );
}

function drillTableHeader(tbl) {
  const rows = tbl.getElementsByTagNameNS(W_NS, "tr");
  if (!rows.length) return "";
  return paraText(rows[0]).replace(/\s+/g, " ").trim();
}

function findDrillResultTable(doc, n) {
  const exact = "Drill " + n;
  const token = "@Drill " + n + "_1";
  const tables = Array.from(doc.getElementsByTagNameNS(W_NS, "tbl"));
  return (
    tables.find((tbl) => drillTableHeader(tbl) === exact) ||
    tables.find((tbl) => fullTableText(tbl).includes(token))
  );
}

function lastDrillResultTable(doc) {
  const tables = Array.from(doc.getElementsByTagNameNS(W_NS, "tbl"));
  let last = null;
  for (const tbl of tables) {
    if (/^Drill\s+\d+$/.test(drillTableHeader(tbl)) || /@Drill\s+\d+_1/.test(fullTableText(tbl))) {
      last = tbl;
    }
  }
  return last;
}

function insertNodeAfter(ref, node) {
  if (!ref || !ref.parentNode) return;
  if (ref.nextSibling) ref.parentNode.insertBefore(node, ref.nextSibling);
  else ref.parentNode.appendChild(node);
}

function retargetClonePlaceholders(tbl, fromN, toN) {
  const from = String(fromN);
  const to = String(toN);
  const tokens = [
    [`@Drill ${from}_1`, `@Drill ${to}_1`],
    [`@Drilling ${from}_2`, `@Drilling ${to}_2`],
    [`@Drilling ${from}_3`, `@Drilling ${to}_3`],
    [`Drill ${from}`, `Drill ${to}`],
  ];
  for (const p of tbl.getElementsByTagNameNS(W_NS, "p")) {
    let text = paraText(p);
    let changed = false;
    for (const [a, b] of tokens) {
      if (text.includes(a)) {
        text = text.split(a).join(b);
        changed = true;
      }
    }
    if (changed) setParaText(p, text);
  }
}

function fillDrillTable(doc, zip, relsDoc, n, drill, counters) {
  const token1 = `@Drill ${n}_1`;
  const token2 = `@Drilling ${n}_2`;
  const token3 = `@Drilling ${n}_3`;
  const tbl = findDrillResultTable(doc, n) || findTableWith(doc, token1);
  if (!tbl) return;

  const dir = drill.headingLabel || "";
  for (const p of tbl.getElementsByTagNameNS(W_NS, "p")) {
    const t = paraText(p);
    if (t.includes(token3) || t.includes(`(@Drilling ${n}_3)`)) {
      setParaText(p, t.replace(token3, dir).replace(`(@Drilling ${n}_3)`, `(${dir})`));
    }
  }

  const p1 = Array.from(tbl.getElementsByTagNameNS(W_NS, "p")).find((p) => paraText(p).includes(token1));
  if (p1 && drill.photo1) {
    counters.img += 1;
    const name = `field_d${n}_1.jpeg`;
    zip.file("word/media/" + name, drill.photo1.bytes);
    const rid = nextRid(relsDoc);
    addImageRel(relsDoc, rid, name);
    insertImageInParagraph(doc, p1, rid, drill.photo1, PHOTO_SIZE.drill1.wCm, PHOTO_SIZE.drill1.hCm, name);
  }

  const p2 = Array.from(tbl.getElementsByTagNameNS(W_NS, "p")).find((p) => paraText(p).includes(token2));
  if (p2 && drill.photo2) {
    const name = `field_d${n}_2.jpeg`;
    zip.file("word/media/" + name, drill.photo2.bytes);
    const rid = nextRid(relsDoc);
    addImageRel(relsDoc, rid, name);
    insertImageInParagraph(doc, p2, rid, drill.photo2, PHOTO_SIZE.drill2.wCm, PHOTO_SIZE.drill2.hCm, name);
  }
}

async function exportFilledDocx(payload) {
  if (typeof JSZip === "undefined") throw new Error("JSZip missing");
  const res = await fetch("./template/Resis-test.docx");
  if (!res.ok) throw new Error("Template not found");
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const xml = await zip.file("word/document.xml").async("string");
  const relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const relsDoc = parser.parseFromString(relsXml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("document.xml parse failed");
  stripHighlights(doc);

  replaceTokenInDoc(doc, "@1", payload.treeId || "");
  replaceTokenInDoc(doc, "@2", payload.species || "");

  const p3 = findParas(doc, (t) => t.replace(/\s/g, "") === "@3" || t.trim() === "@3")[0];
  if (p3 && payload.treePhoto) {
    zip.file("word/media/field_tree.jpeg", payload.treePhoto.bytes);
    const rid = nextRid(relsDoc);
    addImageRel(relsDoc, rid, "field_tree.jpeg");
    insertImageInParagraph(doc, p3, rid, payload.treePhoto, PHOTO_SIZE.tree.wCm, PHOTO_SIZE.tree.hCm, "field_tree.jpeg");
  } else if (p3) {
    setParaText(p3, "");
  }

  const proto = findDrillResultTable(doc, 1) || findTableWith(doc, "@Drill 1_1");
  const protoClone = proto ? proto.cloneNode(true) : null;
  const body = doc.getElementsByTagNameNS(W_NS, "body")[0];

  const drills = payload.drills || [];
  const counters = { img: 20 };

  if (drills[0]) fillDrillTable(doc, zip, relsDoc, 1, drills[0], counters);
  if (drills[1]) fillDrillTable(doc, zip, relsDoc, 2, drills[1], counters);
  else {
    replaceTokenInDoc(doc, "@Drill 2_1", "");
    replaceTokenInDoc(doc, "@Drilling 2_2", "");
    replaceTokenInDoc(doc, "@Drilling 2_3", "");
  }

  if (protoClone && drills.length > 2) {
    let lastTbl = findDrillResultTable(doc, 2) || lastDrillResultTable(doc) || proto;
    for (let n = 3; n <= drills.length; n++) {
      const spacer = doc.createElementNS(W_NS, "p");
      const spacerRun = doc.createElementNS(W_NS, "r");
      const spacerText = doc.createElementNS(W_NS, "t");
      spacerText.textContent = "";
      spacerRun.appendChild(spacerText);
      spacer.appendChild(spacerRun);
      const clone = protoClone.cloneNode(true);
      retargetClonePlaceholders(clone, 1, n);
      insertNodeAfter(lastTbl, spacer);
      insertNodeAfter(spacer, clone);
      fillDrillTable(doc, zip, relsDoc, n, drills[n - 1], counters);
      lastTbl = clone;
    }
  }

  const outXml = new XMLSerializer().serializeToString(doc);
  const outRels = new XMLSerializer().serializeToString(relsDoc);
  zip.file("word/document.xml", outXml);
  zip.file("word/_rels/document.xml.rels", outRels);
  const ctFile = zip.file("[Content_Types].xml");
  if (ctFile) {
    const ctXml = await ctFile.async("string");
    zip.file("[Content_Types].xml", ensureJpegContentType(ctXml));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  const name = "resistograph-" + (payload.treeId || "tree").replace(/\s+/g, "_") + ".docx";
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

window.exportFilledDocx = exportFilledDocx;
