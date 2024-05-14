import { useQuery } from '@tanstack/react-query';
import { currentAuthenticatedUserRequest } from '../../requests/auth';
import { getAllUsersRequest } from '../../requests/user';

interface IGetUserDataParams {
	authToken: string;
}
const fetchCurrentUserData = async (params: IGetUserDataParams) => {
	const { authToken } = params;
	const { data } = await currentAuthenticatedUserRequest({
		bearer_token: authToken
	});
	return data;
};

export const useFetchCurrentUserData = (IGetUserDataParams) =>
	useQuery({
		queryKey: ['user'],
		queryFn: () => fetchCurrentUserData(IGetUserDataParams)
	});
// removed refetchOnMount: 5000
interface IGetOrganizationUsers {
	authToken: string;
	tenantId: string;
}
const fetchOrganizationUsers = async (params: IGetOrganizationUsers) => {
	const { authToken, tenantId } = params;
	const { data } = await getAllUsersRequest(
		{
			tenantId
		},
		authToken
	);
	return data;
};

export const useFetchOrganizationUsers = (IGetOrganizationUsers) =>
	useQuery({
		queryKey: ['users', IGetOrganizationUsers],
		queryFn: () => fetchOrganizationUsers(IGetOrganizationUsers),
		refetchInterval: 5000,
		refetchOnMount: true,
		notifyOnChangeProps: ['data'] // Re-render only when data changes
	});
