'use client';

import { useEffect, useState } from 'react';
import { Block, BlockStorageService, BuilderPlatform } from './storage';
import { BlocksListHeader } from './blocks-list-header';
import { BlocksListTable } from './blocks-list-table';
import { BlocksListEmpty } from './blocks-list-empty';
import { BlocksListError } from './blocks-list-error';
import { BlocksListLoading } from './blocks-list-loading';
import styles from './blocks-list.module.css';
import { PlatformSelectionModal } from './platform-selection-modal';
import { useBlocks } from './use-blocks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../src/components/ui/select';
import { Calendar } from '@ever-teams/toolkit-ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../src/components/ui/dialog';
import { Button } from '../../src/components/ui/button';
import { SlidersHorizontal, Plus, Search, AlertCircle } from 'lucide-react';
import { Input } from '../../src/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { TENANT } from '../constants';
import { cn } from '@/lib/utils';

interface BlocksListProps { }

export type SortField = 'title' | 'builderPlatform' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

interface FilterUIProps {
    searchTitle: string;
    onSearchChange: (value: string) => void;
    selectedPlatform: BuilderPlatform | null;
    onPlatformChange: (platform: BuilderPlatform | null) => void;
    dateRange: { from: Date | undefined; to: Date | undefined };
    onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
    dateType: 'created' | 'modified';
    onDateTypeChange: (type: 'created' | 'modified') => void;
    onAddClick: () => void;
    onResetFilters: () => void;
    isCreating: boolean;
    disabled?: boolean;
}

