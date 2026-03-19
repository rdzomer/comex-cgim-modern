import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";

import KpiCards from "./components/KpiCards";
import ChartsPanel from "./components/ChartsPanel";
import HierarchyTable from "./components/HierarchyTable";
import TimeSeriesPanel from "./components/TimeSeriesPanel";

import { loadCgimDictionary } from "./services/cgimDictionaryService";
import {
  loadSnapshotManifest,
  loadSnapshotByFile,
  getYearsForEntity,
  getSnapshotFile,
} from "./services/cgimOfflineSnapshotService";
import {
  loadEntityYearlySeries,
  loadEntityLevel1Series,
} from "./services/cgimTimeseriesService";

import {
  aggregateTreeByLevel,
  buildKpis,
  filterTree,
  getCategoryOptions,
  getSubcategoryOptions,
  getTopSubcategories,
} from "./domain/tree";

const AGGREGATION_OPTIONS = [
  { value: "category", label: "Somente categoria" },
  { value: "subcategory-1", label: "Subcategoria nível 1" },
  { value: "subcategory-2", label: "Subcategoria nível 2" },
  { value: "subcategory-full", label: "Subcategoria completa" },
  { value: "ncm", label: "Até NCM" },
];

function formatSnapshotLabel(snapshot) {
  if (!snapshot?.updatedAt) return "Snapshot indisponível";
  try {
    return new Date(snapshot.updatedAt).toLocaleString("pt-BR");
  } catch {
    return String(snapshot.updatedAt);
  }
}

function normalizeFlowValue(flow) {
  const value = String(flow || "").toLowerCase();
  if (value.includes("exp")) return "export";
  return "import";
}

