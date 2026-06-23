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
  loadEntityCategorySeries,
} from "./services/cgimTimeseriesService";

import {
  aggregateTreeByLevel,
  buildKpis,
  filterTree,
  getTopSubcategories,
} from "./domain/tree";

// ── Constantes ────────────────────────────────────────────────────────────────

const DETAIL_OPTIONS = [
  { value: "category",         label: "Categorias" },
  { value: "subcategory-1",    label: "Por tipo" },
  { value: "subcategory-full", label: "Detalhado" },
  { value: "ncm",              label: "Até NCM" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeFlowValue(flow) {
  return String(flow || "").toLowerCase().includes("exp") ? "export" : "import";
}

function formatSnapshotLabel(snapshot) {
  if (!snapshot?.updatedAt) return "Snapshot indisponível";
  try { return new Date(snapshot.updatedAt).toLocaleString("pt-BR"); }
  catch { return String(snapshot.updatedAt); }
}

function fmtFob(val) {
  if (!val || val <= 0) return null;
  if (val >= 1e9) return `${(val / 1e9).toFixed(1)}bi`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(0)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}k`;
  return val.toFixed(0);
}

// Extrai o segmento de nível 1 de um nome de subcategoria "A > B > C" → "A"
function level1Name(name) {
  return (name || "").split(">")[0].trim();
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function App() {
  const [dictionary, setDictionary] = useState(null);
  const [manifest, setManifest]     = useState(null);
  const [snapshot, setSnapshot]     = useState(null);

  const [selectedEntity,   setSelectedEntity]   = useState("");
  const [selectedYear,     setSelectedYear]     = useState("");
  const [selectedFlow,     setSelectedFlow]     = useState("import");
  const [aggregationLevel, setAggregationLevel] = useState("subcategory-1");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedLevel1,   setSelectedLevel1]   = useState("Todas");

  const [loading,         setLoading]         = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [seriesLoading,   setSeriesLoading]   = useState(false);
  const [error,           setError]           = useState("");

  const [yearlySeries,   setYearlySeries]   = useState([]);
  const [level1Series,   setLevel1Series]   = useState([]);
  const [categorySeries, setCategorySeries] = useState([]);

  // ── Boot ──────────────────────────────────────────────────────────────────

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
        const firstId  = entities[0]?.id || "";
        setSelectedEntity(firstId);
        const years = getYearsForEntity(manifestData, firstId);
        setSelectedYear(years.length ? String(years[years.length - 1]) : "");
      } catch (err) {
        setError(err?.message || "Erro ao carregar a aplicação.");
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, []);

  // ── Carregar snapshot ─────────────────────────────────────────────────────

  useEffect(() => {
    async function loadSnapshot() {
      if (!selectedEntity || !selectedYear || !manifest) return;
      try {
        setSnapshotLoading(true);
        setError("");
        const file = getSnapshotFile(manifest, selectedEntity, Number(selectedYear));
        if (!file) throw new Error(`Não encontrei snapshot para "${selectedEntity}" no ano ${selectedYear}.`);
        const data = await loadSnapshotByFile(file);
        setSnapshot(data);
      } catch (err) {
        setSnapshot(null);
        setError(err?.message || "Erro ao carregar snapshot.");
      } finally {
        setSnapshotLoading(false);
      }
    }
    loadSnapshot();
  }, [manifest, selectedEntity, selectedYear]);

  // ── Carregar séries históricas ────────────────────────────────────────────

  useEffect(() => {
    async function loadSeries() {
      if (!manifest || !selectedEntity) return;
      try {
        setSeriesLoading(true);
        const [yearly, lv1, catSeries] = await Promise.all([
          loadEntityYearlySeries({ manifest, entityId: selectedEntity, flow: selectedFlow, selectedCategory, selectedSubcategory: "Todas" }),
          loadEntityLevel1Series({ manifest, entityId: selectedEntity, flow: selectedFlow, selectedCategory }),
          loadEntityCategorySeries({ manifest, entityId: selectedEntity, flow: selectedFlow }),
        ]);
        setYearlySeries(yearly);
        setLevel1Series(lv1);
        setCategorySeries(catSeries);
      } catch (err) {
        console.warn("Falha ao carregar séries históricas", err);
        setYearlySeries([]); setLevel1Series([]); setCategorySeries([]);
      } finally {
        setSeriesLoading(false);
      }
    }
    loadSeries();
  }, [manifest, selectedEntity, selectedFlow, selectedCategory]);

  // ── Dados derivados ───────────────────────────────────────────────────────

  const entities = useMemo(() => dictionary?.entities || [], [dictionary]);

  const years = useMemo(() => {
    if (!manifest || !selectedEntity) return [];
    return getYearsForEntity(manifest, selectedEntity).map(String);
  }, [manifest, selectedEntity]);

  const currentEntity = useMemo(
    () => entities.find((e) => e.id === selectedEntity) || null,
    [entities, selectedEntity]
  );

  const rawTree = useMemo(() => {
    if (!snapshot) return [];
    return snapshot?.trees?.[normalizeFlowValue(selectedFlow)] || [];
  }, [snapshot, selectedFlow]);

  // Chips de categoria com total FOB
  const categoryChipsData = useMemo(() =>
    rawTree
      .map((cat) => ({ name: cat.name, fob: cat.metrics?.fob || 0 }))
      .sort((a, b) => b.fob - a.fob),
    [rawTree]
  );

  // Chips de tipo (nível 1) com total FOB, filtrados pela categoria selecionada
  const level1ChipsData = useMemo(() => {
    const src = selectedCategory !== "Todas"
      ? rawTree.filter((c) => c.name === selectedCategory)
      : rawTree;
    const map = new Map();
    for (const cat of src) {
      for (const sub of cat.children || []) {
        const key = level1Name(sub.name);
        if (!key) continue;
        map.set(key, (map.get(key) || 0) + (sub.metrics?.fob || 0));
      }
    }
    return [...map.entries()]
      .map(([name, fob]) => ({ name, fob }))
      .sort((a, b) => b.fob - a.fob);
  }, [rawTree, selectedCategory]);

  // Árvore filtrada por categoria + tipo (nível 1)
  const filteredRawTree = useMemo(() => {
    const categories = selectedCategory !== "Todas" ? [selectedCategory] : [];
    let tree = filterTree(rawTree, categories, []);

    if (selectedLevel1 !== "Todas") {
      tree = tree
        .map((cat) => {
          const children = (cat.children || []).filter(
            (sub) => level1Name(sub.name) === selectedLevel1
          );
          const metrics = children.reduce(
            (acc, sub) => ({
              fob: acc.fob + (sub.metrics?.fob || 0),
              kg:  acc.kg  + (sub.metrics?.kg  || 0),
            }),
            { fob: 0, kg: 0 }
          );
          return { ...cat, children, metrics };
        })
        .filter((cat) => cat.children.length > 0);
    }

    return tree;
  }, [rawTree, selectedCategory, selectedLevel1]);

  const filteredTree = useMemo(
    () => aggregateTreeByLevel(filteredRawTree, aggregationLevel),
    [filteredRawTree, aggregationLevel]
  );

  const kpis = useMemo(() => buildKpis(filteredTree), [filteredTree]);

  const chartLevel1Tree = useMemo(
    () => aggregateTreeByLevel(filteredRawTree, "subcategory-1"),
    [filteredRawTree]
  );
  const topSubcategoriesLevel1  = useMemo(() => getTopSubcategories(chartLevel1Tree), [chartLevel1Tree]);
  const topSubcategoriesCurrent = useMemo(() => getTopSubcategories(filteredTree),    [filteredTree]);

  // Breadcrumb de contexto
  const contextLabel = useMemo(() => {
    const parts = [];
    if (selectedCategory !== "Todas") parts.push(selectedCategory);
    if (selectedLevel1   !== "Todas") parts.push(selectedLevel1);
    return parts.length ? parts.join(" › ") : "Toda a cesta";
  }, [selectedCategory, selectedLevel1]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleEntityChange(entityId) {
    setSelectedEntity(entityId);
    setSelectedCategory("Todas");
    setSelectedLevel1("Todas");
    const nextYears = getYearsForEntity(manifest, entityId).map(String);
    setSelectedYear(nextYears.length ? nextYears[nextYears.length - 1] : "");
  }

  function handleCategoryChip(catName) {
    if (selectedCategory === catName) {
      setSelectedCategory("Todas");
    } else {
      setSelectedCategory(catName);
    }
    setSelectedLevel1("Todas");
  }

  function handleLevel1Chip(name) {
    if (selectedLevel1 === name) {
      setSelectedLevel1("Todas");
    } else {
      setSelectedLevel1(name);
      // Se estava em "Categorias", vai para "Detalhado" automaticamente
      if (aggregationLevel === "category") setAggregationLevel("subcategory-full");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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

        {/* Cabeçalho */}
        <header className="hero">
          <div>
            <div className="eyebrow">MDIC · CGIM</div>
            <h1>CGIM Baskets</h1>
            <p>Cestas setoriais por entidade e nível de agregação</p>
          </div>
          <div className="hero-side">
            <div className="status-badge">Fonte: Offline</div>
            <div className="snapshot-label">
              Snapshot: {formatSnapshotLabel(snapshot)}
            </div>
          </div>
        </header>

        {/* ═══ PAINEL DE FILTROS ════════════════════════════════════════════ */}
        <section className="filters-panel-v2">

          {/* 1 · Entidade */}
          <div className="filter-section">
            <span className="filter-label">Entidade</span>
            <div className="entity-tabs">
              {entities.map((entity) => {
                const id    = entity.id;
                const label = entity.label || id;
                return (
                  <button
                    key={id}
                    className={`entity-tab${selectedEntity === id ? " entity-tab--active" : ""}`}
                    onClick={() => handleEntityChange(id)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2 · Fluxo · Ano · Detalhe */}
          <div className="filter-controls-row">

            <div className="filter-control-group">
              <span className="filter-label">Fluxo</span>
              <div className="flow-toggle">
                <button
                  className={`flow-btn${selectedFlow === "import" ? " flow-btn--active" : ""}`}
                  onClick={() => setSelectedFlow("import")}
                >
                  Importação
                </button>
                <button
                  className={`flow-btn${selectedFlow === "export" ? " flow-btn--active" : ""}`}
                  onClick={() => setSelectedFlow("export")}
                >
                  Exportação
                </button>
              </div>
            </div>

            <div className="filter-control-group">
              <span className="filter-label">Ano</span>
              <div className="year-btns">
                {years.map((year) => (
                  <button
                    key={year}
                    className={`year-btn${selectedYear === year ? " year-btn--active" : ""}`}
                    onClick={() => setSelectedYear(year)}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-control-group">
              <span className="filter-label">Detalhe</span>
              <div className="detail-btns">
                {DETAIL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`detail-btn${aggregationLevel === opt.value ? " detail-btn--active" : ""}`}
                    onClick={() => setAggregationLevel(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* 3 · Categoria */}
          {categoryChipsData.length > 0 && (
            <div className="filter-section">
              <span className="filter-label">Categoria</span>
              <div className="chips-row">
                <button
                  className={`chip${selectedCategory === "Todas" ? " chip--active" : ""}`}
                  onClick={() => { setSelectedCategory("Todas"); setSelectedLevel1("Todas"); }}
                >
                  Todas
                </button>
                {categoryChipsData.map((cat) => {
                  const fobStr = fmtFob(cat.fob);
                  return (
                    <button
                      key={cat.name}
                      className={`chip${selectedCategory === cat.name ? " chip--active" : ""}`}
                      onClick={() => handleCategoryChip(cat.name)}
                    >
                      {cat.name}
                      {fobStr && <span className="chip-fob">US$ {fobStr}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4 · Tipo (nível 1 da subcategoria) */}
          {level1ChipsData.length > 0 && (
            <div className="filter-section">
              <span className="filter-label">Tipo</span>
              <div className="chips-row">
                <button
                  className={`chip${selectedLevel1 === "Todas" ? " chip--active" : ""}`}
                  onClick={() => setSelectedLevel1("Todas")}
                >
                  Todos
                </button>
                {level1ChipsData.map((item) => {
                  const fobStr = fmtFob(item.fob);
                  return (
                    <button
                      key={item.name}
                      className={`chip${selectedLevel1 === item.name ? " chip--active" : ""}`}
                      onClick={() => handleLevel1Chip(item.name)}
                    >
                      {item.name}
                      {fobStr && <span className="chip-fob">US$ {fobStr}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Breadcrumb de contexto */}
          <div className="filter-context">
            <span className="filter-context-label">Visualizando:</span>
            <span className="filter-context-value">
              {currentEntity?.label || selectedEntity}
              {" · "}{selectedYear}
              {" · "}{selectedFlow === "import" ? "Importação" : "Exportação"}
              {" · "}{contextLabel}
            </span>
          </div>

        </section>
        {/* ═══════════════════════════════════════════════════════════════════ */}

        {snapshotLoading && <section className="panel">Carregando snapshot...</section>}
        {error          && <section className="panel error-panel">{error}</section>}

        {!error && !snapshotLoading && (
          <>
            <KpiCards kpis={kpis} />
            <ChartsPanel
              topLevel1Subcategories={topSubcategoriesLevel1}
              topSubcategories={topSubcategoriesCurrent}
            />
            <TimeSeriesPanel
              yearlySeries={yearlySeries}
              level1Series={level1Series}
              categorySeries={categorySeries}
              loading={seriesLoading}
            />
            <HierarchyTable tree={filteredTree} />
          </>
        )}

      </div>
    </div>
  );
}
