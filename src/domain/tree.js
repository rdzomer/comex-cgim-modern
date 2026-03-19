function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function cloneNode(node) {
  return {
    ...node,
    metrics: {
      fob: safeNumber(node?.metrics?.fob),
      kg: safeNumber(node?.metrics?.kg),
    },
    children: Array.isArray(node?.children) ? node.children.map(cloneNode) : [],
  };
}

function aggregateMetricsFromChildren(children) {
  return (children || []).reduce(
    (acc, child) => {
      acc.fob += safeNumber(child?.metrics?.fob);
      acc.kg += safeNumber(child?.metrics?.kg);
      return acc;
    },
    { fob: 0, kg: 0 }
  );
}

function getDisplayLabelFromPath(name, level) {
  if (typeof name !== 'string') return '';
  if (!name.includes('>')) return name.trim();

  const parts = name
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return name.trim();

  if (level === 'subcategory-1') return parts[0] || '';
  if (level === 'subcategory-2') return parts.slice(0, 2).join(' > ');
  if (level === 'subcategory-full') return parts.join(' > ');

  return name.trim();
}

function normalizeCategoryNode(node) {
  const category = cloneNode(node);

  category.level = 'category';
  category.children = (category.children || []).map((child) => {
    const sub = cloneNode(child);
    sub.level = 'subcategory';
    sub.children = (sub.children || []).map((grandchild) => {
      const ncm = cloneNode(grandchild);
      ncm.level = 'ncm';
      ncm.children = [];
      return ncm;
    });

    if (!sub.metrics || (!safeNumber(sub.metrics.fob) && !safeNumber(sub.metrics.kg))) {
      sub.metrics = aggregateMetricsFromChildren(sub.children);
    }

    return sub;
  });

  if (!category.metrics || (!safeNumber(category.metrics.fob) && !safeNumber(category.metrics.kg))) {
    category.metrics = aggregateMetricsFromChildren(category.children);
  }

  return category;
}

function ensureNormalizedTree(tree) {
  return (tree || []).map(normalizeCategoryNode);
}

function groupSubcategories(subcategories, mode = 'subcategory-full') {
  if (mode === 'full' || mode === 'ncm') return subcategories;

  const grouped = new Map();

  for (const sub of subcategories) {
    const key = getDisplayLabelFromPath(sub.name, mode) || sub.name || 'Sem nome';

    if (!grouped.has(key)) {
      grouped.set(key, {
        name: key,
        level: 'subcategory',
        metrics: { fob: 0, kg: 0 },
        children: [],
      });
    }

    const bucket = grouped.get(key);
    bucket.metrics.fob += safeNumber(sub.metrics?.fob);
    bucket.metrics.kg += safeNumber(sub.metrics?.kg);

    // Mantemos os NCMs abaixo caso a UI queira expandir depois.
    bucket.children.push(...(sub.children || []));
  }

  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * aggregationLevel:
 * - category
 * - subcategory-1
 * - subcategory-2
 * - subcategory-full
 * - ncm
 */
export function aggregateTreeByLevel(tree, aggregationLevel = 'subcategory-full') {
  const normalized = ensureNormalizedTree(tree);

  return normalized.map((category) => {
    if (aggregationLevel === 'category') {
      return {
        ...category,
        children: [],
        metrics: aggregateMetricsFromChildren(category.children),
      };
    }

    const groupedSubs = groupSubcategories(category.children || [], aggregationLevel);

    if (aggregationLevel !== 'ncm') {
      return {
        ...category,
        children: groupedSubs.map((sub) => ({
          ...sub,
          children: [],
        })),
        metrics: aggregateMetricsFromChildren(groupedSubs),
      };
    }

    return {
      ...category,
      children: groupedSubs,
      metrics: aggregateMetricsFromChildren(groupedSubs),
    };
  });
}

export function flattenTree(tree) {
  const out = [];

  const visit = (node) => {
    out.push(node);
    for (const child of node.children || []) {
      visit(child);
    }
  };

  for (const node of tree || []) {
    visit(node);
  }

  return out;
}

export function getCategoryOptions(tree) {
  return (tree || [])
    .map((node) => node.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function getSubcategoryOptions(tree, selectedCategories = [], aggregationLevel = 'subcategory-full') {
  const allowed = new Set(selectedCategories || []);
  const normalized = ensureNormalizedTree(tree);
  const subs = new Set();

  for (const category of normalized) {
    if (allowed.size && !allowed.has(category.name)) continue;

    const grouped = groupSubcategories(category.children || [], aggregationLevel);

    for (const sub of grouped) {
      if (sub?.name) subs.add(sub.name);
    }
  }

  return [...subs].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function filterTree(tree, selectedCategories = [], selectedSubcategories = []) {
  const categorySet = new Set(selectedCategories || []);
  const subSet = new Set(selectedSubcategories || []);
  const normalized = ensureNormalizedTree(tree);

  return normalized
    .filter((category) => !categorySet.size || categorySet.has(category.name))
    .map((category) => {
      const children = (category.children || []).filter((sub) => !subSet.size || subSet.has(sub.name));
      const metrics = aggregateMetricsFromChildren(children);

      return {
        ...category,
        metrics,
        children,
      };
    })
    .filter((category) => {
      const hasChildren = (category.children || []).length > 0;
      const hasMetrics = safeNumber(category.metrics?.fob) > 0 || safeNumber(category.metrics?.kg) > 0;
      return hasChildren || hasMetrics;
    });
}

export function buildKpis(tree) {
  const flat = flattenTree(tree || []);
  const categories = flat.filter((item) => item.level === 'category').length;
  const subcategories = flat.filter((item) => item.level === 'subcategory').length;
  const ncms = flat.filter((item) => item.level === 'ncm').length;

  const fob = (tree || []).reduce((acc, item) => acc + safeNumber(item?.metrics?.fob), 0);
  const kg = (tree || []).reduce((acc, item) => acc + safeNumber(item?.metrics?.kg), 0);
  const usdPerTon = kg > 0 ? fob / (kg / 1000) : 0;

  return { fob, kg, usdPerTon, categories, subcategories, ncms };
}

export function getTopCategories(tree) {
  return (tree || [])
    .map((item) => ({
      name: item.name,
      fob: safeNumber(item?.metrics?.fob),
      kg: safeNumber(item?.metrics?.kg),
    }))
    .sort((a, b) => b.fob - a.fob)
    .slice(0, 8);
}

export function getTopSubcategories(tree) {
  return (tree || [])
    .flatMap((category) =>
      (category.children || []).map((sub) => ({
        name: sub.name,
        fob: safeNumber(sub?.metrics?.fob),
        kg: safeNumber(sub?.metrics?.kg),
      }))
    )
    .sort((a, b) => b.fob - a.fob)
    .slice(0, 10);
}