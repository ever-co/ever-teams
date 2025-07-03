import { useCallback, useMemo, useState } from 'react';
import { useOrganizationProjects } from './use-organization-projects';
import { ProjectQueryParams } from '@/core/services/client/api/organizations';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

/**
 * Specialized hook for the projects page with enhanced filtering and pagination
 * This hook wraps useOrganizationProjects and provides page-specific functionality
 */
export function useProjectsPage() {
	const {
		organizationProjectsWithPagination,
		paginationParams,
		updatePaginationParams,
		resetPagination,
		loadNextPage,
		loadPreviousPage,
		getOrganizationProjectsWithPaginationLoading,
		organizationProjectsWithPaginationData,
		...otherHookData
	} = useOrganizationProjects();

	// Page-specific state
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
	const [showArchived, setShowArchived] = useState(false);
	const [dateRange, setDateRange] = useState<DateRange | null>(null);

	// Apply filters to pagination params
	const applyFilters = useCallback(() => {
		const filters: Partial<ProjectQueryParams> = {
			skip: 0 // Reset to first page when applying filters
		};

		if (searchTerm) {
			filters.search = searchTerm;
		}

		if (selectedTeamId) {
			filters.teamId = selectedTeamId;
		}

		if (showArchived !== undefined) {
			filters.archived = showArchived;
		}

		if (dateRange?.from) {
			filters.startDate = format(dateRange.from, 'yyyy-MM-dd');
		}

		if (dateRange?.to) {
			filters.endDate = format(dateRange.to, 'yyyy-MM-dd');
		}

		updatePaginationParams(filters);
	}, [searchTerm, selectedTeamId, showArchived, dateRange, updatePaginationParams]);

	// Auto-apply filters when they change
	const debouncedApplyFilters = useCallback(() => {
		const timeoutId = setTimeout(applyFilters, 300);
		return () => clearTimeout(timeoutId);
	}, [applyFilters]);

	// Computed values
	const currentPage = useMemo(() => {
		const skip = paginationParams.skip || 0;
		const take = paginationParams.take || 20;
		return Math.floor(skip / take) + 1;
	}, [paginationParams.skip, paginationParams.take]);

	const totalPages = useMemo(() => {
		const total = organizationProjectsWithPaginationData?.total || 0;
		const take = paginationParams.take || 20;
		return Math.ceil(total / take);
	}, [organizationProjectsWithPaginationData?.total, paginationParams.take]);

	const hasNextPage = useMemo(() => {
		return currentPage < totalPages;
	}, [currentPage, totalPages]);

	const hasPreviousPage = useMemo(() => {
		return currentPage > 1;
	}, [currentPage]);

	// Enhanced pagination functions
	const goToPage = useCallback(
		(page: number) => {
			const take = paginationParams.take || 20;
			const skip = (page - 1) * take;
			updatePaginationParams({ skip });
		},
		[paginationParams.take, updatePaginationParams]
	);

	const changePageSize = useCallback(
		(newPageSize: number) => {
			updatePaginationParams({ take: newPageSize, skip: 0 });
		},
		[updatePaginationParams]
	);

	// Filter management
	const clearAllFilters = useCallback(() => {
		setSearchTerm('');
		setSelectedTeamId(null);
		setShowArchived(false);
		setDateRange(null);
		resetPagination();
	}, [resetPagination]);

	const setFilters = useCallback(
		(filters: { search?: string; teamId?: string | null; archived?: boolean; dateRange?: DateRange | null }) => {
			if (filters.search !== undefined) setSearchTerm(filters.search);
			if (filters.teamId !== undefined) setSelectedTeamId(filters.teamId);
			if (filters.archived !== undefined) setShowArchived(filters.archived);
			if (filters.dateRange !== undefined) setDateRange(filters.dateRange);
		},
		[]
	);

	return {
		// Data
		projects: organizationProjectsWithPaginationData?.items || [],
		totalProjects: organizationProjectsWithPaginationData?.total || 0,
		isLoading: getOrganizationProjectsWithPaginationLoading,

		// Pagination
		currentPage,
		totalPages,
		hasNextPage,
		hasPreviousPage,
		pageSize: paginationParams.take || 20,

		// Pagination actions
		loadNextPage,
		loadPreviousPage,
		goToPage,
		changePageSize,

		// Filters
		searchTerm,
		selectedTeamId,
		showArchived,
		dateRange,

		// Filter actions
		setSearchTerm,
		setSelectedTeamId,
		setShowArchived,
		setDateRange,
		setFilters,
		clearAllFilters,
		applyFilters,
		debouncedApplyFilters,

		// Original hook data for backward compatibility
		...otherHookData
	};
}
