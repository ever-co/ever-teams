import { useQuery } from "react-query"
import { getAllTaskSizesRequest } from "../../requests/task-size"

interface IGetTaskSizeParams {
	authToken: string
	tenantId: string
	organizationId: string
	activeTeamId: string
}
const fetchAllSizes = async (params: IGetTaskSizeParams) => {
	const { organizationId, tenantId, activeTeamId, authToken } = params
	const { data } = await getAllTaskSizesRequest(
		{
			tenantId,
			organizationId,
			activeTeamId,
		},
		authToken,
	)
	return data
}

const useFetchAllSizes = (IGetTaskSizeParams) =>
	useQuery(["sizes", IGetTaskSizeParams], () => fetchAllSizes(IGetTaskSizeParams), {
		refetchInterval: 62000,
	})
export default useFetchAllSizes
