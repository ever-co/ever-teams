import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "react-query"
import { useStores } from "../../../models";
import useFetchAllTasks from "../../client/queries/task/tasks";
import { createTaskRequest, deleteTaskRequest, getTeamTasksRequest, updateTaskRequest } from "../../client/requests/tasks";
import { OT_Member } from "../../interfaces/IOrganizationTeam";
import { ICreateTask, ITeamTask } from "../../interfaces/ITask";


export function useTeamTasks() {
    const queryClient = useQueryClient()
    const { authenticationStore: { tenantId, organizationId, authToken, user },
        teamStore: { activeTeam, activeTeamId, setActiveTeam },
        TaskStore: { teamTasks, activeTask, fetchingTasks, setTeamTasks, setActiveTask, activeTaskId, setActiveTaskId, setFetchingTasks, setAssignedTasks, setUnassignedTasks }
    } = useStores();

    const [updateLoading, setUpdateLoading] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);

    const { isLoading, data: allTasks, isRefetching } = useFetchAllTasks({ tenantId, organizationId, authToken })

    // Create a new Task
    const createNewTask = useCallback(async (title: string) => {

        if (title.trim().length < 2) return {
            error: "Task title is valid"
        };

        setCreateLoading(true)
        const dataBody: ICreateTask = {
            title: title,
            status: "Todo",
            description: "",
            tags: [],
            teams: [{
                id: activeTeamId
            }],
            estimate: 0,
            organizationId: organizationId,
            tenantId: tenantId
        }
        const { data, response } = await createTaskRequest({
            data: dataBody,
            bearer_token: authToken
        })
        queryClient.invalidateQueries("tasks")
        const { data: tasks } = await getTeamTasksRequest({
            bearer_token: authToken,
            tenantId,
            organizationId,
        });

        const activeTeamTasks = getTasksByTeamState({ tasks: tasks.items, activeTeamId })

        const createdTask = activeTeamTasks.find((t) => t.id === data?.id)

        setCreateLoading(false)
        return {
            data: createdTask,
            response
        }
    }, [activeTeamId])


    // Update a task
    const updateTask = async (task: ITeamTask, id: string) => {
        setUpdateLoading(true)

        const { data, response } = await updateTaskRequest({ data: task, id }, authToken);
        queryClient.invalidateQueries("tasks");

        setUpdateLoading(false)
        return { data, response }
    }


    // Delete a Task
    const deleteTask = useCallback(
        async (task: typeof teamTasks[0]) => {
            const { data } = await deleteTaskRequest({ tenantId, taskId: task.id, bearer_token: authToken })

            const affected = data.affected || 0;

            if (affected > 0) {
                setTeamTasks((ts) => {
                    return ts.filter((t) => t.id !== task.id);
                });
            }

            return data;
        },
        [setTeamTasks]
    );

    // Assign a task to a member
    const onAssignTask = async ({ taskId, memberId }: { taskId: string, memberId: string }) => {

        const teamMembers: OT_Member[] = activeTeam?.members;
        const currentMember = teamMembers.find((m) => m.employee.user.id === memberId)

        if (!currentMember) {
            return {
                error: "This user is not part of this team"
            }
        }


        const task: ITeamTask = teamTasks.find((ts) => ts.id === taskId);
        const members = task.members

        const editTask =
        {
            ...task,
            members: [
                ...members,
                {
                    id: currentMember.employeeId
                }
            ]
        }
        const { data } = await updateTaskRequest({ data: editTask, id: taskId }, authToken);
        queryClient.invalidateQueries("tasks")
        return data;
    }


    // UNASSIGN A TASK
    const onUnassignedTask = async ({ taskId, memberId }: { taskId: string, memberId: string }) => {
        const teamMembers: OT_Member[] = activeTeam?.members;
        const currentMember = teamMembers.find((m) => m.employee.user.id === memberId)

        if (!currentMember) {
            return {
                error: "This member is not in this team"
            }
        }

        const task: ITeamTask = teamTasks.find((ts) => ts.id === taskId);

        const members = task.members.filter((m) => m.userId !== memberId)

        const editTask =
        {
            ...task,
            members,
        }

        const { data } = await updateTaskRequest({ data: editTask, id: taskId }, authToken);
        queryClient.invalidateQueries("tasks")
        return data;
    }


    // // Get the active task id and update active task data
    useEffect(() => {
        const active_taskId = activeTaskId || '';
        setActiveTask(teamTasks.find((ts) => ts.id === active_taskId) || null);
    }, [teamTasks]);


    useEffect(() => {
        const activeTeamTasks = getTasksByTeamState({ tasks: allTasks?.items, activeTeamId })
        setTeamTasks(activeTeamTasks)
        console.log("ASSIGN")
        if (activeTaskId) {
            setActiveTask(activeTeamTasks.find((ts) => ts.id === activeTaskId) || null);
        }
    }, [activeTeamId, allTasks?.total, isRefetching])
    /**
 * Change active task
 */
    const setActiveTeamTask = useCallback(
        (task: typeof teamTasks[0] | null) => {
            setActiveTaskId(task?.id || '');
            setActiveTask(task);
        },
        []
    );


    return {
        createNewTask,
        deleteTask,
        updateTask,
        activeTask,
        setActiveTeamTask,
        onUnassignedTask,
        onAssignTask,
        isRefetching
    }
}

interface IFilterTask {
    tasks: ITeamTask[];
    activeTeamId: string;
}

export const getTasksByTeamState = (params: IFilterTask) => {
    if (!params.tasks) return [];
    const data = params.tasks.filter((task) => {
        return task.teams.some((tm) => {
            return tm.id === params.activeTeamId;
        });
    });

    return data;
}