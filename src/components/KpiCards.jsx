import React from "react";

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatKg(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function Card({ title, value, helper }) {
  return (
    <div className="kpi-card">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {helper ? <div className="kpi-helper">{helper}</div> : null}
    </div>
  );
}

export default function KpiCards({ kpis }) {
  return (
    <section className="kpi-grid">
      <Card title="FOB total" value={formatMoney(kpis?.fob)} />
      <Card title="KG total" value={formatKg(kpis?.kg)} />
      <Card title="US$/ton" value={formatMoney(kpis?.usdPerTon)} />
      <Card
        title="Estrutura"
        value={`${kpis?.categories || 0} cat.`}
        helper={`${kpis?.subcategories || 0} subcat. • ${kpis?.ncms || 0} NCMs`}
      />
    </section>
  );
}