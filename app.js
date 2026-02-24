const NS = {
  cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
  cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
};

const I18N = {
  en: {
    language: "Language",
    title: "Peppol Invoice Interpreter",
    subtitle: "Upload a UBL XML invoice and instantly view header data, parties, invoice lines, totals, and embedded PDF.",
    ublFile: "UBL XML file",
    interpret: "Interpret",
    hint: "Limit: 20 MB • Processed locally in your browser",
    header: "Header",
    invoiceId: "Invoice ID",
    issueDate: "Issue date",
    dueDate: "Due date",
    currency: "Currency",
    buyerReference: "Buyer reference",
    supplier: "Supplier",
    customer: "Customer",
    name: "Name",
    vat: "VAT",
    email: "Email",
    lines: "Lines",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit price",
    total: "Total",
    totals: "Totals",
    subtotal: "Subtotal",
    totalInclTax: "Total incl. tax",
    payable: "Payable",
    embeddedPdf: "Embedded PDF",
    openPdf: "Open PDF",
    downloadPdf: "Download PDF",
    noLines: "No invoice lines found.",
    fileTooLarge: "File too large (> 20 MB).",
    fileReadError: "Unable to read the file.",
    noXmlLoaded: "No XML file loaded.",
    xmlInvalid: "Invalid XML",
    unknownError: "Unknown error.",
  },
  fr: {
    language: "Langue",
    title: "Interpréteur de facture Peppol",
    subtitle: "Chargez une facture UBL XML et visualisez instantanément l'en-tête, les parties, les lignes, les totaux et le PDF embarqué.",
    ublFile: "Fichier XML UBL",
    interpret: "Interpréter",
    hint: "Limite: 20 MB • Traitement local dans le navigateur",
    header: "En-tête",
    invoiceId: "ID facture",
    issueDate: "Date d'émission",
    dueDate: "Date d'échéance",
    currency: "Devise",
    buyerReference: "Référence acheteur",
    supplier: "Fournisseur",
    customer: "Client",
    name: "Nom",
    vat: "TVA",
    email: "Email",
    lines: "Lignes",
    description: "Description",
    qty: "Qté",
    unitPrice: "PU",
    total: "Total",
    totals: "Totaux",
    subtotal: "HT",
    totalInclTax: "TTC",
    payable: "À payer",
    embeddedPdf: "PDF embarqué",
    openPdf: "Ouvrir le PDF",
    downloadPdf: "Télécharger le PDF",
    noLines: "Aucune ligne trouvée.",
    fileTooLarge: "Fichier trop gros (> 20 MB).",
    fileReadError: "Impossible de lire le fichier.",
    noXmlLoaded: "Aucun fichier XML chargé.",
    xmlInvalid: "XML invalide",
    unknownError: "Erreur inconnue.",
  },
  de: {
    language: "Sprache",
    title: "Peppol-Rechnungs-Interpreter",
    subtitle: "Laden Sie eine UBL-XML-Rechnung hoch und sehen Sie sofort Kopfzeile, Parteien, Positionen, Summen und eingebettetes PDF.",
    ublFile: "UBL-XML-Datei",
    interpret: "Auswerten",
    hint: "Limit: 20 MB • Lokal im Browser verarbeitet",
    header: "Kopfbereich",
    invoiceId: "Rechnungs-ID",
    issueDate: "Ausstellungsdatum",
    dueDate: "Fälligkeitsdatum",
    currency: "Währung",
    buyerReference: "Käuferreferenz",
    supplier: "Lieferant",
    customer: "Kunde",
    name: "Name",
    vat: "MwSt.",
    email: "E-Mail",
    lines: "Positionen",
    description: "Beschreibung",
    qty: "Menge",
    unitPrice: "Einzelpreis",
    total: "Gesamt",
    totals: "Summen",
    subtotal: "Netto",
    totalInclTax: "Brutto",
    payable: "Zahlbetrag",
    embeddedPdf: "Eingebettetes PDF",
    openPdf: "PDF öffnen",
    downloadPdf: "PDF herunterladen",
    noLines: "Keine Rechnungspositionen gefunden.",
    fileTooLarge: "Datei zu groß (> 20 MB).",
    fileReadError: "Datei konnte nicht gelesen werden.",
    noXmlLoaded: "Keine XML-Datei geladen.",
    xmlInvalid: "Ungültiges XML",
    unknownError: "Unbekannter Fehler.",
  },
};

const fileInput = document.getElementById("xmlFile");
const goBtn = document.getElementById("go");
const out = document.getElementById("out");
const errorBox = document.getElementById("errorBox");
const languageSelect = document.getElementById("languageSelect");

let loadedXmlStr = null;
let lastBlobUrl = null;
let currentLang = "en";

function t(key) {
  return I18N[currentLang][key] || I18N.en[key] || key;
}

function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.documentElement.lang = currentLang;
}

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
    throw new Error(`${t("xmlInvalid")}: ${err.textContent.slice(0, 200)}`);
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

  applyTranslations(tpl);

  tpl.querySelectorAll("[data-path]").forEach((el) => {
    el.textContent = valueByPath(invoice, el.dataset.path);
  });

  const rows = tpl.getElementById("lineRows");
  const lines = xmlDoc.getElementsByTagNameNS(NS.cac, "InvoiceLine");
  if (lines.length === 0) {
    rows.innerHTML = `<tr><td colspan="5">${t("noLines")}</td></tr>`;
  } else {
    for (const line of lines) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${valueByPath(line, "cbc:ID")}</td>
        <td>${valueByPath(line, "cac:Item/cbc:Name")}</td>
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

languageSelect.addEventListener("change", () => {
  currentLang = languageSelect.value;
  applyTranslations();
  if (loadedXmlStr) {
    try {
      renderInvoice(parseXml(loadedXmlStr));
    } catch {
      // keep current state if XML fails on live language switch
    }
  }
});

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
    setError(t("fileTooLarge"));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => {
    goBtn.disabled = true;
    setError(t("fileReadError"));
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
    if (!loadedXmlStr) throw new Error(t("noXmlLoaded"));
    const xmlDoc = parseXml(loadedXmlStr);
    renderInvoice(xmlDoc);
  } catch (error) {
    setError(error.message || t("unknownError"));
  }
});

applyTranslations();
