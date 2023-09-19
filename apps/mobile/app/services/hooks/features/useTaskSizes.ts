import { useCallback, useEffect, useState } from "react"
import { useQueryClient } from "react-query"
import { useStores } from "../../../models"
import useFetchAllSizes from "../../client/queries/task/task-sizes"
import {
	createSizeRequest,
	deleteTaskSizeRequest,
	updateTaskSizesRequest,
} from "../../client/requests/task-size"
import { ITaskSizeCreate, ITaskSizeItem } from "../../interfaces/ITaskSize"

export function useTaskSizes() {
	const queryClient = useQueryClient()
	const {
		authenticationStore: { authToken, tenantId, organizationId },
		teamStore: { activeTeamId },
	} = useStores()
	const [allTaskSizes, setAllTaskSizes] = useState<ITaskSizeItem[]>([])
	const {
		data: sizes,
		isLoading,
		isSuccess,
		isRefetching,
	} = useFetchAllSizes({ tenantId, organizationId, activeTeamId, authToken })

	// Delete the size
	const deleteSize = useCallback(async (id: string) => {
		await deleteTaskSizeRequest({
			id,
			tenantId,
			bearer_token: authToken,
		})
		queryClient.invalidateQueries("sizes")
	}, [])

	// Update the size

	const updateSize = useCallback(async (id: string, data: ITaskSizeCreate) => {
		await updateTaskSizesRequest({
			id,
			tenantId,
			datas: data,
			bearer_token: authToken,
		})
		queryClient.invalidateQueries("sizes")
	}, [])

	// Create the size

	const createSize = useCallback(async (data: ITaskSizeCreate) => {
		await createSizeRequest({
			tenantId,
			datas: { ...data, organizationId, organizationTeamId: activeTeamId },
			bearer_token: authToken,
		})
		queryClient.invalidateQueries("sizes")
	}, [])

	useEffect(() => {
		if (isSuccess) {
			if (sizes) {
				setAllTaskSizes(sizes.items || [])
			}
		}
	}, [isRefetching, isLoading])

	return {
		sizes,
		isLoading,
		deleteSize,
		updateSize,
		createSize,
		allTaskSizes,
	}
}
