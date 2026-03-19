import { fetchYearByNcms } from './comexApiService';
import { buildTreeFromRows, mergeSeries } from '../domain/mergeOfflineWithIncremental';

export async function tryRefreshCurrentYear({ flow, year, snapshot, dictionaryRows }) {
  const currentYear = new Date().getFullYear();
  const baseSeries = snapshot.charts[flow === 'import' ? 'importSeries' : 'exportSeries'];
  if (year !== currentYear) {
    return { tree: snapshot.trees[flow], series: baseSeries, applied: false };
  }

  const ncms = [...new Set(dictionaryRows.map((row) => row.ncm))];
  try {
    const rows = await fetchYearByNcms(flow, year, ncms);
    if (!rows.length) throw new Error('sem linhas');
    const tree = buildTreeFromRows(rows, dictionaryRows);
    const totals = tree.reduce((acc, item) => ({ fob: acc.fob + item.metrics.fob, kg: acc.kg + item.metrics.kg }), { fob: 0, kg: 0 });
    return { tree, series: mergeSeries(baseSeries, year, totals), applied: true };
  } catch {
    return { tree: snapshot.trees[flow], series: baseSeries, applied: false };
  }
}
