import { useQuery } from "react-query"
import { getAllTaskSizesRequest } from "../../requests/task-size"

interface IGetTaskSizeParams {
	authToken: string
	tenantId: string
	organizationId: string
}
const fetchAllSizes = async (params: IGetTaskSizeParams) => {
	const { organizationId, tenantId, authToken } = params
	const { data } = await getAllTaskSizesRequest(
		{
			tenantId,
			organizationId,
		},
		authToken,
	)
	return data
}

const useFetchAllSizes = (IGetTaskSizeParams) =>
	useQuery(["sizes", IGetTaskSizeParams], () => fetchAllSizes(IGetTaskSizeParams), {
		refetchInterval: 3000,
	})
export default useFetchAllSizes
