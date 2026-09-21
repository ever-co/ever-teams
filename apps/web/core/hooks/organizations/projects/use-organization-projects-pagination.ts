'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { queryKeys } from '@/core/query/keys';
import { useInvalidateOrganizationProjects } from './use-invalidate-organization-projects';
import { useScopeGuard } from '../../bootstrap/use-scope-guard';
import { useUserQuery } from '../../queries/user-user.query';
import { useReactiveAccessTokenCookie } from '../../auth/use-reactive-access-token-cookie';
import { CREDENTIAL_SCOPED_QUERY_META } from '@/core/query/credential-query';

/** Simple pagination params type */
export interface PaginationParams {
	skip?: number;
	take?: number;
}

interface UseOrganizationProjectsPaginationOptions {
	enabled?: boolean;
}

/**
 * Hook for paginated organization projects fetching with navigation helpers.
 *
 * @returns {Object} An object containing:
 * - `organizationProjectsWithPagination` - React Query result for paginated projects
 * - `organizationProjectsWithPaginationData` - Shortcut to pagination query data
 * - `getOrganizationProjectsWithPaginationLoading` - Loading state
 * - `paginationParams` - Current pagination state
 * - `updatePaginationParams` - Update pagination params (partial merge)
 * - `resetPagination` - Reset to first page with default page size
 * - `loadNextPage` - Navigate to next page
 * - `loadPreviousPage` - Navigate to previous page
 */
export function useOrganizationProjectsPagination({ enabled = true }: UseOrganizationProjectsPaginationOptions = {}) {
	const { organizationId, tenantId } = useInvalidateOrganizationProjects();
	const { data: user } = useUserQuery();
	const accessToken = useReactiveAccessTokenCookie();

	const [paginationParams, setPaginationParams] = useState<PaginationParams>({
		skip: 0,
		take: 20
	});
	const scope = {
		tenantId,
		organizationId,
		userId: user?.id,
		accessToken
	};
	const queryKey = queryKeys.organizationProjects.paginationByScope(
		scope.tenantId,
		scope.organizationId,
		paginationParams
	);
	const ownerActive = enabled;
	const queryEnabled = ownerActive && !!(scope.tenantId && scope.organizationId && scope.userId && scope.accessToken);
	useScopeGuard(queryKey, ownerActive);

	// Enhanced query with pagination
	const organizationProjectsWithPagination = useQuery({
		queryKey,
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) =>
			organizationProjectService.getOrganizationProjects({
				skip: paginationParams.skip,
				take: paginationParams.take,
				scope,
				signal
			}),
		enabled: queryEnabled
	});

	// Pagination helpers
	const updatePaginationParams = useCallback((newParams: Partial<PaginationParams>) => {
		setPaginationParams((prev: PaginationParams) => ({ ...prev, ...newParams }));
	}, []);

	const resetPagination = useCallback(() => {
		setPaginationParams({ skip: 0, take: 20 });
	}, []);

	const loadNextPage = useCallback(() => {
		setPaginationParams((prev: PaginationParams) => ({
			...prev,
			skip: (prev.skip || 0) + (prev.take || 20)
		}));
	}, []);

	const loadPreviousPage = useCallback(() => {
		setPaginationParams((prev: PaginationParams) => ({
			...prev,
			skip: Math.max(0, (prev.skip || 0) - (prev.take || 20))
		}));
	}, []);

	return {
		organizationProjectsWithPagination,
		organizationProjectsWithPaginationData: organizationProjectsWithPagination.data,
		getOrganizationProjectsWithPaginationLoading: organizationProjectsWithPagination.isLoading,
		paginationParams,
		updatePaginationParams,
		resetPagination,
		loadNextPage,
		loadPreviousPage
	};
}
