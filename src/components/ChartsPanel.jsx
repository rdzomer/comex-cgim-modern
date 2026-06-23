import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
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

function formatAxisNumber(value) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function truncateLabel(value, max = 22) {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function buildPieData(items = []) {
  return items
    .filter((item) => Number(item?.fob || 0) > 0)
    .map((item) => ({
      name: item.name,
      value: Number(item.fob || 0),
    }));
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
      {label ? (
        <div
          style={{
            fontWeight: 700,
            marginBottom: 8,
            color: "#1e293b",
            lineHeight: 1.3,
            fontSize: 13,
          }}
        >
          {label}
        </div>
      ) : null}

      {payload.map((entry, idx) => (
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
          <strong style={{ color: "#1e293b" }}>{formatMoney(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
}

const PIE_COLORS = [
  "#2563eb",
  "#0d9488",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#16a34a",
  "#db2777",
  "#ea580c",
  "#0f766e",
];

function CustomLegend({ payload = [] }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        justifyContent: "center",
        marginTop: 8,
      }}
    >
      {payload.map((entry, index) => (
        <div
          key={`legend-${index}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#475569",
            fontSize: 12,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: entry.color,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChartsPanel({
  topLevel1Subcategories = [],
  topSubcategories = [],
}) {
  const level1Data = (topLevel1Subcategories || []).filter(
    (item) => Number(item?.fob || 0) > 0
  );

  const detailedData = (topSubcategories || []).filter(
    (item) => Number(item?.fob || 0) > 0
  );

  const pieData = buildPieData(level1Data);

  return (
    <section className="charts-grid">
      <div className="panel chart-panel">
        <div className="section-title-row">
          <h2>Top subcategorias nível 1 por FOB</h2>
        </div>

        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={level1Data}
              margin={{ top: 12, right: 16, left: 8, bottom: 46 }}
            >
              <defs>
                <linearGradient id="barGradientMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                tickFormatter={(value) => truncateLabel(value, 22)}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                interval={0}
                angle={-12}
                textAnchor="end"
                height={56}
              />

              <YAxis
                tickFormatter={formatAxisNumber}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={70}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />

              <Bar
                dataKey="fob"
                name="FOB (US$)"
                fill="url(#barGradientMain)"
                radius={[8, 8, 0, 0]}
                maxBarSize={64}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel chart-panel">
        <div className="section-title-row">
          <h2>Participação das subcategorias nível 1</h2>
        </div>

        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={104}
                innerRadius={58}
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip content={<CustomTooltip />} cursor={false} />

              <Legend
                verticalAlign="bottom"
                align="center"
                content={<CustomLegend />}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel chart-panel full-width">
        <div className="section-title-row">
          <h2>Top subcategorias do recorte atual por FOB</h2>
        </div>

        <div className="chart-box">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={detailedData}
              layout="vertical"
              margin={{ top: 10, right: 22, left: 90, bottom: 10 }}
            >
              <defs>
                <linearGradient id="barGradientSecondary" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#0d9488" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                horizontal={true}
                vertical={false}
              />

              <XAxis
                type="number"
                tickFormatter={formatAxisNumber}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={190}
                tickFormatter={(value) => truncateLabel(value, 28)}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />

              <Bar
                dataKey="fob"
                name="FOB (US$)"
                fill="url(#barGradientSecondary)"
                radius={[0, 8, 8, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
