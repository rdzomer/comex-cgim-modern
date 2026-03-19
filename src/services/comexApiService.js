const API_URL = 'https://api-comexstat.mdic.gov.br/general';

function extractRows(json) {
  return json?.data?.list?.[0]?.[0] || json?.data?.list || json?.data?.data?.list || [];
}

async function postGeneral(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Falha na API Comex Stat (${response.status}).`);
  const json = await response.json();
  return extractRows(json);
}

export async function fetchYearByNcms(flow, year, ncms) {
  if (!ncms.length) return [];
  const payload = {
    language: 'pt',
    flow: flow === 'export' ? 'exp' : 'imp',
    monthDetail: false,
    period: { yearStart: year, yearEnd: year, monthStart: '01', monthEnd: '12' },
    filters: [{ filter: 'ncm', values: ncms }],
    details: { ncm: true },
    metrics: { metricFOB: true, metricKG: true },
  };

  const rows = await postGeneral(payload);
  return rows.map((row) => ({
    ncm: String(row.ncm || row.coNcm || '').replace(/\D/g, '').padStart(8, '0').slice(0, 8),
    fob: Number(row.metricFOB || row.fob || 0),
    kg: Number(row.metricKG || row.kg || 0),
  }));
}
