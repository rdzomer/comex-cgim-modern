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
        background: "rgba(10,16,38,0.96)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        padding: "10px 12px",
        boxShadow: "0 14px 36px rgba(0,0,0,0.28)",
        color: "#fff",
        minWidth: 180,
      }}
    >
      {label ? (
        <div
          style={{
            fontWeight: 700,
            marginBottom: 8,
            color: "#dfe6ff",
            lineHeight: 1.3,
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
            gap: 12,
            fontSize: 13,
            color: "#eef2ff",
          }}
        >
          <span>{entry.name}</span>
          <strong>{formatMoney(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
}

const PIE_COLORS = [
  "#7C9CFF",
  "#5EEAD4",
  "#A78BFA",
  "#F59E0B",
  "#FB7185",
  "#38BDF8",
  "#4ADE80",
  "#F472B6",
  "#C084FC",
  "#FACC15",
];

function CustomLegend({ payload = [] }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
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
            gap: 8,
            color: "#dbe3ff",
            fontSize: 12,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: entry.color,
              display: "inline-block",
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
                  <stop offset="0%" stopColor="#8BA5FF" />
                  <stop offset="100%" stopColor="#5B7CFA" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.10)"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                tickFormatter={(value) => truncateLabel(value, 22)}
                tick={{ fill: "#dbe3ff", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.18)" }}
                tickLine={false}
                interval={0}
                angle={-12}
                textAnchor="end"
                height={56}
              />

              <YAxis
                tickFormatter={formatAxisNumber}
                tick={{ fill: "#dbe3ff", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={70}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />

              <Bar
                dataKey="fob"
                name="FOB (US$)"
                fill="url(#barGradientMain)"
                radius={[10, 10, 0, 0]}
                maxBarSize={72}
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
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={1}
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
                  <stop offset="0%" stopColor="#5EEAD4" />
                  <stop offset="100%" stopColor="#2DD4BF" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.10)"
                horizontal={true}
                vertical={false}
              />

              <XAxis
                type="number"
                tickFormatter={formatAxisNumber}
                tick={{ fill: "#dbe3ff", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={190}
                tickFormatter={(value) => truncateLabel(value, 28)}
                tick={{ fill: "#dbe3ff", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />

              <Bar
                dataKey="fob"
                name="FOB (US$)"
                fill="url(#barGradientSecondary)"
                radius={[0, 10, 10, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}