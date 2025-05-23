'use client';

import { ITaskRelatedIssueTypeCreate } from '@/core/types/interfaces';
import {
	userState,
	taskRelatedIssueTypeFetchingState,
	taskRelatedIssueTypeListState,
	activeTeamIdState
} from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../common/use-first-load';
import { useQuery } from '../common/use-query';
import isEqual from 'lodash/isEqual';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/index';
import { taskRelatedIssueTypeService } from '@/core/services/client/api/tasks/task-related-issue-type.service';

export function useTaskRelatedIssueType() {
	const [user] = useAtom(userState);
	const activeTeamId = useAtomValue(activeTeamIdState);

	const { loading: getTaskRelatedIssueTypeLoading, queryCall: getTaskRelatedIssueTypeQueryCall } = useQuery(
		taskRelatedIssueTypeService.getTaskRelatedIssueTypeList
	);
	const { loading: createTaskRelatedIssueTypeLoading, queryCall: createQueryCall } = useQuery(
		taskRelatedIssueTypeService.createTaskRelatedIssueType
	);
	const { loading: deleteTaskRelatedIssueTypeLoading, queryCall: deleteQueryCall } = useQuery(
		taskRelatedIssueTypeService.deleteTaskRelatedIssueType
	);
	const { loading: editTaskRelatedIssueTypeLoading, queryCall: editQueryCall } = useQuery(
		taskRelatedIssueTypeService.editTaskRelatedIssueType
	);

	const [taskRelatedIssueType, setTaskRelatedIssueType] = useAtom(taskRelatedIssueTypeListState);
	const [taskRelatedIssueTypeFetching] = useAtom(taskRelatedIssueTypeFetchingState);
	const { firstLoadData: firstLoadTaskRelatedIssueTypeData } = useFirstLoad();

	const loadTaskRelatedIssueTypeData = useCallback(async () => {
		const teamId = getActiveTeamIdCookie();
		getTaskRelatedIssueTypeQueryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || teamId || null
		).then((res) => {
			if (!isEqual(res?.data?.items || [], taskRelatedIssueType)) {
				setTaskRelatedIssueType(res?.data?.items || []);
			}
			return res;
		});
	}, [
		getTaskRelatedIssueTypeQueryCall,
		user?.tenantId,
		user?.employee?.organizationId,
		activeTeamId,
		taskRelatedIssueType,
		setTaskRelatedIssueType
	]);

	const createTaskRelatedIssueType = useCallback(
		(data: ITaskRelatedIssueTypeCreate) => {
			if (user?.tenantId) {
				return createQueryCall({ ...data, organizationTeamId: activeTeamId }, user?.tenantId || '').then(
					(res) => {
						return res;
					}
				);
			}
		},

		[createQueryCall, activeTeamId, user]
	);

	const deleteTaskRelatedIssueType = useCallback(
		(id: string) => {
			if (user?.tenantId) {
				return deleteQueryCall(id).then((res) => {
					getTaskRelatedIssueTypeQueryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskRelatedIssueType(res?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[
			user?.tenantId,
			user?.employee?.organizationId,
			deleteQueryCall,
			getTaskRelatedIssueTypeQueryCall,
			activeTeamId,
			setTaskRelatedIssueType
		]
	);

	const editTaskRelatedIssueType = useCallback(
		(id: string, data: ITaskRelatedIssueTypeCreate) => {
			if (user?.tenantId) {
				return editQueryCall(id, data, user?.tenantId || '').then((res) => {
					getTaskRelatedIssueTypeQueryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskRelatedIssueType(res?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[
			user?.tenantId,
			user?.employee?.organizationId,
			editQueryCall,
			getTaskRelatedIssueTypeQueryCall,
			activeTeamId,
			setTaskRelatedIssueType
		]
	);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskRelatedIssueTypeData();
		firstLoadTaskRelatedIssueTypeData();
	}, [firstLoadTaskRelatedIssueTypeData, loadTaskRelatedIssueTypeData]);

	return {
		loading: getTaskRelatedIssueTypeLoading,
		taskRelatedIssueType,
		taskRelatedIssueTypeFetching,
		firstLoadTaskRelatedIssueTypeData: handleFirstLoad,
		createTaskRelatedIssueType,
		createTaskRelatedIssueTypeLoading,
		deleteTaskRelatedIssueTypeLoading,
		deleteTaskRelatedIssueType,
		editTaskRelatedIssueTypeLoading,
		editTaskRelatedIssueType,
		setTaskRelatedIssueType,
		loadTaskRelatedIssueTypeData
	};
}