export default function App() {
  const [dictionary, setDictionary] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const [selectedEntity, setSelectedEntity] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedFlow, setSelectedFlow] = useState("import");
  const [aggregationLevel, setAggregationLevel] = useState("subcategory-full");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedSubcategory, setSelectedSubcategory] = useState("Todas");

  const [loading, setLoading] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [error, setError] = useState("");

  const [yearlySeries, setYearlySeries] = useState([]);
  const [level1Series, setLevel1Series] = useState([]);

  useEffect(() => {
    async function boot() {
      try {
        setLoading(true);
        setError("");

        const [dict, manifestData] = await Promise.all([
          loadCgimDictionary(),
          loadSnapshotManifest(),
        ]);

        setDictionary(dict);
        setManifest(manifestData);

        const entities = dict?.entities || [];
        const firstEntity = entities[0]?.id || entities[0]?.name || "";
        setSelectedEntity(firstEntity);

        const years = getYearsForEntity(manifestData, firstEntity);
        const latestYear = years.length ? years[years.length - 1] : "";
        setSelectedYear(latestYear);
      } catch (err) {
        setError(err?.message || "Erro ao carregar a aplicação.");
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, []);

  useEffect(() => {
    async function loadSnapshot() {
      if (!selectedEntity || !selectedYear || !manifest) return;

      try {
        setSnapshotLoading(true);
        setError("");

        const file = getSnapshotFile(manifest, selectedEntity, Number(selectedYear));

        if (!file) {
          throw new Error(
            `Não encontrei snapshot offline para a entidade "${selectedEntity}" no ano ${selectedYear}.`
          );
        }

        const data = await loadSnapshotByFile(file);
        setSnapshot(data);
      } catch (err) {
        setSnapshot(null);
        setError(err?.message || "Erro ao carregar snapshot offline.");
      } finally {
        setSnapshotLoading(false);
      }
    }

    loadSnapshot();
  }, [manifest, selectedEntity, selectedYear]);

  useEffect(() => {
    async function loadSeries() {
      if (!manifest || !selectedEntity) return;

      try {
        setSeriesLoading(true);

        const [yearly, level1] = await Promise.all([
          loadEntityYearlySeries({
            manifest,
            entityId: selectedEntity,
            flow: selectedFlow,
            selectedCategory,
            selectedSubcategory,
          }),
          loadEntityLevel1Series({
            manifest,
            entityId: selectedEntity,
            flow: selectedFlow,
            selectedCategory,
          }),
        ]);

        setYearlySeries(yearly);
        setLevel1Series(level1);
      } catch (err) {
        console.warn("Falha ao carregar séries históricas", err);
        setYearlySeries([]);
        setLevel1Series([]);
      } finally {
        setSeriesLoading(false);
      }
    }

    loadSeries();
  }, [manifest, selectedEntity, selectedFlow, selectedCategory, selectedSubcategory]);

  const entities = useMemo(() => {
    return dictionary?.entities || [];
  }, [dictionary]);

  const years = useMemo(() => {
    if (!manifest || !selectedEntity) return [];
    return getYearsForEntity(manifest, selectedEntity);
  }, [manifest, selectedEntity]);

  const rawTree = useMemo(() => {
    if (!snapshot) return [];
    const flow = normalizeFlowValue(selectedFlow);
    return snapshot?.trees?.[flow] || [];
  }, [snapshot, selectedFlow]);

  const aggregatedTree = useMemo(() => {
    return aggregateTreeByLevel(rawTree, aggregationLevel);
  }, [rawTree, aggregationLevel]);

  const categoryOptions = useMemo(() => {
    return getCategoryOptions(aggregatedTree);
  }, [aggregatedTree]);

  const subcategoryOptions = useMemo(() => {
    const categories =
      selectedCategory && selectedCategory !== "Todas" ? [selectedCategory] : [];
    return getSubcategoryOptions(aggregatedTree, categories, aggregationLevel);
  }, [aggregatedTree, selectedCategory, aggregationLevel]);

  useEffect(() => {
    if (
      selectedCategory !== "Todas" &&
      categoryOptions.length &&
      !categoryOptions.includes(selectedCategory)
    ) {
      setSelectedCategory("Todas");
    }
  }, [categoryOptions, selectedCategory]);

  useEffect(() => {
    if (
      selectedSubcategory !== "Todas" &&
      subcategoryOptions.length &&
      !subcategoryOptions.includes(selectedSubcategory)
    ) {
      setSelectedSubcategory("Todas");
    }
  }, [subcategoryOptions, selectedSubcategory]);

  const filteredTree = useMemo(() => {
    const categories =
      selectedCategory && selectedCategory !== "Todas" ? [selectedCategory] : [];
    const subcategories =
      selectedSubcategory && selectedSubcategory !== "Todas"
        ? [selectedSubcategory]
        : [];

    return filterTree(aggregatedTree, categories, subcategories);
  }, [aggregatedTree, selectedCategory, selectedSubcategory]);

  const kpis = useMemo(() => buildKpis(filteredTree), [filteredTree]);

  const chartLevel1Tree = useMemo(() => {
    const baseTree = aggregateTreeByLevel(rawTree, "subcategory-1");

    const categories =
      selectedCategory && selectedCategory !== "Todas" ? [selectedCategory] : [];
    const subcategories =
      selectedSubcategory && selectedSubcategory !== "Todas"
        ? [selectedSubcategory]
        : [];

    return filterTree(baseTree, categories, subcategories);
  }, [rawTree, selectedCategory, selectedSubcategory]);

  const topSubcategoriesLevel1 = useMemo(() => {
    return getTopSubcategories(chartLevel1Tree);
  }, [chartLevel1Tree]);

  const topSubcategoriesCurrent = useMemo(() => {
    return getTopSubcategories(filteredTree);
  }, [filteredTree]);

  if (loading) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="panel">Carregando aplicação...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="container">
        <header className="hero">
          <div>
            <div className="eyebrow">MDIC · CGIM</div>
            <h1>COMEX CGIM</h1>
            <p>
              Dashboard moderno de análise por cestas setoriais, com carregamento
              instantâneo via snapshots offline e estrutura pronta para atualização
              incremental.
            </p>
          </div>

          <div className="hero-side">
            <div className="status-badge">Fonte: Offline</div>
            <div className="snapshot-label">
              Snapshot: {formatSnapshotLabel(snapshot)}
            </div>
          </div>
        </header>

        <section className="filters-panel">
          <div className="filter-grid">
            <div className="field">
              <label>Entidade</label>
              <select
                value={selectedEntity}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedEntity(next);
                  setSelectedCategory("Todas");
                  setSelectedSubcategory("Todas");

                  const nextYears = getYearsForEntity(manifest, next);
                  const latestYear = nextYears.length
                    ? nextYears[nextYears.length - 1]
                    : "";
                  setSelectedYear(latestYear);
                }}
              >
                {entities.map((entity) => {
                  const value = entity.id || entity.name;
                  const label = entity.label || entity.name || entity.id;
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="field">
              <label>Ano</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Fluxo</label>
              <select
                value={selectedFlow}
                onChange={(e) => setSelectedFlow(e.target.value)}
              >
                <option value="import">Importação</option>
                <option value="export">Exportação</option>
              </select>
            </div>

            <div className="field">
              <label>Agregação</label>
              <select
                value={aggregationLevel}
                onChange={(e) => {
                  setAggregationLevel(e.target.value);
                  setSelectedSubcategory("Todas");
                }}
              >
                {AGGREGATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory("Todas");
                }}
              >
                <option value="Todas">Todas</option>
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Subcategoria</label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
              >
                <option value="Todas">Todas</option>
                {subcategoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {snapshotLoading ? (
          <section className="panel">Carregando snapshot...</section>
        ) : null}

        {error ? <section className="panel error-panel">{error}</section> : null}

        {!error && !snapshotLoading ? (
          <>
            <KpiCards kpis={kpis} />

            <ChartsPanel
              topLevel1Subcategories={topSubcategoriesLevel1}
              topSubcategories={topSubcategoriesCurrent}
            />

            <TimeSeriesPanel
              yearlySeries={yearlySeries}
              level1Series={level1Series}
              loading={seriesLoading}
            />

            <HierarchyTable tree={filteredTree} />
          </>
        ) : null}
      </div>
    </div>
  );
}