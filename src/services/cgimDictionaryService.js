import * as XLSX from "xlsx";

const DICTIONARY_PATH = "/dictionaries/cgim_dinte.xlsx";

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeId(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase();
}

function normalizeNcm(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.padStart(8, "0").slice(0, 8);
}

function looksLikeNcm(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 4;
}

function shouldIgnoreSheet(sheetName) {
  const clean = normalizeText(sheetName).toUpperCase();

  if (!clean) return true;
  if (clean.startsWith("~$")) return true;

  // Aba técnica/geral que não deve aparecer como entidade no seletor
  if (clean === "NCMS-CGIM-DINTE") return true;

  return false;
}

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i += 1) {
    const row = (rows[i] || []).map((cell) => normalizeText(cell).toLowerCase());

    const hasNcm = row.some(
      (cell) =>
        cell.includes("ncm") ||
        cell.includes("codigo ncm") ||
        cell.includes("código ncm")
    );

    const hasCategory = row.some(
      (cell) =>
        cell.includes("categoria") ||
        cell.includes("segmento") ||
        cell.includes("grupo")
    );

    if (hasNcm || hasCategory) return i;
  }

  return 0;
}

function detectColumns(headerRow) {
  const normalized = (headerRow || []).map((cell) =>
    normalizeText(cell).toLowerCase()
  );

  let ncmIndex = -1;
  let categoryIndex = -1;
  let subcategoryIndex = -1;

  normalized.forEach((cell, index) => {
    if (
      ncmIndex === -1 &&
      (cell.includes("ncm") ||
        cell.includes("codigo ncm") ||
        cell.includes("código ncm"))
    ) {
      ncmIndex = index;
      return;
    }

    if (
      categoryIndex === -1 &&
      (cell === "categoria" ||
        cell.includes("categoria") ||
        cell.includes("segmento") ||
        cell.includes("grupo"))
    ) {
      categoryIndex = index;
      return;
    }

    if (
      subcategoryIndex === -1 &&
      (cell.includes("subcategoria") ||
        cell.includes("sub-categoria") ||
        cell.includes("sub categoria") ||
        cell.includes("produto") ||
        cell.includes("descrição") ||
        cell.includes("descricao"))
    ) {
      subcategoryIndex = index;
    }
  });

  return {
    ncmIndex,
    categoryIndex,
    subcategoryIndex,
  };
}

function parseSheet(sheetName, worksheet) {
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (!rows.length) {
    return {
      entity: {
        id: normalizeId(sheetName),
        name: normalizeText(sheetName),
        label: normalizeText(sheetName),
      },
      entries: [],
    };
  }

  const headerRowIndex = findHeaderRow(rows);
  const headerRow = rows[headerRowIndex] || [];
  const { ncmIndex, categoryIndex, subcategoryIndex } = detectColumns(headerRow);

  const entries = [];

  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];

    const rawNcm =
      ncmIndex >= 0 ? row[ncmIndex] : row.find((cell) => looksLikeNcm(cell));

    if (!looksLikeNcm(rawNcm)) continue;

    const ncm = normalizeNcm(rawNcm);
    if (!ncm) continue;

    const category =
      categoryIndex >= 0
        ? normalizeText(row[categoryIndex])
        : normalizeText(row[1] || "Sem categoria");

    const subcategory =
      subcategoryIndex >= 0
        ? normalizeText(row[subcategoryIndex])
        : normalizeText(row[2] || "");

    entries.push({
      entity: normalizeId(sheetName),
      entityName: normalizeText(sheetName),
      ncm,
      category: category || "Sem categoria",
      subcategory: subcategory || "Sem subcategoria",
    });
  }

  const dedupedMap = new Map();

  for (const entry of entries) {
    const key = [
      entry.entity,
      entry.ncm,
      entry.category,
      entry.subcategory,
    ].join("|");

    if (!dedupedMap.has(key)) {
      dedupedMap.set(key, entry);
    }
  }

  return {
    entity: {
      id: normalizeId(sheetName),
      name: normalizeText(sheetName),
      label: normalizeText(sheetName),
    },
    entries: [...dedupedMap.values()],
  };
}

export async function loadCgimDictionary() {
  const response = await fetch(DICTIONARY_PATH, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Não foi possível carregar o dicionário CGIM (HTTP ${response.status}).`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const entities = [];
  const entriesByEntity = {};
  const allEntries = [];

  for (const sheetName of workbook.SheetNames) {
    if (shouldIgnoreSheet(sheetName)) continue;

    const worksheet = workbook.Sheets[sheetName];
    const parsed = parseSheet(sheetName, worksheet);

    entities.push(parsed.entity);
    entriesByEntity[parsed.entity.id] = parsed.entries;
    allEntries.push(...parsed.entries);
  }

  entities.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  return {
    entities,
    entriesByEntity,
    allEntries,
  };
}

export function getEntriesByEntity(dictionary, entityId) {
  if (!dictionary || !entityId) return [];
  return dictionary.entriesByEntity?.[entityId] || [];
}

export function getBasketNcms(dictionary, entityId) {
  const entries = getEntriesByEntity(dictionary, entityId);
  return [...new Set(entries.map((item) => item.ncm).filter(Boolean))].sort();
}

export function getEntityById(dictionary, entityId) {
  return (dictionary?.entities || []).find((item) => item.id === entityId) || null;
}