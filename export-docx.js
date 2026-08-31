/* Fill Resis-test.docx by string edits so Word can open the file. */

const IMG_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
const CM = 360000;

const PHOTO_SIZE = {
  tree: { wCm: 12.45, hCm: 16.6 },
  drill1: { wCm: 4.15, hCm: 5.53 },
  drill2: { wCm: 14.25, hCm: 10.69 },
};

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paraPlainText(pXml) {
  let out = "";
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  let m;
  while ((m = re.exec(pXml))) out += m[1];
  return out.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function mapParagraphs(xml, fn) {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (p) => {
    const next = fn(p, paraPlainText(p));
    return next == null ? p : next;
  });
}

function setParagraphPlainText(pXml, text) {
  const safe = escapeXml(text);
  if (/<w:t\b/.test(pXml)) {
    let first = true;
    return pXml.replace(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g, (run) => {
      if (first) {
        first = false;
        return run.replace(/>[\s\S]*<\/w:t>/, ">" + safe + "</w:t>");
      }
      return run.replace(/>[\s\S]*<\/w:t>/, "></w:t>");
    });
  }
  return pXml.replace(/<\/w:p>/, `<w:r><w:t>${safe}</w:t></w:r></w:p>`);
}

function stripHighlights(xml) {
  return xml
    .replace(/<w:highlight\b[^/]*\/>/g, "")
    .replace(/<w:highlight\b[^>]*>\s*<\/w:highlight>/g, "");
}

function nextRid(relsXml) {
  let max = 0;
  const re = /Id="rId(\d+)"/g;
  let m;
  while ((m = re.exec(relsXml))) max = Math.max(max, Number(m[1]));
  return "rId" + (max + 1);
}

function addRel(relsXml, rid, mediaName) {
  const tag = `<Relationship Id="${rid}" Type="${IMG_REL}" Target="media/${mediaName}"/>`;
  if (relsXml.includes("</Relationships>")) {
    return relsXml.replace("</Relationships>", tag + "</Relationships>");
  }
  return relsXml + tag;
}

function ensureJpegContentType(ctXml) {
  if (/Extension="jpeg"/.test(ctXml)) return ctXml;
  if (/Extension="png"/.test(ctXml)) {
    return ctXml.replace(
      '<Default Extension="png" ContentType="image/png"/>',
      '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>'
    );
  }
  return ctXml.replace(
    "<Types ",
    '<Types '
  ).replace(
    ">",
    '><Default Extension="jpeg" ContentType="image/jpeg"/>'
  );
}

