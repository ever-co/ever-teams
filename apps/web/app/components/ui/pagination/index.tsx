'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    totalItems?: number;
    pageSize?: number;
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    onPageSizeChange,
    totalItems,
    pageSize = 10,
    className = ''
}: PaginationProps) {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems || 0);

    const goToFirstPage = () => onPageChange(1);
    const goToPreviousPage = () => onPageChange(currentPage - 1);
    const goToNextPage = () => onPageChange(currentPage + 1);
    const goToLastPage = () => onPageChange(totalPages);
    const goToPage = (page: number) => onPageChange(page);

    const getVisiblePages = () => {
        const delta = 2; // Number of pages to show before and after current page
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= currentPage - delta && i <= currentPage + delta)
            ) {
                range.push(i);
            }
        }

        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    };

    return (
        <div className={`flex gap-4 justify-between items-center p-2 sm:flex-row ${className}`}>
            <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon" onClick={goToFirstPage} disabled={currentPage === 1}>
                    <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goToPreviousPage} disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex gap-1 items-center overflow-x-auto max-w-[300px] p-1">
                    {getVisiblePages().map((page, index) => (
                        page === '...' ? (
                            <span key={`dot-${index}`} className="px-2">...</span>
                        ) : (
                            <Button
                                key={page}
                                variant="outline"
                                size="sm"
                                onClick={() => goToPage(page as number)}
                                className={currentPage === page ? 'bg-primary text-primary-foreground' : ''}
                            >
                                {page}
                            </Button>
                        )
                    ))}
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                >
                    <ChevronsRight className="w-4 h-4" />
                </Button>
            </div>
            {totalItems !== undefined && (
                <div className="text-sm text-center text-[#111827] dark:text-gray-400 sm:text-left">
                    Showing {startIndex + 1} to {endIndex} of {totalItems} entries
                </div>
            )}
        </div>
    );
}
