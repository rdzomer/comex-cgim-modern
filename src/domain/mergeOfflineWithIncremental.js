function slug(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function buildTreeFromRows(rows, dictionaryRows) {
  const dict = new Map(dictionaryRows.map((row) => [row.ncm, row]));
  const categories = new Map();

  for (const row of rows) {
    const mapping = dict.get(row.ncm);
    const categoria = mapping?.categoria || 'Sem categoria';
    const subcategoria = mapping?.subcategoria || 'Sem subcategoria';

    if (!categories.has(categoria)) {
      categories.set(categoria, {
        id: `cat:${slug(categoria)}`,
        level: 'category',
        name: categoria,
        metrics: { fob: 0, kg: 0 },
        children: [],
      });
    }

    const category = categories.get(categoria);
    let sub = category.children.find((item) => item.name === subcategoria);
    if (!sub) {
      sub = {
        id: `sub:${slug(categoria)}:${slug(subcategoria)}`,
        level: 'subcategory',
        name: subcategoria,
        metrics: { fob: 0, kg: 0 },
        children: [],
      };
      category.children.push(sub);
    }

    sub.children.push({
      id: `ncm:${row.ncm}`,
      level: 'ncm',
      name: row.ncm,
      metrics: { fob: row.fob, kg: row.kg },
      meta: { categoria, subcategoria, ncm: row.ncm },
    });

    sub.metrics.fob += row.fob;
    sub.metrics.kg += row.kg;
    category.metrics.fob += row.fob;
    category.metrics.kg += row.kg;
  }

  return [...categories.values()]
    .map((category) => ({
      ...category,
      children: [...category.children].sort((a, b) => b.metrics.fob - a.metrics.fob),
    }))
    .sort((a, b) => b.metrics.fob - a.metrics.fob);
}

export function mergeSeries(baseSeries, year, totals) {
  const updated = [...baseSeries];
  const usdPerTon = totals.kg > 0 ? totals.fob / (totals.kg / 1000) : 0;
  const index = updated.findIndex((item) => item.year === year);
  if (index >= 0) updated[index] = { year, fob: totals.fob, kg: totals.kg, usdPerTon };
  else updated.push({ year, fob: totals.fob, kg: totals.kg, usdPerTon });
  return updated.sort((a, b) => a.year - b.year);
}
