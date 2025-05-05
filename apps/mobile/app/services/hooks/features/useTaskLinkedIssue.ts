import { useState } from 'react';
import { createTaskLinkedIssue, updateTaskLinkedIssue } from '../../client/requests/task-linked-issue';
import { useStores } from '../../../models';
import { ITaskLinkedIssue, LinkedTaskIssue } from '../../interfaces/ITask';

export const useTaskLinkedIssues = () => {
	const {
		authenticationStore: { authToken, tenantId }
	} = useStores();

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const createTaskLinkedIssueRequest = async (data: ITaskLinkedIssue) => {
		try {
			setLoading(true);
			await createTaskLinkedIssue(data, authToken, tenantId);
		} catch (err) {
			setError(err);
		} finally {
			setLoading(false);
		}
	};

	const updateTaskLinkedIssueRequest = async (data: LinkedTaskIssue) => {
		try {
			setLoading(true);
			await updateTaskLinkedIssue(data, authToken, tenantId);
		} catch (err) {
			setError(err);
		} finally {
			setLoading(false);
		}
	};

	return {
		loading,
		error,
		createTaskLinkedIssue: createTaskLinkedIssueRequest,
		updateTaskLinkedIssue: updateTaskLinkedIssueRequest
	};
};
