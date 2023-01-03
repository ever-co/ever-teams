import { useCallback, useEffect, useMemo, useState } from "react";
import { useStores } from "../../../models";
import { createTaskRequest, deleteTaskRequest, getTeamTasksRequest, updateTaskRequest } from "../../client/requests/tasks";
import { OT_Member } from "../../interfaces/IOrganizationTeam";
import { ICreateTask, ITeamTask } from "../../interfaces/ITask";
import { IUser } from "../../interfaces/IUserData";
import { getTasksByTeamState } from "../../teams/tasks";

export function useTeamTasks() {
    const { authenticationStore: { tenantId, organizationId, authToken, user },
        teamStore: { activeTeam, activeTeamId, setActiveTeam },
        TaskStore: { teamTasks, activeTask, fetchingTasks, setTeamTasks, setActiveTask, activeTaskId, setActiveTaskId, setFetchingTasks, setAssignedTasks, setUnassignedTasks }
    } = useStores();


    // Create a new Task
    const createNewTask = useCallback(async (title: string) => {
        if (title.trim().length < 2) return {
            error: "Task title is valid"
        };

        setFetchingTasks(true)
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
        const { data } = await createTaskRequest({
            data: dataBody,
            bearer_token: authToken
        })
        setFetchingTasks(false)
        return {
            data
        }
    }, [])


    // Update a task
    const updateTask = useCallback(async (task: ITeamTask, id: string) => {

        const { data } = await updateTaskRequest({ data: task, id }, authToken);
        await loadTeamTasksData();
        return { data }
    }, [])


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
    const loadTeamTasksData = useCallback(async () => {

        const { data } = await getTeamTasksRequest({
            bearer_token: authToken,
            tenantId: tenantId,
            organizationId: organizationId
        });

        const tasks = getTasksByTeamState({ tasks: data.items, activeTeamId: activeTeamId })
        setTeamTasks(tasks)
        setFetchingTasks(true)
        return tasks
    }, [])



    // Assign a task to a member
    const onAssignTask = useCallback(async ({ taskId, memberId }: { taskId: string, memberId: string }) => {

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
        const tasks = await loadTeamTasksData();
        loadAssignAndUnassign(memberId)
        return data;
    }, [])


    // Create a new Task and assign to a member
    const createAndAssign = useCallback(async ({ title, userId }: { title: string, userId: string }) => {

        if (title.trim().length < 2) return {
            error: "Task title is valid"
        };

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
        const { data: taskCreated } = await createTaskRequest({
            data: dataBody,
            bearer_token: authToken
        })

        await loadTeamTasksData();

        const taskId = taskCreated?.id;
        const editedTask = onAssignTask({ taskId, memberId: userId })
        return editedTask;
    }, []);


    // UNASSIGN A TASK
    const onUnassignedTask = useCallback(async ({ taskId, memberId }: { taskId: string, memberId: string }) => {
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
        const tasks = await loadTeamTasksData();
        loadAssignAndUnassign(memberId)
        return data;
    }, []);

    const loadAssignAndUnassign = useCallback((userId: string) => {

        // const allTasks = await loadTeamTasksData();
        const assigntasks = teamTasks.filter((task) => {
            return task.members.some((m) => m.userId === userId);
        });

        setAssignedTasks(assigntasks)

        const unassigntasks = teamTasks.filter((task) => {
            return !task.members.some((m) => m.userId === userId);
        });
        setUnassignedTasks(unassigntasks)
    }, []);

    // Get the active task id and update active task data
    useEffect(() => {
        const active_taskid = activeTaskId || '';
        setActiveTask(teamTasks.find((ts) => ts.id === active_taskid) || null);
    }, [setActiveTask, teamTasks]);


    useEffect(() => {
        loadTeamTasksData();
    }, [teamTasks, fetchingTasks])

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
        setActiveTeamTask,
        onUnassignedTask,
        onAssignTask,
        createAndAssign,
        loadAssignAndUnassign
    }
}