import { useCallback } from "react";
import { useQueryClient } from "react-query";
import { useStores } from "../../../models";
import useFetchAllSizes from "../../client/queries/task/task-sizes";
import { createSizeRequest, deleteTaskSizeRequest, updateTaskSizesRequest } from "../../client/requests/task-size";
import { ITaskSizeCreate } from "../../interfaces/ITaskSize";

export function useTaskSizes() {
    const queryClient = useQueryClient();
    const {
        authenticationStore: {
            authToken,
            tenantId,
            organizationId
        }
    } = useStores();

    const { data: sizes, isLoading } = useFetchAllSizes({ tenantId, organizationId, authToken })

    // Delete the size
    const deleteSize = useCallback(async (id: string) => {
        const { data, response } = await deleteTaskSizeRequest({
            id,
            tenantId,
            bearer_token: authToken
        })
        queryClient.invalidateQueries("sizes")
        return data
    }, [])

    // Update the size

    const updateSize = useCallback(async (id: string, data: ITaskSizeCreate) => {
        const { data: updatedStatus } = await updateTaskSizesRequest({
            id,
            tenantId,
            datas: data,
            bearer_token: authToken
        })
        queryClient.invalidateQueries("sizes")
    }, [])

    // Create the size

    const createSize = useCallback(async (data: ITaskSizeCreate) => {
        const { data: createdLabel } = await createSizeRequest({
            tenantId,
            datas: { ...data, organizationId: organizationId },
            bearer_token: authToken
        })
        queryClient.invalidateQueries("sizes")
    }, [])

    return {
        sizes,
        isLoading,
        deleteSize,
        updateSize,
        createSize
    }
}