function imageParagraph(rid, widthCm, heightCm, name) {
  const cx = Math.round(widthCm * CM);
  const cy = Math.round(heightCm * CM);
  const id = 2000 + Math.floor(Math.random() * 8000);
  return (
    `<w:p>` +
    `<w:pPr><w:jc w:val="center"/></w:pPr>` +
    `<w:r>` +
    `<w:rPr><w:noProof/></w:rPr>` +
    `<w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${id}" name="${escapeXml(name)}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="0" name="${escapeXml(name)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
  );
}

function lastIndexOfOpenTbl(xml, idx) {
  let pos = -1;
  const re = /<w:tbl(?=[\s>])/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m.index >= idx) break;
    pos = m.index;
  }
  return pos;
}

function extractTableContaining(xml, token) {
  const idx = xml.indexOf(token);
  if (idx < 0) return null;
  const start = lastIndexOfOpenTbl(xml, idx);
  const end = xml.indexOf("</w:tbl>", idx);
  if (start < 0 || end < 0 || end < start) return null;
  return { start, end: end + 8, xml: xml.slice(start, end + 8) };
}

function splitRows(tblXml) {
  return tblXml.match(/<w:tr(?=[\s>])[\s\S]*?<\/w:tr>/g) || [];
}

function splitCells(rowXml) {
  return rowXml.match(/<w:tc(?=[\s>])[\s\S]*?<\/w:tc>/g) || [];
}

function setCellText(cellXml, text) {
  const safe = escapeXml(text);
  if (/<w:t\b/.test(cellXml)) {
    let first = true;
    return cellXml.replace(/<w:t\b[^>]*>[\s\S]*?<\/w:t>/g, (run) => {
      if (first) {
        first = false;
        return run.replace(/>[\s\S]*<\/w:t>/, ">" + safe + "</w:t>");
      }
      return run.replace(/>[\s\S]*<\/w:t>/, "></w:t>");
    });
  }
  return cellXml.replace("</w:tc>", `<w:p><w:r><w:t>${safe}</w:t></w:r></w:p></w:tc>`);
}

function replaceRowCells(rowXml, valuesByIndex) {
  const cells = splitCells(rowXml);
  if (!cells.length) return rowXml;
  let out = rowXml;
  cells.forEach((cell, i) => {
    if (valuesByIndex[i] == null) return;
    const filled = setCellText(cell, valuesByIndex[i]);
    out = out.replace(cell, filled);
  });
  return out;
}

function heightToCm(drill) {
  if (!drill) return "";
  const raw = String(drill.height ?? "").trim();
  if (!raw) return "";
  const n = Number(raw);
  const unit = String(drill.unit || "cm").toLowerCase();
  if (Number.isNaN(n)) return raw;
  if (unit === "m") return String(Math.round(n * 1000) / 10);
  if (unit === "mm") return String(Math.round((n / 10) * 10) / 10);
  return raw;
}

function fillResistographyInfoTable(xml, drills) {
  const tbl = extractTableContaining(xml, "Height of drill");
  if (!tbl) return xml;
  const rows = splitRows(tbl.xml);
  if (rows.length < 2) return xml;
  const header = rows[0];
  const proto = rows[1];
  const built = [header];
  const count = Math.max(drills.length, rows.length - 1);
  for (let i = 0; i < count; i++) {
    const n = i + 1;
    let row = rows[i + 1] || proto;
    const drill = drills[i];
    row = replaceRowCells(row, {
      0: String(n),
      1: drill ? drill.headingLabel || "" : "",
      3: drill ? heightToCm(drill) : "",
    });
    built.push(row);
  }
  const firstTr = tbl.xml.indexOf(header);
  const lastTrEnd = tbl.xml.lastIndexOf("</w:tr>") + 7;
  const rebuilt = tbl.xml.slice(0, firstTr) + built.join("") + tbl.xml.slice(lastTrEnd);
  return xml.slice(0, tbl.start) + rebuilt + xml.slice(tbl.end);
}

function retargetTableXml(tblXml, fromN, toN) {
  const from = String(fromN);
  const to = String(toN);
  return tblXml
    .replaceAll(`@Drill ${from}_1`, `@Drill ${to}_1`)
    .replaceAll(`@Drilling ${from}_2`, `@Drilling ${to}_2`)
    .replaceAll(`@Drilling ${from}_3`, `@Drilling ${to}_3`)
    .replaceAll(`Drill ${from}`, `Drill ${to}`);
}

async function exportFilledDocx(payload) {
  if (typeof JSZip === "undefined") throw new Error("JSZip missing");
  const res = await fetch("./template/Resis-test.docx");
  if (!res.ok) throw new Error("Template not found");
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  let xml = await zip.file("word/document.xml").async("string");
  let rels = await zip.file("word/_rels/document.xml.rels").async("string");
  let types = await zip.file("[Content_Types].xml").async("string");

  xml = stripHighlights(xml);
  types = ensureJpegContentType(types);

  const treeId = payload.treeId || "";
  const species = payload.species || "";
  xml = mapParagraphs(xml, (p, text) => {
    const trimmed = text.replace(/\s+/g, "");
    if (trimmed === "@1" || text.includes("@1")) return setParagraphPlainText(p, text.replace("@1", treeId));
    if (trimmed === "@2" || text.includes("@2")) return setParagraphPlainText(p, text.replace("@2", species));
    return p;
  });

  function putImage(bytes, filename, wCm, hCm) {
    zip.file("word/media/" + filename, bytes);
    const rid = nextRid(rels);
    rels = addRel(rels, rid, filename);
    return imageParagraph(rid, wCm, hCm, filename);
  }

  if (payload.treePhoto && payload.treePhoto.bytes) {
    const para = putImage(payload.treePhoto.bytes, "field_tree.jpeg", PHOTO_SIZE.tree.wCm, PHOTO_SIZE.tree.hCm);
    xml = mapParagraphs(xml, (p, text) => (text.replace(/\s+/g, "") === "@3" || text.trim() === "@3" ? para : p));
  }

  const drills = payload.drills || [];
  xml = fillResistographyInfoTable(xml, drills);
  const proto = extractTableContaining(xml, "@Drill 1_1");
  const tbl2 = extractTableContaining(xml, "@Drill 2_1");

  if (proto && drills.length > 2) {
    let extra = "";
    for (let n = 3; n <= drills.length; n++) {
      extra += `<w:p><w:r><w:t></w:t></w:r></w:p>` + retargetTableXml(proto.xml, 1, n);
    }
    if (tbl2) xml = xml.slice(0, tbl2.end) + extra + xml.slice(tbl2.end);
    else xml = xml.replace("</w:body>", extra + "</w:body>");
  }

  function fillOneDrill(n, drill) {
    if (!drill) {
      xml = mapParagraphs(xml, (p, text) => {
        if (text.includes(`@Drill ${n}_1`)) return setParagraphPlainText(p, "");
        if (text.includes(`@Drilling ${n}_2`)) return setParagraphPlainText(p, "");
        if (text.includes(`@Drilling ${n}_3`)) return setParagraphPlainText(p, text.replace(`@Drilling ${n}_3`, ""));
        return p;
      });
      return;
    }
    const dir = drill.headingLabel || "";
    xml = mapParagraphs(xml, (p, text) => {
      if (text.includes(`@Drilling ${n}_3`)) {
        return setParagraphPlainText(p, text.replace(`@Drilling ${n}_3`, dir));
      }
      if (text.includes(`@Drill ${n}_1`) && drill.photo1 && drill.photo1.bytes) {
        return putImage(drill.photo1.bytes, `field_d${n}_1.jpeg`, PHOTO_SIZE.drill1.wCm, PHOTO_SIZE.drill1.hCm);
      }
      if (text.includes(`@Drilling ${n}_2`) && drill.photo2 && drill.photo2.bytes) {
        return putImage(drill.photo2.bytes, `field_d${n}_2.jpeg`, PHOTO_SIZE.drill2.wCm, PHOTO_SIZE.drill2.hCm);
      }
      return p;
    });
  }

  fillOneDrill(1, drills[0]);
  fillOneDrill(2, drills[1]);
  for (let n = 3; n <= drills.length; n++) fillOneDrill(n, drills[n - 1]);

  zip.file("word/document.xml", xml);
  zip.file("word/_rels/document.xml.rels", rels);
  zip.file("[Content_Types].xml", types);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    createFolders: false,
  });
  const a = document.createElement("a");
  const name = "resistograph-" + (payload.treeId || "tree").replace(/[^\w\-]+/g, "_") + ".docx";
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

window.exportFilledDocx = exportFilledDocx;
