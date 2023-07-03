import { useQuery } from "react-query"
import { currentAuthenticatedUserRequest } from "../../requests/auth"
import { getAllUsersRequest } from "../../requests/user"

interface IGetUserDataParams {
	authToken: string
}
const fetchCurrentUserData = async (params: IGetUserDataParams) => {
	const { authToken } = params
	const { data } = await currentAuthenticatedUserRequest({
		bearer_token: authToken,
	})
	return data
}

export const useFetchCurrentUserData = (IGetUserDataParams) =>
	useQuery(["user", IGetUserDataParams], () => fetchCurrentUserData(IGetUserDataParams), {
		refetchInterval: 5000,
	})

interface IGetOrganizationUsers {
	authToken: string
	tenantId: string
}
const fetchOrganizationUsers = async (params: IGetOrganizationUsers) => {
	const { authToken, tenantId } = params
	const { data } = await getAllUsersRequest(
		{
			tenantId,
		},
		authToken,
	)
	return data
}

export const useFetchOrganizationUsers = (IGetOrganizationUsers) =>
	useQuery(["users", IGetOrganizationUsers], () => fetchOrganizationUsers(IGetOrganizationUsers), {
		refetchInterval: 5000,
	})
