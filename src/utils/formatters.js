export function formatInteger(value) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value || 0);
}

export function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatUsdPerTon(value) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value || 0)} US$/t`;
}

export function normalizeEntityLabel(entity) {
  return String(entity).replace(/#U00c1/g, 'Á').replace(/_/g, ' ');
}
