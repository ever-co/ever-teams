import { useState, useMemo } from 'react';

export type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

type SortableColumn<T> = {
  getValue: (data: T) => any;
  compare: (a: any, b: any) => number;
};

export type SortableColumns<T> = {
  [key: string]: SortableColumn<T>;
};

export function useSortableData<T>(
  items: T[],
  sortableColumns: SortableColumns<T>,
  config: SortConfig = null
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(config);

  const sortedItems = useMemo(() => {
    if (!sortConfig) return items;

    const column = sortableColumns[sortConfig.key];
    if (!column) return items;

    return [...items].sort((a, b) => {
      const valueA = column.getValue(a);
      const valueB = column.getValue(b);
      const comparison = column.compare(valueA, valueB);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [items, sortConfig, sortableColumns]);

  const requestSort = (key: string) => {
    setSortConfig((currentConfig) => {
      if (!currentConfig || currentConfig.key !== key) {
        return { key, direction: 'asc' };
      }
      if (currentConfig.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  return {
    items: sortedItems,
    sortConfig,
    requestSort,
    setSortConfig
  };
}
