import { useCallback, useEffect, useState } from "react";
import { useStores } from "../../../models";
import { createTaskRequest, deleteTaskRequest, getTeamTasksRequest, updateTaskRequest } from "../../client/requests/tasks";
import { OT_Member } from "../../interfaces/IOrganizationTeam";
import { ICreateTask, ITeamTask } from "../../interfaces/ITask";


export function useTeamTasks() {
    const { authenticationStore: { tenantId, organizationId, authToken, user },
        teamStore: { activeTeam, activeTeamId, setActiveTeam },
        TaskStore: { teamTasks, activeTask, fetchingTasks, setTeamTasks, setActiveTask, activeTaskId, setActiveTaskId, setFetchingTasks, setAssignedTasks, setUnassignedTasks }
    } = useStores();

    const [updateLoading, setUpdateLoading] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);

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
        setCreateLoading(false)
        return {
            data,
            response
        }
    }, [activeTeamId])


    // Update a task
    const updateTask = async (task: ITeamTask, id: string) => {
        setUpdateLoading(true)
        const { data, response } = await updateTaskRequest({ data: task, id }, authToken);
        await loadTeamTasksData();
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

    // Load Team Tasks
    const loadTeamTasksData =async () => {
        const { data } = await getTeamTasksRequest({
            bearer_token: authToken,
            tenantId: tenantId,
            organizationId: organizationId,
        });

        const tasks = getTasksByTeamState({ tasks: data.items, activeTeamId })
        setTeamTasks(tasks)

        if (activeTaskId) {
            setActiveTask(tasks.find((ts) => ts.id === activeTaskId) || null);
        }

        return tasks
    }

    // Assign a task to a member
    const onAssignTask =async ({ taskId, memberId }: { taskId: string, memberId: string }) => {

        const teamMembers: OT_Member[] = activeTeam?.members;
        const currentMember = teamMembers.find((m) => m.employee.user.id === memberId)

        if (!currentMember) {
            return {
                error: "This user is not part of this team"
            }
        }

        const allTasks = await loadTeamTasksData();

        const task: ITeamTask = allTasks.find((ts) => ts.id === taskId);
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

        return data;
    }


    // Get the active task id and update active task data
    useEffect(() => {
        const active_taskId = activeTaskId || '';
        setActiveTask(teamTasks.find((ts) => ts.id === active_taskId) || null);
    }, [setActiveTask, teamTasks, updateLoading]);


    useEffect(() => {
        loadTeamTasksData();
    }, [teamTasks, activeTeamId, fetchingTasks, updateLoading, createLoading])

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
        loadTeamTasksData,
        deleteTask,
        updateTask,
        activeTask,
        setActiveTeamTask,
        onUnassignedTask,
        onAssignTask,
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