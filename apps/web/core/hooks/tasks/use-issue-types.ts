'use client';

import { userState, issueTypesListState, activeTeamIdState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { issueTypeService } from '@/core/services/client/api/tasks/issue-type.service';
import { IIssueTypesCreate } from '@/core/types/interfaces/task/issue-type';
import { queryKeys } from '@/core/query/keys';
import { useAuthenticateUser } from '../auth';
import { useOrganizationTeams } from '../organizations';
import isEqual from 'lodash/isEqual';

export function useIssueType() {
	const [user] = useAtom(userState);
	const activeTeamId = useAtomValue(activeTeamIdState);
	const { user: authUser } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	const queryClient = useQueryClient();

	const [issueTypes, setIssueTypes] = useAtom(issueTypesListState);
	const { firstLoadData: firstLoadIssueTypeData } = useFirstLoad();

	const organizationId = authUser?.employee?.organizationId || user?.employee?.organizationId;
	const tenantId = authUser?.employee?.tenantId || user?.tenantId;
	const teamId = activeTeam?.id || activeTeamId;

	// useQuery for fetching issue types
	const issueTypesQuery = useQuery({
		queryKey: queryKeys.issueTypes.byTeam(teamId || ''),
		queryFn: async () => {
			if (!tenantId || !organizationId) {
				return { items: [] };
			}
			const res = await issueTypeService.getIssueTypeList(tenantId, organizationId, teamId || null);
			if (!isEqual(res.data?.items || [], issueTypes)) {
				setIssueTypes(res.data?.items || []);
			}
			return res.data;
		}
	});

	// Mutations
	const createIssueTypeMutation = useMutation({
		mutationFn: (data: IIssueTypesCreate) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId is required');
			}
			const requestData = { ...data, organizationTeamId: teamId || '' };
			return issueTypeService.createIssueType(requestData, tenantId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.issueTypes.byTeam(teamId || '')
			});
		}
	});

	const updateIssueTypeMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: IIssueTypesCreate }) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId is required');
			}
			return issueTypeService.editIssueType(id, data, tenantId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.issueTypes.byTeam(teamId || '')
			});
		}
	});

	const deleteIssueTypeMutation = useMutation({
		mutationFn: (id: string) => issueTypeService.deleteIssueType(id),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.issueTypes.byTeam(teamId || '')
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
