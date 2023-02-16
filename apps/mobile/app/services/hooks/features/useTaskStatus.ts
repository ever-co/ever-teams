import React, { useCallback } from "react";
import { useQueryClient } from "react-query"
import { useStores } from "../../../models"
import useFetchAllStatuses from "../../client/queries/task/task-status";
import { createStatusRequest, deleteTaskStatusRequest, updateTaskStatusRequest } from "../../client/requests/task-status";
import { ITaskStatusCreate } from "../../interfaces/ITaskStatus";

export function useTaskStatus() {
    const queryClient = useQueryClient();
    const {
        authenticationStore: {
            authToken,
            tenantId,
            organizationId
        }
    } = useStores();

    const { data: statuses, isLoading } = useFetchAllStatuses({ tenantId, organizationId, authToken })

    // Delete the status
    const deleteStatus = useCallback(async (id: string) => {
        const { data, response } = await deleteTaskStatusRequest({
            id,
            tenantId,
            bearer_token: authToken
        })
        queryClient.invalidateQueries("statuses")
        return data
    }, [])

    // Update the status

    const updateStatus = useCallback(async (id: string, data: ITaskStatusCreate) => {
        const { data: updatedStatus } = await updateTaskStatusRequest({
            id,
            tenantId,
            datas: data,
            bearer_token: authToken
        })
        queryClient.invalidateQueries("statuses")
    }, [])

    // Create the status

    const createStatus = useCallback(async (data: ITaskStatusCreate) => {
        const { data: updatedStatus } = await createStatusRequest({
            tenantId,
            datas: { ...data, organizationId: organizationId },
            bearer_token: authToken
        })
        queryClient.invalidateQueries("statuses")
    }, [])

    return {
        statuses,
        isLoading,
        deleteStatus,
        updateStatus,
        createStatus
    }
}