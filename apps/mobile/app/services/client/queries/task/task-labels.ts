import { useQuery } from "react-query"
import { getAllTaskLabelsRequest } from "../../requests/task-label"

interface IGetTaskLabelParams {
	authToken: string
	tenantId: string
	organizationId: string
}
const fetchAllLabels = async (params: IGetTaskLabelParams) => {
	const { organizationId, tenantId, authToken } = params
	const { data } = await getAllTaskLabelsRequest(
		{
			tenantId,
			organizationId,
		},
		authToken,
	)
	return data
}

const useFetchAllLabels = (IGetTaskLabelParams) =>
	useQuery(["labels", IGetTaskLabelParams], () => fetchAllLabels(IGetTaskLabelParams), {
		refetchInterval: 62000,
	})
export default useFetchAllLabels
