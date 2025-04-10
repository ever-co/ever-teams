import { useEffect, useRef, useState } from 'react';

export function usePagination<T>(items: T[], defaultItemsPerPage = 5) {
  const [itemOffset, setItemOffset] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [filteredItems, setFilteredItems] = useState<T[]>([]);
  const [hasUserSelectedFilter, setHasUserSelectedFilter] = useState(false);
  const ITEMS_PER_PAGE_VIEW = 5;

  const totalItems = items?.length || 0;

  useEffect(() => {
    if (!hasUserSelectedFilter) {
      setFilteredItems(items || []);
    }
  }, [items, hasUserSelectedFilter]);

  useEffect(() => {
    if (hasUserSelectedFilter) {
      const itemsToShow = Math.min(itemsPerPage, totalItems);
      setFilteredItems(items?.slice(0, itemsToShow) || []);
      setItemOffset(0);
    }
  }, [items, itemsPerPage, totalItems, hasUserSelectedFilter]);

  const filteredTotal = filteredItems.length;

  const endOffset = Math.min(itemOffset + ITEMS_PER_PAGE_VIEW, filteredTotal);

  const currentItems = filteredItems.slice(itemOffset, endOffset);

  const pageCount = Math.ceil(filteredTotal / ITEMS_PER_PAGE_VIEW);

  const onPageChange = (selectedItem: { selected: number }) => {
    const newOffset =  filteredTotal === 0 ? 0 :(selectedItem.selected * ITEMS_PER_PAGE_VIEW) % filteredTotal;
    setItemOffset(newOffset);
  };

  const setItemsPerPageWithFlag = (value: React.SetStateAction<number>) => {
    setHasUserSelectedFilter(true);
    setItemsPerPage(value);
  };

  return {
    total: filteredTotal,
    totalAll: totalItems,
    onPageChange,
    itemsPerPage,
    itemOffset,
    endOffset,
    setItemsPerPage: setItemsPerPageWithFlag,
    currentItems,
    setItemOffset,
    pageCount
  };
}

export function useScrollPagination<T>({
  enabled,
  defaultItemsPerPage = 10,
  items,
  scrollableElement
}: {
  items: T[];
  enabled?: boolean;
  defaultItemsPerPage?: number;
  scrollableElement?: HTMLElement | null;
}) {
  const [slicedItems, setSlicedItems] = useState(items.slice(0, defaultItemsPerPage));
  const [page, setPage] = useState(1);

  const $scrollableElement = useRef<HTMLElement | null>(null);

  $scrollableElement.current = scrollableElement || $scrollableElement.current;

  useEffect(() => {
    if (enabled) {
      setPage(1);
      setSlicedItems(items.slice(0, defaultItemsPerPage));
    }
  }, [enabled, items, defaultItemsPerPage]);

  useEffect(() => {
    const container = $scrollableElement.current;
    if (!container || !enabled) return;

    const handleScroll = () => {
      if (
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 100 // Adjust this value for how close to the bottom you want to trigger loading
      ) {
        setPage((prevPage) => prevPage + 1);
      }
    };

    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [$scrollableElement.current, enabled]);

  useEffect(() => {
    const newItems = items.slice(0, defaultItemsPerPage * page);
    if (items.length > newItems.length) {
      setSlicedItems((prevItems) => (prevItems.length === newItems.length ? prevItems : newItems));
    }
  }, [page, items, defaultItemsPerPage]);

  return {
    slicedItems: enabled ? slicedItems : items,
    scrollableElement: $scrollableElement
  };
}
