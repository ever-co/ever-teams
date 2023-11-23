import { useQueryClient } from "react-query"
import {
	createVersionRequest,
	deleteTaskVersionRequest,
	editTaskVersionRequest,
} from "../../client/requests/task-version"
import { ITaskVersionCreate, ITaskVersionItemList } from "../../interfaces/ITaskVersion"
import { useStores } from "../../../models"
import { useCallback, useEffect, useState } from "react"
import useFetchAllVersions from "../../client/queries/task/task-version"

export function useTaskVersion() {
	const queryClient = useQueryClient()
	const {
		authenticationStore: { authToken, tenantId, organizationId },
		teamStore: { activeTeamId },
	} = useStores()

	const [taskVersionList, setTaskVersionList] = useState<ITaskVersionItemList[]>([])

	const {
		data: versions,
		isLoading,
		isSuccess,
		isRefetching,
	} = useFetchAllVersions({ tenantId, organizationId, activeTeamId, authToken })

	const createTaskVersion = useCallback(
		async (data: ITaskVersionCreate) => {
			await createVersionRequest(
				{ ...data, organizationId, organizationTeamId: activeTeamId },
				authToken,
				tenantId,
			)
			queryClient.invalidateQueries("versions")
		},
		[authToken, tenantId, queryClient],
	)

	const deleteTaskVersion = useCallback(
		async (id: string) => {
			await deleteTaskVersionRequest({ bearer_token: authToken, tenantId, id })

			queryClient.invalidateQueries("versions")
		},
		[authToken, tenantId, queryClient],
	)

	const updateTaskVersion = useCallback(
		async (id: string, data: ITaskVersionCreate) => {
			await editTaskVersionRequest({
				id,
				datas: { ...data, organizationId, organizationTeamId: activeTeamId },
				bearer_token: authToken,
				tenantId,
			})
			queryClient.invalidateQueries("versions")
		},
		[authToken, tenantId, queryClient],
	)

	useEffect(() => {
		if (isSuccess) {
			if (versions) {
				// @ts-ignore
				setTaskVersionList(versions?.items || [])
			}
		}
	}, [isLoading, isRefetching])

	return {
		createTaskVersion,
		deleteTaskVersion,
		updateTaskVersion,
		taskVersionList,
		versions,
		isLoading,
	}
}
