import { ITaskRelatedIssueTypeCreate } from '@app/interfaces';
import {
	createTaskRelatedIssueTypeAPI,
	getTaskRelatedIssueTypeList,
	deleteTaskRelatedIssueTypeAPI,
	editTaskRelatedIssueTypeAPI
} from '@app/services/client/api';
import {
	userState,
	taskRelatedIssueTypeFetchingState,
	taskRelatedIssueTypeListState,
	activeTeamIdState
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import isEqual from 'lodash/isEqual';
import { getActiveTeamIdCookie } from '@app/helpers';

export function useTaskRelatedIssueType() {
	const [user] = useRecoilState(userState);
	const activeTeamId = useRecoilValue(activeTeamIdState);

	const { loading, queryCall } = useQuery(getTaskRelatedIssueTypeList);
	const {
		loading: createTaskRelatedIssueTypeLoading,
		queryCall: createQueryCall
	} = useQuery(createTaskRelatedIssueTypeAPI);
	const {
		loading: deleteTaskRelatedIssueTypeLoading,
		queryCall: deleteQueryCall
	} = useQuery(deleteTaskRelatedIssueTypeAPI);
	const { loading: editTaskRelatedIssueTypeLoading, queryCall: editQueryCall } =
		useQuery(editTaskRelatedIssueTypeAPI);

	const [taskRelatedIssueType, setTaskRelatedIssueType] = useRecoilState(
		taskRelatedIssueTypeListState
	);
	const [taskRelatedIssueTypeFetching, setTaskRelatedIssueTypeFetching] =
		useRecoilState(taskRelatedIssueTypeFetchingState);
	const { firstLoadData: firstLoadTaskRelatedIssueTypeData, firstLoad } =
		useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setTaskRelatedIssueTypeFetching(loading);
		}
	}, [loading, firstLoad, setTaskRelatedIssueTypeFetching]);

	const loadTaskRelatedIssueTypeData = useCallback(() => {
		const teamId = getActiveTeamIdCookie();
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || teamId || null
		).then((res) => {
			if (!isEqual(res?.data?.data?.items || [], taskRelatedIssueType)) {
				setTaskRelatedIssueType(res?.data?.data?.items || []);
			}
			return res;
		});
	}, [user, activeTeamId, setTaskRelatedIssueType, taskRelatedIssueType]);

	useEffect(() => {
		if (!firstLoad) return;
		loadTaskRelatedIssueTypeData();
	}, [activeTeamId, firstLoad]);

	const createTaskRelatedIssueType = useCallback(
		(data: ITaskRelatedIssueTypeCreate) => {
			if (user?.tenantId) {
				return createQueryCall(
					{ ...data, organizationTeamId: activeTeamId },
					user?.tenantId || ''
				).then((res) => {
					return res;
				});
			}
		},

		[
			createQueryCall,
			createTaskRelatedIssueTypeLoading,
			deleteTaskRelatedIssueTypeLoading,
			activeTeamId
		]
	);

	const deleteTaskRelatedIssueType = useCallback(
		(id: string) => {
			if (user?.tenantId) {
				return deleteQueryCall(id).then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskRelatedIssueType(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[
			deleteQueryCall,
			taskRelatedIssueType.length,
			createTaskRelatedIssueTypeLoading,
			deleteTaskRelatedIssueTypeLoading,
			user,
			activeTeamId
		]
	);

	const editTaskRelatedIssueType = useCallback(
		(id: string, data: ITaskRelatedIssueTypeCreate) => {
			console.log(user);

			if (user?.tenantId) {
				return editQueryCall(id, data, user?.tenantId || '').then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskRelatedIssueType(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[editTaskRelatedIssueTypeLoading, user, activeTeamId]
	);

	return {
		loading: taskRelatedIssueTypeFetching,
		taskRelatedIssueType,
		taskRelatedIssueTypeFetching,
		firstLoadTaskRelatedIssueTypeData,
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
