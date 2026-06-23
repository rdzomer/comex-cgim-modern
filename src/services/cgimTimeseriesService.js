import {
  loadSnapshotByFile,
  getYearsForEntity,
  getSnapshotFile,
} from "./cgimOfflineSnapshotService";
import {
  aggregateTreeByLevel,
  filterTree,
  buildKpis,
  getTopSubcategories,
} from "../domain/tree";

function normalizeFlowValue(flow) {
  const value = String(flow || "").toLowerCase();
  if (value.includes("exp")) return "export";
  return "import";
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function tryReadSeriesFromCharts(snapshot, flow) {
  const charts = snapshot?.charts || {};
  const normalizedFlow = normalizeFlowValue(flow);

  const candidates =
    normalizedFlow === "export"
      ? [charts.exportSeries, charts.exportsSeries, charts.expSeries]
      : [charts.importSeries, charts.importsSeries, charts.impSeries];

  const series = candidates.find((item) => Array.isArray(item));
  if (!series) return [];

  return series.map((item) => {
    const year =
      item?.year ??
      item?.ano ??
      item?.label ??
      item?.name ??
      item?.x;

    const fob =
      item?.fob ??
      item?.value ??
      item?.valor ??
      item?.totalFob ??
      item?.usd;

    const kg =
      item?.kg ??
      item?.peso ??
      item?.totalKg;

    const usdPerTon =
      item?.usdPerTon ??
      item?.precoMedio ??
      item?.pricePerTon;

    return {
      year: String(year),
      fob: safeNumber(fob),
      kg: safeNumber(kg),
      usdPerTon: safeNumber(
        usdPerTon || (safeNumber(kg) > 0 ? safeNumber(fob) / (safeNumber(kg) / 1000) : 0)
      ),
    };
  });
}

function tryReadSeriesFromTree(snapshot, flow, selectedCategory, selectedSubcategory) {
  const normalizedFlow = normalizeFlowValue(flow);
  const rawTree = snapshot?.trees?.[normalizedFlow] || [];

  if (!rawTree.length) return null;

  const baseTree = aggregateTreeByLevel(rawTree, "subcategory-full");

  const categories =
    selectedCategory && selectedCategory !== "Todas" ? [selectedCategory] : [];
  const subcategories =
    selectedSubcategory && selectedSubcategory !== "Todas"
      ? [selectedSubcategory]
      : [];

  const filteredTree = filterTree(baseTree, categories, subcategories);
  const kpis = buildKpis(filteredTree);

  return {
    fob: safeNumber(kpis.fob),
    kg: safeNumber(kpis.kg),
    usdPerTon: safeNumber(kpis.usdPerTon),
  };
}

export async function loadEntityYearlySeries({
  manifest,
  entityId,
  flow = "import",
  selectedCategory = "Todas",
  selectedSubcategory = "Todas",
}) {
  if (!manifest || !entityId) return [];

  const years = getYearsForEntity(manifest, entityId);
  const results = [];

  for (const year of years) {
    const file = getSnapshotFile(manifest, entityId, Number(year));
    if (!file) continue;

    try {
      const snapshot = await loadSnapshotByFile(file);

      const chartSeries = tryReadSeriesFromCharts(snapshot, flow);
      const matchingChartPoint = chartSeries.find(
        (item) => String(item.year) === String(year)
      );

      if (matchingChartPoint) {
        results.push({
          year: String(year),
          fob: safeNumber(matchingChartPoint.fob),
          kg: safeNumber(matchingChartPoint.kg),
          usdPerTon: safeNumber(matchingChartPoint.usdPerTon),
        });
        continue;
      }

      const treePoint = tryReadSeriesFromTree(
        snapshot,
        flow,
        selectedCategory,
        selectedSubcategory
      );

      if (treePoint) {
        results.push({
          year: String(year),
          fob: safeNumber(treePoint.fob),
          kg: safeNumber(treePoint.kg),
          usdPerTon: safeNumber(treePoint.usdPerTon),
        });
      }
    } catch (error) {
      console.warn(
        `Falha ao carregar snapshot da série anual: ${entityId} ${year}`,
        error
      );
    }
  }

  return results
    .filter((item) => {
      return (
        Number(item.fob) > 0 ||
        Number(item.kg) > 0 ||
        Number(item.usdPerTon) > 0
      );
    })
    .sort((a, b) => Number(a.year) - Number(b.year));
}

function buildCategoryRowFromTree(snapshot, flow) {
  const normalizedFlow = normalizeFlowValue(flow);
  const rawTree = snapshot?.trees?.[normalizedFlow] || [];
  if (!rawTree.length) return null;

  const categoryTree = aggregateTreeByLevel(rawTree, "category");
  const filteredTree = filterTree(categoryTree, [], []);

  const row = {};
  for (const category of filteredTree) {
    row[category.name] = safeNumber(category.metrics?.fob);
  }
  return row;
}

export async function loadEntityCategorySeries({ manifest, entityId, flow = "import" }) {
  if (!manifest || !entityId) return [];

  const years = getYearsForEntity(manifest, entityId);
  const rows = [];

  for (const year of years) {
    const file = getSnapshotFile(manifest, entityId, Number(year));
    if (!file) continue;

    try {
      const snapshot = await loadSnapshotByFile(file);
      const row = buildCategoryRowFromTree(snapshot, flow);
      rows.push({ year: String(year), ...(row || {}) });
    } catch (error) {
      console.warn(`Falha ao carregar série por categoria: ${entityId} ${year}`, error);
    }
  }

  return rows
    .filter((row) =>
      Object.entries(row)
        .filter(([key]) => key !== "year")
        .some(([, v]) => Number(v) > 0)
    )
    .sort((a, b) => Number(a.year) - Number(b.year));
}

function buildLevel1RowFromTree(snapshot, flow, selectedCategory) {
  const normalizedFlow = normalizeFlowValue(flow);
  const rawTree = snapshot?.trees?.[normalizedFlow] || [];
  if (!rawTree.length) return null;

  const level1Tree = aggregateTreeByLevel(rawTree, "subcategory-1");

  const categories =
    selectedCategory && selectedCategory !== "Todas" ? [selectedCategory] : [];

  const filteredTree = filterTree(level1Tree, categories, []);
  const topLevel1 = getTopSubcategories(filteredTree);

  const row = {};
  for (const item of topLevel1) {
    row[item.name] = safeNumber(item.fob);
  }

  return row;
}

export async function loadEntityLevel1Series({
  manifest,
  entityId,
  flow = "import",
  selectedCategory = "Todas",
}) {
  if (!manifest || !entityId) return [];

  const years = getYearsForEntity(manifest, entityId);
  const rows = [];

  for (const year of years) {
    const file = getSnapshotFile(manifest, entityId, Number(year));
    if (!file) continue;

    try {
      const snapshot = await loadSnapshotByFile(file);

      const row = buildLevel1RowFromTree(snapshot, flow, selectedCategory);

      rows.push({
        year: String(year),
        ...(row || {}),
      });
    } catch (error) {
      console.warn(
        `Falha ao carregar série nível 1: ${entityId} ${year}`,
        error
      );
    }
  }

  return rows
    .filter((row) => {
      const values = Object.entries(row)
        .filter(([key]) => key !== "year")
        .map(([, value]) => Number(value || 0));

      return values.some((v) => v > 0);
    })
    .sort((a, b) => Number(a.year) - Number(b.year));
}