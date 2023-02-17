import React, { useCallback } from "react";
import { useQueryClient } from "react-query"
import { useStores } from "../../../models"
import useFetchAllLabels from "../../client/queries/task/task-labels";
import { createLabelRequest, deleteTaskLabelRequest, updateTaskLabelsRequest } from "../../client/requests/task-label";
import { ITaskStatusCreate } from "../../interfaces/ITaskStatus";

export function useTaskLabels() {
    const queryClient = useQueryClient();
    const {
        authenticationStore: {
            authToken,
            tenantId,
            organizationId
        }
    } = useStores();

    const { data: labels, isLoading } = useFetchAllLabels({ tenantId, organizationId, authToken })

    // Delete the label
    const deleteLabel = useCallback(async (id: string) => {
        const { data, response } = await deleteTaskLabelRequest({
            id,
            tenantId,
            bearer_token: authToken
        })
        queryClient.invalidateQueries("labels")
        return data
    }, [])

    // Update the label

    const updateLabel = useCallback(async (id: string, data: ITaskStatusCreate) => {
        const { data: updatedStatus } = await updateTaskLabelsRequest({
            id,
            tenantId,
            datas: data,
            bearer_token: authToken
        })
        queryClient.invalidateQueries("labels")
    }, [])

    // Create the label

    const createLabel = useCallback(async (data: ITaskStatusCreate) => {
        const { data: createdLabel } = await createLabelRequest({
            tenantId,
            datas: { ...data, organizationId: organizationId },
            bearer_token: authToken
        })
        queryClient.invalidateQueries("labels")
    }, [])

    return {
        labels,
        isLoading,
        deleteLabel,
        updateLabel,
        createLabel
    }
}