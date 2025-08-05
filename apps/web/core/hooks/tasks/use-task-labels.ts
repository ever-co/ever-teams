'use client';

import { userState, taskLabelsListState, activeTeamIdState } from '@/core/stores';
import { useCallback, useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { taskLabelService } from '@/core/services/client/api/tasks/task-label.service';
import { ITagCreate } from '@/core/types/interfaces/tag/tag';
import { queryKeys } from '@/core/query/keys';
import { useAuthenticateUser } from '../auth';
import { useOrganizationTeams } from '../organizations';
import { useConditionalUpdateEffect } from '../common';

export function useTaskLabels() {
	const [user] = useAtom(userState);
	const activeTeamId = useAtomValue(activeTeamIdState);
	const { user: authUser } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	const queryClient = useQueryClient();

	const [taskLabels, setTaskLabels] = useAtom(taskLabelsListState);
	const { firstLoadData: firstLoadTaskLabelsData } = useFirstLoad();

	const organizationId = useMemo(
		() => authUser?.employee?.organizationId || user?.employee?.organizationId || getOrganizationIdCookie(),
		[authUser, user]
	);
	const tenantId = useMemo(
		() => authUser?.employee?.tenantId || user?.tenantId || getTenantIdCookie(),
		[authUser, user]
	);
	const teamId = useMemo(() => activeTeam?.id || getActiveTeamIdCookie() || activeTeamId, [activeTeam, activeTeamId]);

	// useQuery for fetching task labels
	const taskLabelsQuery = useQuery({
		queryKey: queryKeys.taskLabels.byTeam(teamId),
		queryFn: async () => {
			const isEnabled = !!tenantId && !!organizationId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			const res = await taskLabelService.getTaskLabelsList();
			return res.data;
		},
		enabled: !!tenantId && !!organizationId && !!teamId
	});
	const invalidateTaskLabelsData = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.taskLabels.byTeam(teamId) }),
		[queryClient, teamId]
	);
	// Mutations
	const createTaskLabelMutation = useMutation({
		mutationFn: (data: ITagCreate) => {
			const isEnabled = !!tenantId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const requestData = { ...data, organizationTeamId: teamId };
			return taskLabelService.createTaskLabels(requestData);
		},
		onSuccess: invalidateTaskLabelsData
	});

	const updateTaskLabelMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ITagCreate }) => {
			const isEnabled = !!tenantId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			return taskLabelService.editTaskLabels({ tagId: id, data });
		},
		onSuccess: invalidateTaskLabelsData
	});

	const deleteTaskLabelMutation = useMutation({
		mutationFn: (id: string) => taskLabelService.deleteTaskLabels(id),
		onSuccess: invalidateTaskLabelsData
	});

	useConditionalUpdateEffect(
		() => {
			if (taskLabelsQuery.data) {
				setTaskLabels(taskLabelsQuery.data.items);
			}
		},
		[taskLabelsQuery.data],
		Boolean(taskLabels?.length)
	);

	const loadTaskLabels = useCallback(async () => {
		return taskLabelsQuery.data;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user, activeTeamId]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskLabels();
		firstLoadTaskLabelsData();
	}, [firstLoadTaskLabelsData, loadTaskLabels]);
	const editTaskLabels = useCallback(
		(id: string, data: ITagCreate) => updateTaskLabelMutation.mutateAsync({ id, data }),
		[updateTaskLabelMutation]
	);
	return {
		loading: taskLabelsQuery.isLoading,
		taskLabels,
		firstLoadTaskLabelsData: handleFirstLoad,
		createTaskLabels: createTaskLabelMutation.mutateAsync,
		createTaskLabelsLoading: createTaskLabelMutation.isPending,
		deleteTaskLabelsLoading: deleteTaskLabelMutation.isPending,
		deleteTaskLabels: deleteTaskLabelMutation.mutateAsync,
		editTaskLabels,
		editTaskLabelsLoading: updateTaskLabelMutation.isPending,
		setTaskLabels,
		loadTaskLabels
	};
}
