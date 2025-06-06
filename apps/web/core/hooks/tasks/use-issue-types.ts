'use client';
import { userState, issueTypesListState, activeTeamIdState } from '@/core/stores';
import { useCallback, useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { issueTypeService } from '@/core/services/client/api/tasks/issue-type.service';
import { IIssueTypesCreate } from '@/core/types/interfaces/task/issue-type';
import { queryKeys } from '@/core/query/keys';
import { useAuthenticateUser } from '../auth';
import { useOrganizationTeams } from '../organizations';
import { useConditionalUpdateEffect } from '../common';

export function useIssueType() {
	const [user] = useAtom(userState);
	const activeTeamId = useAtomValue(activeTeamIdState);
	const { user: authUser } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	const queryClient = useQueryClient();

	const [issueTypes, setIssueTypes] = useAtom(issueTypesListState);
	const { firstLoadData: firstLoadIssueTypeData } = useFirstLoad();

	//  Memoize derived values to avoid recalculation on every render
	const organizationId = useMemo(
		() => authUser?.employee?.organizationId || user?.employee?.organizationId,
		[authUser?.employee?.organizationId, user?.employee?.organizationId]
	);

	const tenantId = useMemo(
		() => authUser?.employee?.tenantId || user?.tenantId,
		[authUser?.employee?.tenantId, user?.tenantId]
	);

	const teamId = useMemo(() => activeTeam?.id || activeTeamId, [activeTeam?.id, activeTeamId]);

	//  Removed setState from queryFn to follow React Query best practices
	const issueTypesQuery = useQuery({
		queryKey: queryKeys.issueTypes.byTeam(teamId),
		queryFn: async () => {
			if (!tenantId || !organizationId || !teamId) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}

			// Clean queryFn - only fetch and return data
			const res = await issueTypeService.getIssueTypeList(tenantId, organizationId, teamId);
			return res.data;
		},
		enabled: !!tenantId && !!organizationId && !!teamId, // Only fetch when all required params are available
		staleTime: 1000 * 60 * 5, // Issue types are relatively stable, cache for 5 minutes
		gcTime: 1000 * 60 * 15 // Keep in cache for 15 minutes
	});

	//  Sync React Query data with Jotai state using useEffect
	// This replaces the setState in queryFn and follows React Query best practices
	useConditionalUpdateEffect(
		() => {
			if (issueTypesQuery.data) {
				setIssueTypes(issueTypesQuery.data.items);
			}
		},
		[issueTypesQuery.data],
		Boolean(issueTypes?.length)
	);

	// Mutations
	const createIssueTypeMutation = useMutation({
		mutationFn: (data: IIssueTypesCreate) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const requestData = { ...data, organizationTeamId: teamId };
			return issueTypeService.createIssueType(requestData, tenantId);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.issueTypes.byTeam(teamId)
				});
		}
	});

	const updateIssueTypeMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: IIssueTypesCreate }) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			return issueTypeService.editIssueType(id, data, tenantId);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.issueTypes.byTeam(teamId)
				});
		}
	});

	const deleteIssueTypeMutation = useMutation({
		mutationFn: (id: string) => issueTypeService.deleteIssueType(id),
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.issueTypes.byTeam(teamId)
				});
		}
	});

	const loadIssueTypes = useCallback(async () => {
		return issueTypesQuery.data;
	}, [issueTypesQuery.data]);

	const handleFirstLoad = useCallback(async () => {
		await loadIssueTypes();
		firstLoadIssueTypeData();
	}, [firstLoadIssueTypeData, loadIssueTypes]);

	return {
		issueTypes: issueTypes,
		loading: issueTypesQuery.isLoading,
		firstLoadIssueTypeData: handleFirstLoad,
		createIssueType: createIssueTypeMutation.mutateAsync,
		createIssueTypeLoading: createIssueTypeMutation.isPending,
		deleteIssueTypeLoading: deleteIssueTypeMutation.isPending,
		deleteIssueType: deleteIssueTypeMutation.mutateAsync,
		editIssueTypeLoading: updateIssueTypeMutation.isPending,
		editIssueType: (id: string, data: IIssueTypesCreate) => updateIssueTypeMutation.mutateAsync({ id, data })
	};
}
