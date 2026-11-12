'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationContactService } from '@/core/services/client/api/organizations';
import { queryKeys } from '@/core/query/keys';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import {
	buildClientRequest,
	buildClientUpdateRequest,
	type ClientDraft,
	type ClientLike
} from '@/core/lib/utils/clients';

function requestScope() {
	return { organizationId: getOrganizationIdCookie(), tenantId: getTenantIdCookie() };
}

/** Create, edit, archive and restore a client; every list of clients is read again afterwards. */
export function useClientMutations() {
	const queryClient = useQueryClient();

	const invalidateClients = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.clients.all }),
		[queryClient]
	);

	// A project carries its client: archiving or restoring one changes what the projects show.
	const invalidateClientsAndProjects = useCallback(async () => {
		await invalidateClients();
		await queryClient.invalidateQueries({ queryKey: queryKeys.organizationProjects.all });
	}, [invalidateClients, queryClient]);

	const createMutation = useMutation({
		mutationFn: (draft: ClientDraft) =>
			organizationContactService.createClient(buildClientRequest(draft, requestScope())),
		onSuccess: invalidateClients
	});

	const updateMutation = useMutation({
		mutationFn: ({ client, draft }: { client: ClientLike; draft: ClientDraft }) =>
			organizationContactService.updateClient({
				clientId: client.id,
				data: buildClientUpdateRequest(draft, requestScope(), client)
			}),
		onSuccess: invalidateClientsAndProjects
	});

	const archiveMutation = useMutation({
		mutationFn: (clientId: string) => organizationContactService.archiveClient(clientId),
		onSuccess: invalidateClientsAndProjects
	});

	const restoreMutation = useMutation({
		mutationFn: (clientId: string) => organizationContactService.restoreClient(clientId),
		onSuccess: invalidateClientsAndProjects
	});

	return {
		createClient: createMutation.mutateAsync,
		isCreating: createMutation.isPending,
		updateClient: updateMutation.mutateAsync,
		isUpdating: updateMutation.isPending,
		archiveClient: archiveMutation.mutateAsync,
		isArchiving: archiveMutation.isPending,
		restoreClient: restoreMutation.mutateAsync,
		isRestoring: restoreMutation.isPending
	};
}
