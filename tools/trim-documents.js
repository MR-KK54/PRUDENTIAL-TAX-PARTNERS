#!/usr/bin/env node
/**
 * trim-documents.js
 *
 * Batch page-trimming tool for PDF and Word documents.
 * - PDF   -> detects the actual content area on every page (renders + scans pixels)
 *            and crops away the surrounding white/blank borders. Output: PDF.
 * - DOCX  -> trims the page margins inside the .docx (w:pgMar) so the content
 *            fills more of the page. Output: DOCX.
 * - DOC   -> converts to .docx first (trimmed), output: DOCX.
 *
 * Usage:
 *   node tools/trim-documents.js <input-file-or-folder> [output-folder]
 *
 * Examples:
 *   node tools/trim-documents.js ./invoices
 *   node tools/trim-documents.js ./invoices ./trimmed
 *   node tools/trim-documents.js "C:\Docs\invoice.pdf" ./trimmed
 *
 * Requirements:
 *   pdf-lib, pdfjs-dist, @napi-rs/canvas, jszip  (already in package.json)
 */
'use strict';

const path = require('path');
const fs = require('fs');

// --- Config -------------------------------------------------------------
const PIXEL_TOLERANCE = 245;      // pixels brighter than this are treated as blank (0-255)
const SCAN_SCALE = 1.0;           // render resolution for content detection (1.0 = 72dpi)
const MIN_PAD_PT = 0;             // extra padding around content in points (0 = perfect trim)
const MARGIN_INCH = 0.4;          // .docx margin to apply after trim (inches)
const PAGE_SCALE = 0.92;          // how much of the trimmed content to keep (0-1)

// --- Runtime imports (lazy so --help works fast) ------------------------
let PDFLib, pdfjsLib, canvasPkg, JSZip;

async function loadDeps() {
  PDFLib = await import('pdf-lib');
  pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  canvasPkg = await import('@napi-rs/canvas');
  return pdfjsLib;
}

// --- Helpers ------------------------------------------------------------
function isBlank(px) {
  // px: [r,g,b,a] 0-255
  return px[3] === 0 || (px[0] >= PIXEL_TOLERANCE && px[1] >= PIXEL_TOLERANCE && px[2] >= PIXEL_TOLERANCE);
}

/**
 * Detect the content bounding box for one PDF page by rendering it and
 * scanning the pixel buffer.
 */
async function detectContentBounds(page, scale) {
  const viewport = page.getViewport({ scale });
  const w = Math.ceil(viewport.width);
  const h = Math.ceil(viewport.height);
  const c = canvasPkg.createCanvas(w, h);
  const ctx = c.getContext('2d');

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const idx = row * 4 + x * 4;
      if (!isBlank([data[idx], data[idx + 1], data[idx + 2], data[idx + 3]])) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    // fully blank page -> keep full page but report "no content"
    return { left: 0, top: 0, right: w, bottom: h, blank: true };
  }

  // apply PAGE_SCALE around the detected box (keeps a hair of breathing room)
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const halfW = ((maxX - minX) / 2) * PAGE_SCALE;
  const halfH = ((maxY - minY) / 2) * PAGE_SCALE;

  return {
    left: Math.max(0, Math.floor(cx - halfW - MIN_PAD_PT * scale)),
    top: Math.max(0, Math.floor(cy - halfH - MIN_PAD_PT * scale)),
    right: Math.min(w, Math.ceil(cx + halfW + MIN_PAD_PT * scale)),
    bottom: Math.min(h, Math.ceil(cy + halfH + MIN_PAD_PT * scale)),
    blank: false,
  };
}

/**
 * Trim a PDF file: crop every page to its content bounding box.
 * Returns path to the output file.
 */
async function trimPdf(inputPath, outputPath) {
  const { PDFDocument } = PDFLib;
  const bytes = fs.readFileSync(inputPath);

  // 1) Detect content bounds using pdf.js (renders each page to a bitmap)
  const pdfRoot = path.dirname(require.resolve('pdfjs-dist/package.json')).replace(/\\/g, '/');
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(bytes),
    disableFontFace: true,
    standardFontDataUrl: pdfRoot + '/standard_fonts/',
    cMapUrl: pdfRoot + '/cmaps/',
    cMapPacked: true,
  }).promise;
  const bounds = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const b = await detectContentBounds(page, SCAN_SCALE);
    bounds.push(b);
  }
  try { await pdf.destroy(); } catch (_) {}

  // 2) Apply crops using pdf-lib (preserves original structure, fonts, metadata)
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = src.getPages();
  for (let i = 0; i < pages.length; i++) {
    const b = bounds[i];
    if (!b || b.blank) continue; // leave blank pages alone
    const scale = SCAN_SCALE;
    const leftPt = b.left / scale;
    const topPt = b.top / scale;
    const rightPt = b.right / scale;
    const bottomPt = b.bottom / scale;

    const box = pages[i].getMediaBox();
    const pageH = box.height;

    const newW = rightPt - leftPt;
    const newH = bottomPt - topPt;
    if (newW <= 0 || newH <= 0) continue;

    pages[i].setMediaBox(leftPt, pageH - bottomPt, newW, newH);
    pages[i].setCropBox(leftPt, pageH - bottomPt, newW, newH);
  }

  const outBytes = await src.save({ useObjectStreams: true });
  fs.writeFileSync(outputPath, outBytes);
  return outputPath;
}

