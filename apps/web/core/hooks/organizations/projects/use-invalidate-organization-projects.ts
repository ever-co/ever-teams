'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';

/**
 * Hook providing shared cache invalidation logic for organization projects.
 *
 * Centralizes the invalidation of organization project-related queries
 * to avoid duplication across multiple mutation hooks (create, edit, delete).
 *
 * @returns Object containing:
 * - `invalidateOrganizationProjectsData` - Function to invalidate all organization project caches
 */
export function useInvalidateOrganizationProjects() {
	const queryClient = useQueryClient();
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();

	const invalidateOrganizationProjectsData = useCallback(
		() =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationProjects.all
			}),
		[queryClient]
	);

	return {
		invalidateOrganizationProjectsData,
		queryClient,
		tenantId,
		organizationId
	};
}

