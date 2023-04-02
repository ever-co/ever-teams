import { useQuery } from "react-query"
import { getTaskAllPrioritiesRequest } from "../../requests/task-priority"

interface IGetTaskPrioritiesParams {
	authToken: string
	tenantId: string
	organizationId: string
}
const fetchAllPriorities = async (params: IGetTaskPrioritiesParams) => {
	const { organizationId, tenantId, authToken } = params
	const { data } = await getTaskAllPrioritiesRequest(
		{
			tenantId,
			organizationId,
		},
		authToken,
	)
	return data
}

const useFetchAllPriorities = (IGetTaskPrioritiesParams) =>
	useQuery(
		["priorities", IGetTaskPrioritiesParams],
		() => fetchAllPriorities(IGetTaskPrioritiesParams),
		{ refetchInterval: 3000 },
	)
export default useFetchAllPriorities
