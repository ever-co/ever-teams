'use client';

import { useState, useMemo } from 'react';

interface UsePaginationProps {
    totalItems: number;
    initialPageSize?: number;
    initialPage?: number;
}

interface UsePaginationReturn {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    startIndex: number;
    endIndex: number;
    setCurrentPage: (page: number) => void;
    setPageSize: (size: number) => void;
    paginatedData: <T>(data: T[]) => T[];
}

export function usePagination({
    totalItems,
    initialPageSize = 10,
    initialPage = 1
}: UsePaginationProps): UsePaginationReturn {
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    const paginatedData = useMemo(() => {
        return <T>(data: T[]): T[] => {
            return data.slice(startIndex, endIndex);
        };
    }, [startIndex, endIndex]);

    return {
        currentPage,
        totalPages,
        pageSize,
        startIndex,
        endIndex,
        setCurrentPage,
        setPageSize: handlePageSizeChange,
        paginatedData
    };
}
