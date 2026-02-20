const NS = {
  cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
  cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
};

const fileInput = document.getElementById("xmlFile");
const goBtn = document.getElementById("go");
const out = document.getElementById("out");
const errorBox = document.getElementById("errorBox");

let loadedXmlStr = null;
let lastBlobUrl = null;

function setError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function parseXml(str) {
  const doc = new DOMParser().parseFromString(str, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) {
    throw new Error(`XML invalide: ${err.textContent.slice(0, 200)}`);
  }
  return doc;
}

function getNodeByPath(root, path) {
  return path.split("/").reduce((node, part) => {
    if (!node) return null;
    const [prefix, localName] = part.split(":");
    return Array.from(node.children).find((child) => child.localName === localName && child.namespaceURI === NS[prefix]) ?? null;
  }, root);
}

function valueByPath(root, path) {
  return getNodeByPath(root, path)?.textContent?.trim() ?? "—";
}

function base64ToBytes(b64) {
  const cleaned = (b64 || "").replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function extractPdfFromUbl(xmlDoc) {
  const all = xmlDoc.getElementsByTagNameNS(NS.cbc, "EmbeddedDocumentBinaryObject");
  for (const node of all) {
    if (node.getAttribute("mimeCode") === "application/pdf") {
      return {
        filename: node.getAttribute("filename") || "document.pdf",
        b64: node.textContent || "",
      };
    }
  }
  return null;
}

function renderInvoice(xmlDoc) {
  out.innerHTML = "";
  const invoice = xmlDoc.documentElement;
  const tpl = document.getElementById("invoiceTemplate").content.cloneNode(true);

  tpl.querySelectorAll("[data-path]").forEach((el) => {
    el.textContent = valueByPath(invoice, el.dataset.path);
  });

  const rows = tpl.getElementById("lineRows");
  const lines = xmlDoc.getElementsByTagNameNS(NS.cac, "InvoiceLine");
  if (lines.length === 0) {
    rows.innerHTML = '<tr><td colspan="5">Aucune ligne trouvée.</td></tr>';
  } else {
    for (const line of lines) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${valueByPath(line, "cbc:ID")}</td>
        <td>${valueByPath(line, "cac:Item/cbc:Description")}</td>
        <td class="right">${valueByPath(line, "cbc:InvoicedQuantity")}</td>
        <td class="right">${valueByPath(line, "cac:Price/cbc:PriceAmount")}</td>
        <td class="right">${valueByPath(line, "cbc:LineExtensionAmount")}</td>
      `;
      rows.appendChild(tr);
    }
  }

  const pdf = extractPdfFromUbl(xmlDoc);
  if (pdf?.b64.trim()) {
    const bytes = base64ToBytes(pdf.b64);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);
    lastBlobUrl = blobUrl;

    const card = tpl.getElementById("pdfCard");
    card.hidden = false;
    tpl.getElementById("pdfName").textContent = pdf.filename;
    tpl.getElementById("pdfOpen").href = blobUrl;
    const dl = tpl.getElementById("pdfDownload");
    dl.href = blobUrl;
    dl.setAttribute("download", pdf.filename);
  }

  out.appendChild(tpl);
}

fileInput.addEventListener("change", () => {
  loadedXmlStr = null;
  out.innerHTML = "";
  clearError();
  const file = fileInput.files?.[0];
  if (!file) {
    goBtn.disabled = true;
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    goBtn.disabled = true;
    setError("Fichier trop gros (> 20 MB).");
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => {
    goBtn.disabled = true;
    setError("Impossible de lire le fichier.");
  };
  reader.onload = () => {
    loadedXmlStr = String(reader.result || "").trimStart();
    goBtn.disabled = loadedXmlStr.length === 0;
  };
  reader.readAsText(file, "UTF-8");
});

goBtn.addEventListener("click", () => {
  clearError();
  out.innerHTML = "";

  if (lastBlobUrl) {
    URL.revokeObjectURL(lastBlobUrl);
    lastBlobUrl = null;
  }

  try {
    if (!loadedXmlStr) throw new Error("Aucun fichier XML chargé.");
    const xmlDoc = parseXml(loadedXmlStr);
    renderInvoice(xmlDoc);
  } catch (error) {
    setError(error.message || "Erreur inconnue.");
  }
});
