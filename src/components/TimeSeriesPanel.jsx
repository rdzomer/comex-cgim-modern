import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatCompact(value) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatKg(value) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function hasAnyPositiveValue(data = [], keys = []) {
  return (data || []).some((row) =>
    keys.some((key) => Number(row?.[key] || 0) > 0)
  );
}

function EmptyChartState({ text }) {
  return (
    <div
      style={{
        height: "100%",
        minHeight: 260,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        textAlign: "center",
        padding: 24,
      }}
    >
      {text}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
        color: "#1e293b",
        minWidth: 180,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 8,
          color: "#1e293b",
          fontSize: 13,
        }}
      >
        {label}
      </div>

      {payload.map((entry, idx) => {
        const key = String(entry.dataKey || "").toLowerCase();
        let display = entry.value;

        if (key.includes("kg")) display = formatKg(entry.value);
        else if (key.includes("usdperton")) display = formatMoney(entry.value);
        else display = formatMoney(entry.value);

        return (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              fontSize: 13,
              color: "#475569",
            }}
          >
            <span>{entry.name}</span>
            <strong style={{ color: "#1e293b" }}>{display}</strong>
          </div>
        );
      })}
    </div>
  );
}

const LEVEL1_COLORS = [
  "#2563eb",
  "#0d9488",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#16a34a",
  "#db2777",
];

export default function TimeSeriesPanel({
  yearlySeries = [],
  level1Series = [],
  categorySeries = [],
  loading = false,
}) {
  const level1Keys = React.useMemo(() => {
    const keys = new Set();
    for (const row of level1Series || []) {
      Object.keys(row || {}).forEach((key) => {
        if (key !== "year") keys.add(key);
      });
    }
    return [...keys].slice(0, 6);
  }, [level1Series]);

  const categoryKeys = React.useMemo(() => {
    const keys = new Set();
    for (const row of categorySeries || []) {
      Object.keys(row || {}).forEach((key) => {
        if (key !== "year") keys.add(key);
      });
    }
    return [...keys];
  }, [categorySeries]);

  const hasYearlyData = hasAnyPositiveValue(yearlySeries, ["fob", "kg", "usdPerTon"]);
  const hasLevel1Data = hasAnyPositiveValue(level1Series, level1Keys);
  const hasCategoryData = hasAnyPositiveValue(categorySeries, categoryKeys);

  if (loading) {
    return <section className="panel">Carregando séries históricas...</section>;
  }

  return (
    <section className="time-series-stack">
      <div className="panel chart-panel">
        <div className="section-title-row">
          <h2>Evolução anual da cesta</h2>
        </div>

        <div className="chart-box tall-chart">
          {!hasYearlyData ? (
            <EmptyChartState text="Não encontramos dados históricos suficientes para montar este gráfico." />
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart
                data={yearlySeries}
                margin={{ top: 12, right: 18, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={formatCompact}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatCompact}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="fob"
                  name="FOB (US$)"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#2563eb" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="kg"
                  name="KG"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#0d9488" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="panel chart-panel">
        <div className="section-title-row">
          <h2>Evolução do preço médio (US$/ton)</h2>
        </div>

        <div className="chart-box">
          {!hasYearlyData ? (
            <EmptyChartState text="Sem dados suficientes para calcular a evolução do preço médio." />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={yearlySeries}
                margin={{ top: 12, right: 18, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="usdPerTon"
                  name="US$/ton"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#d97706" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="panel chart-panel">
        <div className="section-title-row">
          <h2>Evolução anual por subcategoria nível 1</h2>
        </div>

        <div className="chart-box tall-chart">
          {!hasLevel1Data ? (
            <EmptyChartState text="Não encontramos dados suficientes para montar a evolução por subcategoria nível 1." />
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={level1Series}
                margin={{ top: 12, right: 18, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {level1Keys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    stackId="level1"
                    fill={LEVEL1_COLORS[index % LEVEL1_COLORS.length]}
                    radius={index === level1Keys.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="panel chart-panel">
        <div className="section-title-row">
          <h2>Evolução anual por categoria (cesta)</h2>
        </div>

        <div className="chart-box tall-chart">
          {!hasCategoryData ? (
            <EmptyChartState text="Não encontramos dados suficientes para montar a evolução por categoria." />
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={categorySeries}
                margin={{ top: 12, right: 18, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {categoryKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    stackId="category"
                    fill={LEVEL1_COLORS[index % LEVEL1_COLORS.length]}
                    radius={index === categoryKeys.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}