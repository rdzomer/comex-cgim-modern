import React, { useMemo, useState } from "react";

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

function formatUsdPerTon(fob, kg) {
  const numFob = Number(fob || 0);
  const numKg = Number(kg || 0);

  if (!numKg) return "—";

  const value = numFob / (numKg / 1000);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getNodeKey(node, parentKey = "") {
  return `${parentKey}::${node.level || "node"}::${node.name || "sem-nome"}`;
}

function ExpandButton({ isOpen, hasChildren, onClick }) {
  if (!hasChildren) {
    return <span className="tree-chevron tree-chevron-placeholder">•</span>;
  }

  return (
    <button
      type="button"
      className="tree-chevron"
      onClick={onClick}
      aria-label={isOpen ? "Recolher linha" : "Expandir linha"}
      title={isOpen ? "Recolher" : "Expandir"}
    >
      {isOpen ? "▾" : "▸"}
    </button>
  );
}

function TreeRow({
  node,
  levelClass,
  expandedKeys,
  toggleKey,
  parentKey = "",
}) {
  const nodeKey = getNodeKey(node, parentKey);
  const children = Array.isArray(node.children) ? node.children : [];
  const hasChildren = children.length > 0;
  const isOpen = expandedKeys.has(nodeKey);

  return (
    <>
      <tr className={`tree-row tree-row-${node.level || "node"}`}>
        <td className={`tree-name ${levelClass}`}>
          <div className="tree-cell-content">
            <ExpandButton
              isOpen={isOpen}
              hasChildren={hasChildren}
              onClick={() => toggleKey(nodeKey)}
            />
            <span className="tree-label">{node.name}</span>
          </div>
        </td>

        <td className="num">{formatMoney(node.metrics?.fob)}</td>
        <td className="num">{formatKg(node.metrics?.kg)}</td>
        <td className="num">{formatUsdPerTon(node.metrics?.fob, node.metrics?.kg)}</td>
      </tr>

      {hasChildren && isOpen
        ? children.map((child) => (
            <TreeRow
              key={getNodeKey(child, nodeKey)}
              node={child}
              levelClass={
                child.level === "subcategory"
                  ? "level-subcategory"
                  : child.level === "ncm"
                  ? "level-ncm"
                  : "level-category"
              }
              expandedKeys={expandedKeys}
              toggleKey={toggleKey}
              parentKey={nodeKey}
            />
          ))
        : null}
    </>
  );
}

export default function HierarchyTable({ tree = [] }) {
  const initialExpanded = useMemo(() => {
    const keys = new Set();

    // começa com categorias abertas para ficar útil de imediato
    for (const category of tree || []) {
      keys.add(getNodeKey(category, ""));
    }

    return keys;
  }, [tree]);

  const [expandedKeys, setExpandedKeys] = useState(initialExpanded);

  React.useEffect(() => {
    setExpandedKeys(initialExpanded);
  }, [initialExpanded]);

  function toggleKey(key) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function expandAll() {
    const keys = new Set();

    function visit(node, parentKey = "") {
      const key = getNodeKey(node, parentKey);
      if (node.children?.length) {
        keys.add(key);
        node.children.forEach((child) => visit(child, key));
      }
    }

    (tree || []).forEach((node) => visit(node));
    setExpandedKeys(keys);
  }

  function collapseAll() {
    setExpandedKeys(new Set());
  }

  return (
    <section className="panel table-panel">
      <div className="section-title-row">
        <h2>Tabela hierárquica</h2>

        <div className="table-actions">
          <button type="button" className="table-action-btn" onClick={expandAll}>
            Expandir tudo
          </button>
          <button type="button" className="table-action-btn" onClick={collapseAll}>
            Recolher tudo
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="hierarchy-table">
          <thead>
            <tr>
              <th>Estrutura</th>
              <th>FOB (US$)</th>
              <th>KG</th>
              <th>US$/ton</th>
            </tr>
          </thead>

          <tbody>
            {(tree || []).map((category) => (
              <TreeRow
                key={getNodeKey(category)}
                node={category}
                levelClass="level-category"
                expandedKeys={expandedKeys}
                toggleKey={toggleKey}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}