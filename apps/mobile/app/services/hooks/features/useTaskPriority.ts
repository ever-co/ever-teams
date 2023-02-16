import { useCallback } from "react";
import { useQueryClient } from "react-query";
import { useStores } from "../../../models"
import useFetchAllPriorities from "../../client/queries/task/task-priority";
import { createPriorityRequest, deleteTaskPriorityRequest, updateTaskPriorityRequest } from "../../client/requests/task-priority";
import { ITaskPriorityCreate } from "../../interfaces/ITaskPriority";

export const useTaskPriority = () => {
    const queryClient = useQueryClient();
    const {
        authenticationStore: {
            authToken,
            tenantId,
            organizationId
        }
    } = useStores();

    const { data: priorities, isLoading } = useFetchAllPriorities({ tenantId, organizationId, authToken })

    // Delete the priority
    const deletePriority = useCallback(async (id: string) => {
        const { data, response } = await deleteTaskPriorityRequest({
            id,
            tenantId,
            bearer_token: authToken
        })
        queryClient.invalidateQueries("priorities")
        return data
    }, [])

    // Update the priority

    const updatePriority = useCallback(async (id: string, data: ITaskPriorityCreate) => {
        const { data: updatedStatus } = await updateTaskPriorityRequest({
            id,
            tenantId,
            datas: data,
            bearer_token: authToken
        })
        queryClient.invalidateQueries("priorities")
    }, [])

    // Create the priority

    const createPriority = useCallback(async (data: ITaskPriorityCreate) => {
        const { data: updatedStatus } = await createPriorityRequest({
            tenantId,
            datas: { ...data, organizationId: organizationId },
            bearer_token: authToken
        })
        queryClient.invalidateQueries("priorities")
    }, [])

    return {
       priorities,
        isLoading,
        deletePriority,
        updatePriority,
        createPriority
    }
}