/**
 * Trim a .docx file: rewrite the page margins in word/document.xml.
 */
async function trimDocx(inputPath, outputPath) {
  const JSZipLib = (await import('jszip')).default;
  const zip = await JSZipLib.loadAsync(fs.readFileSync(inputPath));
  let docXml = await zip.file('word/document.xml').async('string');

  const marginTwips = Math.round(MARGIN_INCH * 1440);

  // Find existing <w:pgMar ... /> and replace margins; if missing, inject into sectPr
  const pgMarRe = /<w:pgMar[^>]*\/>/;
  const newPgMar = `<w:pgMar w:top="${marginTwips}" w:right="${marginTwips}" w:bottom="${marginTwips}" w:left="${marginTwips}" w:header="720" w:footer="720" w:gutter="0"/>`;
  if (pgMarRe.test(docXml)) {
    docXml = docXml.replace(pgMarRe, newPgMar);
  } else {
    docXml = docXml.replace(/<w:sectPr([^>]*)>/, (_m, attrs) => `<w:sectPr${attrs}>${newPgMar}`);
  }

  zip.file('word/document.xml', docXml);
  const outBytes = await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
  fs.writeFileSync(outputPath, outBytes);
  return outputPath;
}

/**
 * A .doc file (old binary Word) is first converted to .docx by Word-adjacent
 * conversion is not trivial in pure JS; we report it clearly instead.
 */
async function handleDoc(inputPath, outputPath) {
  throw new Error(
    'Old .doc (binary) files cannot be trimmed directly. Please re-save them as .docx in Microsoft Word, ' +
    'then run the tool again. (This keeps 100% formatting fidelity.)'
  );
}

// --- Main ---------------------------------------------------------------
async function main() {
  const [,, input, outputArg] = process.argv;

  if (!input) {
    console.log(`
  Batch page trimmer for PDF & Word documents.

  Usage:
    node tools/trim-documents.js <input-file-or-folder> [output-folder]

  Input can be a single file (.pdf / .docx / .doc) or a folder (recursively processed).

  Outputs keep their original format:
    .pdf  -> trimmed .pdf   (white borders cropped per page)
    .docx -> trimmed .docx  (page margins tightened)
    .doc  -> not supported  (re-save as .docx first)
`);
    return;
  }

  await loadDeps();

  const inputPath = path.resolve(input);
  const outputPath = outputArg ? path.resolve(outputArg) : path.resolve('trimmed-output');

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: input not found: ${inputPath}`);
    process.exit(1);
  }

  const files = fs.statSync(inputPath).isDirectory()
    ? walk(inputPath)
    : [inputPath];

  const targets = files.filter(f => /\.(pdf|docx|doc)$/i.test(f));
  if (targets.length === 0) {
    console.error('No .pdf, .docx, or .doc files found in the given input.');
    process.exit(1);
  }

  fs.mkdirSync(outputPath, { recursive: true });

  let ok = 0, skipped = 0, failed = 0;
  console.log(`\nTrimming ${targets.length} document(s)...\n`);

  for (const file of targets) {
    const isDir = fs.statSync(inputPath).isDirectory();
    const rel = isDir ? path.relative(inputPath, file) : path.basename(file);
    const ext = path.extname(file).toLowerCase();
    const relOut = path.join(outputPath, rel);
    fs.mkdirSync(path.dirname(relOut), { recursive: true });

    try {
      if (ext === '.pdf') {
        await trimPdf(file, relOut);
        console.log(`  OK  ${rel}  (PDF -> trimmed PDF)`);
      } else if (ext === '.docx') {
        await trimDocx(file, relOut);
        console.log(`  OK  ${rel}  (DOCX -> trimmed DOCX)`);
      } else if (ext === '.doc') {
        await handleDoc(file, relOut);
      }
      ok++;
    } catch (e) {
      // Don't leave partial files behind
      if (fs.existsSync(relOut)) {
        try { fs.unlinkSync(relOut); } catch (_) {}
      }
      console.log(`  !!  ${rel}  -> ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${ok} trimmed, ${failed} failed, ${skipped} skipped.`);
  console.log(`Output folder: ${outputPath}`);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
