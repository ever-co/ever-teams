import { useState, useEffect, useCallback } from 'react';
import type { Block } from './storage/block-storage-service';
import type { BlockConfig, BuilderIoConfig, PlasmicConfig, CraftJSConfig, GrapesJSConfig } from './storage/types';
import { BlockStorageService, BuilderPlatform } from './storage/block-storage-service';

interface UseBlocksOptions {
    tenantId: string;
    orgId: string;
}

interface UseBlocksResult {
    blocks: Block[];
    loading: boolean;
    error: Error | null;
    pagination: {
        currentPage: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
    filters: {
        search: string;
        platform: BuilderPlatform | null;
        sortField: string;
        sortDirection: 'asc' | 'desc';
    };
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    setSearch: (search: string) => void;
    setPlatform: (platform: BuilderPlatform | null) => void;
    setSort: (field: string, direction: 'asc' | 'desc') => void;
    createBlock: (params: {
        platform: BuilderPlatform;
        title: string;
        url?: string;
        plasmicProjectId?: string;
    }) => Promise<void>;
    deleteBlock: (blockId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useBlocks(
    storageService: BlockStorageService,
    { tenantId, orgId }: UseBlocksOptions
): UseBlocksResult {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState({
        search: '',
        platform: null as BuilderPlatform | null,
        sortField: 'createdAt',
        sortDirection: 'desc' as 'asc' | 'desc',
    });

    const fetchBlocks = useCallback(async () => {
        try {
            setLoading(true);
            // Get blocks directly from localStorage first
            const storageKey = `teams_blocks_${tenantId}_${orgId}`;
            const storedData = localStorage.getItem(storageKey);
            let allBlocks: Block[] = [];

            if (storedData) {
                allBlocks = JSON.parse(storedData);
                // Convert string dates back to Date objects
                allBlocks = allBlocks.map(block => ({
                    ...block,
                    createdAt: new Date(block.createdAt),
                    updatedAt: new Date(block.updatedAt)
                }));
            }

            let filtered = allBlocks;
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                filtered = filtered.filter((block) =>
                    block.title.toLowerCase().includes(searchLower)
                );
            }
            if (filters.platform) {
                filtered = filtered.filter(
                    (block) => block.builderPlatform === filters.platform
                );
            }

            filtered = [...filtered].sort((a, b) => {
                const aValue = a[filters.sortField as keyof Block];
                const bValue = b[filters.sortField as keyof Block];
                if (aValue == null || bValue == null) return 0;
                if (aValue instanceof Date && bValue instanceof Date) {
                    return filters.sortDirection === 'asc'
                        ? aValue.getTime() - bValue.getTime()
                        : bValue.getTime() - aValue.getTime();
                }
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return filters.sortDirection === 'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }
                return 0;
            });

            const totalItems = filtered.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / pagination.pageSize));
            const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
            const endIndex = startIndex + pagination.pageSize;
            const paginated = filtered.slice(startIndex, endIndex);

            setBlocks(paginated);
            setPagination((prev) => ({
                ...prev,
                totalItems,
                totalPages,
            }));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch blocks'));
        } finally {
            setLoading(false);
        }
    }, [tenantId, orgId, pagination.currentPage, pagination.pageSize, filters]);

    useEffect(() => {
        fetchBlocks();
    }, [fetchBlocks]);

    const setPage = useCallback((page: number) => {
        setPagination((prev) => ({ ...prev, currentPage: Math.max(1, Math.min(page, prev.totalPages)) }));
    }, []);

    const setPageSize = useCallback((pageSize: number) => {
        setPagination((prev) => ({ ...prev, pageSize, currentPage: 1 }));
    }, []);

    const setSearch = useCallback((search: string) => {
        setFilters((prev) => ({ ...prev, search }));
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, []);

    const setPlatform = useCallback((platform: BuilderPlatform | null) => {
        setFilters((prev) => ({ ...prev, platform }));
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, []);

    const setSort = useCallback((field: string, direction: 'asc' | 'desc') => {
        setFilters((prev) => ({ ...prev, sortField: field, sortDirection: direction }));
    }, []);

    const createBlock = async (params: {
        platform: BuilderPlatform;
        title: string;
        url?: string;
        plasmicProjectId?: string;
    }) => {
        try {
            setLoading(true);

            let config: BlockConfig = {};

            switch (params.platform) {
                case BuilderPlatform.BuilderIO:
                    config = {
                        builderIoPageUrl: params.url || '/builder/default'
                    } as BuilderIoConfig;
                    break;
                case BuilderPlatform.Plasmic:
                    config = {
                        plasmicProjectId: params.plasmicProjectId || ''
                    } as PlasmicConfig;
                    break;
                case BuilderPlatform.GrapesJS:
                    config = {} as GrapesJSConfig;
                    break;
                case BuilderPlatform.CraftJS:
                    config = {} as CraftJSConfig;
                    break;
                default:
                    config = {};
                    break;
            }

            const blockData = {
                title: params.title,
                builderPlatform: params.platform,
                config
            };

            const { error: createError } = await storageService.createBlock(
                { tenantId, orgId },
                blockData
            );
            if (createError) throw new Error(createError);
            await fetchBlocks();
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to create block'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteBlock = async (blockId: string) => {
        try {
            setLoading(true);
            const { error: deleteError } = await storageService.deleteBlock(
                { tenantId, orgId },
                blockId
            );
            if (deleteError) throw new Error(deleteError);
            await fetchBlocks();
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to delete block'));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
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
        refresh: fetchBlocks,
    };
}
