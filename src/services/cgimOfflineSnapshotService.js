const MANIFEST_PATH = "/static_data/manifest.json";

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/#/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/_+/g, "_")
    .toUpperCase()
    .trim();
}

function decodeWeirdUnicodeMarkers(value) {
  return String(value ?? "").replace(/#U([0-9A-Fa-f]{4})/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return "";
    }
  });
}

function encodeStaticPath(file) {
  return `/static_data/${String(file)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

async function parseJsonResponse(response, errorPrefix) {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(`${errorPrefix} (HTTP ${response.status}).`);
  }

  if (!contentType.includes("application/json")) {
    const preview = rawText.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `${errorPrefix}. A resposta não veio em JSON. Início recebido: ${preview}`
    );
  }

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(`${errorPrefix}. O JSON retornado está inválido.`);
  }
}

function resolveManifestEntityKey(manifest, entity) {
  const snapshots = manifest?.snapshots || {};
  const rawKeys = Object.keys(snapshots);

  if (!rawKeys.length || !entity) return null;
  if (snapshots[entity]) return entity;

  const normalizedTarget = normalizeKey(entity);
  const relaxedTarget = normalizedTarget.replace(/_/g, "");

  const exactNormalized = rawKeys.find(
    (key) => normalizeKey(key) === normalizedTarget
  );
  if (exactNormalized) return exactNormalized;

  const relaxedNormalized = rawKeys.find(
    (key) => normalizeKey(key).replace(/_/g, "") === relaxedTarget
  );
  if (relaxedNormalized) return relaxedNormalized;

  const compactTarget = normalizedTarget.replace(/[^A-Z0-9]/g, "");
  const fuzzy = rawKeys.find((key) => {
    const nk = normalizeKey(key).replace(/[^A-Z0-9]/g, "");
    return nk.includes(compactTarget) || compactTarget.includes(nk);
  });

  return fuzzy || null;
}

export async function loadSnapshotManifest() {
  const response = await fetch(MANIFEST_PATH, {
    cache: "no-store",
  });

  return parseJsonResponse(
    response,
    "Não foi possível carregar o manifesto de snapshots"
  );
}

export async function loadSnapshotByFile(file) {
  if (!file) {
    throw new Error("Nome de snapshot inválido.");
  }

  const attempts = [
    file,
    decodeWeirdUnicodeMarkers(file),
  ];

  let lastError = null;

  for (const candidate of attempts) {
    try {
      const url = encodeStaticPath(candidate);
      const response = await fetch(url, { cache: "no-store" });
      return await parseJsonResponse(
        response,
        `Não foi possível carregar o snapshot ${file}`
      );
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(`Não foi possível carregar o snapshot ${file}`);
}

export function getYearsForEntity(manifest, entity) {
  const resolvedKey = resolveManifestEntityKey(manifest, entity);
  if (!resolvedKey) return [];

  return (manifest?.snapshots?.[resolvedKey] || [])
    .map((item) => item.year)
    .filter((year) => year !== undefined && year !== null && year !== "")
    .sort((a, b) => Number(a) - Number(b));
}

export function getSnapshotFile(manifest, entity, year) {
  const resolvedKey = resolveManifestEntityKey(manifest, entity);
  if (!resolvedKey) return null;

  const match = (manifest?.snapshots?.[resolvedKey] || []).find(
    (item) => Number(item.year) === Number(year)
  );

  return match ? match.file : null;
}

export function getLatestSnapshotInfo(manifest, entity) {
  const resolvedKey = resolveManifestEntityKey(manifest, entity);
  if (!resolvedKey) return null;

  const items = (manifest?.snapshots?.[resolvedKey] || [])
    .slice()
    .sort((a, b) => Number(a.year) - Number(b.year));

  return items.length ? items[items.length - 1] : null;
}