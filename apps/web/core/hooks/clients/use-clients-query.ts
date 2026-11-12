'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizationContactService } from '@/core/services/client/api/organizations';
import { queryKeys } from '@/core/query/keys';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { activeClientsOf, archivedClientsOf } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';

const NO_CLIENTS: TClient[] = [];

interface UseClientsQueryOptions {
	/** Archived clients come with the active ones; off by default. */
	includeArchived?: boolean;
	enabled?: boolean;
}

/** The organization's clients, sorted by name by the API. */
export function useClientsQuery({ includeArchived = false, enabled = true }: UseClientsQueryOptions = {}) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasScope = Boolean(tenantId) && Boolean(organizationId);

	const query = useQuery({
		queryKey: queryKeys.clients.list(tenantId, organizationId, includeArchived),
		queryFn: ({ signal }) => organizationContactService.getClients({ includeArchived, signal }),
		enabled: enabled && hasScope
	});

	const clients = query.data ?? NO_CLIENTS;
	const activeClients = useMemo(() => activeClientsOf(clients), [clients]);
	const archivedClients = useMemo(() => archivedClientsOf(clients), [clients]);

	return {
		clients,
		activeClients,
		archivedClients,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch
	};
}

/** The clients a project or a time entry can be given: the active ones. */
export function useActiveClients({ enabled = true }: { enabled?: boolean } = {}) {
	const { activeClients, isLoading, isError, refetch } = useClientsQuery({ enabled });
	return { clients: activeClients, isLoading, isError, refetch };
}
