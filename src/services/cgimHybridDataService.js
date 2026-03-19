import { loadDictionary } from './cgimDictionaryService';
import { getSnapshotFile, getYearsForEntity, loadSnapshotByFile, loadSnapshotManifest } from './cgimOfflineSnapshotService';
import { tryRefreshCurrentYear } from './cgimIncrementalUpdateService';
import { getCached, setCached } from './cacheService';

export async function getHybridEntityDataset(entity, year, flow) {
  const cacheKey = `hybrid:${entity}:${year}:${flow}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [manifest, dictionary] = await Promise.all([loadSnapshotManifest(), loadDictionary()]);
  const file = getSnapshotFile(manifest, entity, year);
  if (!file) throw new Error(`Snapshot não encontrado para ${entity} ${year}.`);

  const snapshot = await loadSnapshotByFile(file);
  const dictionaryRows = dictionary.entriesByEntity[entity] || [];
  const refreshed = await tryRefreshCurrentYear({ flow, year, snapshot, dictionaryRows });

  const dataset = {
    entity,
    year,
    flow,
    tree: refreshed.tree,
    series: refreshed.series,
    availableYears: getYearsForEntity(manifest, entity),
    snapshotUpdatedAt: snapshot.updatedAt || null,
    source: refreshed.applied ? 'offline+refresh' : 'offline',
    refreshApplied: refreshed.applied,
  };

  setCached(cacheKey, dataset);
  return dataset;
}