const FilterUI: React.FC<FilterUIProps> = ({
    searchTitle,
    onSearchChange,
    selectedPlatform,
    onPlatformChange,
    dateRange,
    onDateRangeChange,
    dateType,
    onDateTypeChange,
    onAddClick,
    onResetFilters,
    isCreating,
    disabled = false
}) => {
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    return (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 w-full sm:max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search blocks by title..."
                        value={searchTitle}
                        onChange={(e) => onSearchChange(e.target.value)}
                        disabled={disabled}
                        className="w-full pl-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setIsFilterModalOpen(true)}
                        disabled={disabled}
                        className="flex items-center gap-2 h-11 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                    </Button>
                    <Button
                        onClick={onAddClick}
                        disabled={isCreating || disabled}
                        size="lg"
                        className="flex items-center gap-2 h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                    >
                        <Plus className="h-4 w-4" />
                        Add Block
                    </Button>
                </div>
            </div>

            <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold dark:text-white">Filter Blocks</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-3">
                            <label htmlFor="platform" className="text-sm font-medium text-slate-700 dark:text-slate-300">Platform</label>
                            <Select value={selectedPlatform || 'all'} onValueChange={(value) => onPlatformChange(value === 'all' ? null : value as BuilderPlatform)} disabled={disabled}>
                                <SelectTrigger id="platform" className="h-11 dark:text-white dark:placeholder:text-white">
                                    <SelectValue placeholder="Select Platform" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="dark:text-white">All Platforms</SelectItem>
                                    {Object.values(BuilderPlatform).map(platform => (
                                        <SelectItem key={platform} value={platform} className="dark:text-white">{platform}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-3">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date Range</label>
                            <div className="flex gap-2">
                                <Button
                                    variant={dateType === 'created' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => onDateTypeChange('created')}
                                    className={cn(
                                        "flex-1 h-9",
                                        dateType === 'created'
                                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                                            : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white"
                                    )}
                                >
                                    Created Date
                                </Button>
                                <Button
                                    variant={dateType === 'modified' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => onDateTypeChange('modified')}
                                    className={cn(
                                        "flex-1 h-9",
                                        dateType === 'modified'
                                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                                            : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white"
                                    )}
                                >
                                    Modified Date
                                </Button>
                            </div>
                            <Calendar
                                mode="range"
                                selected={{ from: dateRange.from, to: dateRange.to }}
                                onSelect={(range) => onDateRangeChange({ from: range?.from, to: range?.to })}
                                className="rounded-lg border border-slate-200 dark:border-slate-700 w-full"
                                classNames={{
                                    caption: "flex justify-center pt-1 relative items-center text-slate-900 dark:text-white",
                                    caption_label: "text-sm font-medium text-slate-900 dark:text-white",
                                    months: "w-full",
                                    month: "w-full",
                                    table: "w-full border-collapse space-y-1",
                                    head_row: "flex w-full mt-2",
                                    head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem]",
                                    row: "flex w-full mt-2",
                                    cell: "flex-1 h-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20"
                                }}
                                disabled={disabled}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                onResetFilters();
                                setIsFilterModalOpen(false);
                            }}
                            className="h-10 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white"
                        >
                            Reset Filters
                        </Button>
                        <Button
                            onClick={() => setIsFilterModalOpen(false)}
                            className="h-10 bg-blue-600 hover:bg-blue-700"
                        >
                            Apply Filters
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export const BlocksList = () => {
    const storageService = new BlockStorageService();
    const {
        blocks,
        loading,
        error,
        pagination,
        filters,
        setPage,
        setPageSize,
        setSearch,
        setPlatform,
        setSort,
        createBlock,
        deleteBlock,
        refresh
    } = useBlocks(storageService, {
        tenantId: TENANT.ID,
        orgId: TENANT.ORG_ID
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [dateType, setDateType] = useState<'created' | 'modified'>('created');
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined
    });

    const handleSort = (field: SortField) => {
        if (field === filters.sortField) {
            setSort(field, filters.sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSort(field, 'asc');
        }
    };

    const handleAddClick = () => {
        setIsModalOpen(true);
        setCreateError(null);
    };

    const handleModalCancel = () => {
        setIsModalOpen(false);
        setCreateError(null);
    };

    const handleModalConfirm = async (params: {
        platform: BuilderPlatform;
        title: string;
        url?: string;
        plasmicProjectId?: string;
    }) => {
        setIsCreating(true);
        setCreateError(null);
        try {
            await createBlock(params);
            setIsModalOpen(false);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Failed to create block');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (blockId: string) => {
        try {
            await deleteBlock(blockId);
        } catch (err) {
            console.error('Failed to delete block:', err instanceof Error ? err.message : 'Unknown error');
        }
    };

    const handleResetFilters = () => {
        setSearch('');
        setPlatform(null);
        setPage(1);
        setDateType('created');
        setDateRange({ from: undefined, to: undefined });
    };

    const renderContent = () => {
        if (loading) {
            return <BlocksListLoading />;
        }

        if (error) {
            return <BlocksListError error={error instanceof Error ? error.message : String(error)} onRetry={refresh} />;
        }

        if (!Array.isArray(blocks) || blocks.length === 0) {
            return <BlocksListEmpty onCreate={handleAddClick} />;
        }

        return (
            <>
                <BlocksListTable
                    blocks={blocks}
                    onDelete={handleDelete}
                    header={
                        <BlocksListHeader
                            sortField={filters.sortField as SortField}
                            sortDirection={filters.sortDirection}
                            onSort={handleSort}
                        />
                    }
                />
                <div className="mt-4">
                    <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.totalItems}
                        pageSize={pagination.pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                    />
                </div>
            </>
        );
    };

    return (
        <>
            <PlatformSelectionModal
                isOpen={isModalOpen}
                onCancelAction={handleModalCancel}
                onConfirmAction={handleModalConfirm}
            />
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                        Blocks Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Create, manage, and organize your content blocks
                    </p>
                    {createError && (
                        <div className="mt-2 text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-4 py-2 rounded-lg">
                            {createError}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <FilterUI
                            searchTitle={filters.search}
                            onSearchChange={setSearch}
                            selectedPlatform={filters.platform}
                            onPlatformChange={setPlatform}
                            dateRange={dateRange}
                            onDateRangeChange={setDateRange}
                            dateType={dateType}
                            onDateTypeChange={setDateType}
                            onAddClick={handleAddClick}
                            onResetFilters={handleResetFilters}
                            isCreating={isCreating}
                            disabled={loading}
                        />
                    </div>
                    <div className="p-6">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </>
    );
};
