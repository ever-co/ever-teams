import { useGetCurrentActiveTaskQuery } from './use-get-team-task.query';

export const useCurrentActiveTask = () => {
	const { data: task, isLoading, isError } = useGetCurrentActiveTaskQuery();

	return { task, isLoading, isError };
};
