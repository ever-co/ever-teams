import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useStores } from '../../../models';
import useFetchAllIssues from '../../client/queries/task/task-issue';
import {
	createIssueTypeRequest,
	deleteIssueTypesRequest,
	editIssueTypesRequest
} from '../../client/requests/issue-type';
import { IIssueTypesItemList, IIssueType, IIssuesList } from '../../interfaces/ITaskIssue';

export const useTaskIssue = () => {
	const queryClient = useQueryClient();
	const {
		authenticationStore: { authToken, tenantId, organizationId },
		teamStore: { activeTeamId }
	} = useStores();

	const [allTaskIssues, setAllTaskIssues] = useState<IIssueType[]>([]);

	const {
		data: issues,
		isLoading,
		isSuccess,
		isRefetching
	} = useFetchAllIssues({
		tenantId,
		organizationId,
		activeTeamId,
		authToken
	});

	// Delete the issue
	const deleteIssue = useCallback(async (id: string) => {
		await deleteIssueTypesRequest({
			id,
			tenantId,
			bearer_token: authToken
		});
		queryClient.invalidateQueries('issues');
	}, []);

	// Update the issue

	const updateIssue = useCallback(async (id: string, data: IIssueTypesItemList) => {
		await editIssueTypesRequest({
			id,
			tenantId,
			datas: data,
			bearer_token: authToken
		});
		queryClient.invalidateQueries('issues');
	}, []);

	// Create the issue

	const createIssue = useCallback(async (data: IIssueTypesItemList) => {
		await createIssueTypeRequest({
			datas: { ...data, organizationId, organizationTeamId: activeTeamId },
			tenantId,
			bearer_token: authToken
		});
		queryClient.invalidateQueries('issues');
	}, []);

	useEffect(() => {
		if (isSuccess) {
			if (issues) {
				const typedIssues = issues as IIssuesList;
				setAllTaskIssues(typedIssues.items || []);
			}
		}
	}, [isLoading, isRefetching]);

	return {
		issues,
		isLoading,
		deleteIssue,
		updateIssue,
		createIssue,
		allTaskIssues
	};
};
