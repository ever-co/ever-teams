import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { h_filter } from "../../screens/Authenticated/TimerScreen/components/ComboBox";
import { ICreateTask, ITeamTask } from "../../services/interfaces/ITask";
import { createTaskRequest, deleteTaskRequest, getTeamTasksRequest, updateTaskRequest } from "../../services/requests/tasks";
import { getTasksByTeamState, ITaskCreateParams, ITaskDeleteParams, ITaskGetParams, ITaskUpdateParams } from "./Task";


export const TaskStoreModel = types
    .model("TaskStore")
    .props({
        teamTasks: types.array(types.frozen<ITeamTask>()),
        activeTask: types.optional(types.frozen(), {
            id: "",
            createdAt: "",
            updatedAt: "",
            tenantId: "",
            organizationId: "",
            number: 0,
            title: "",
            description: "",
            status: "Todo",
            estimate: 0,
            dueDate: "",
            projectId: "",
            creatorId: "",
            organizationSprintId: undefined,
            project: undefined,
            tags: [],
            organizationSprint: undefined,
            members: [],
            teams: [],
            creator: undefined,
            taskNumber: ""
        }),
        activeTaskId: types.optional(types.string, ""),
        fetchingTasks: types.optional(types.boolean, false)
    })
    .views((store) => ({

    }))
    .actions((store) => ({
        async createNewTask({ taskTitle, teamId, tenantId, organizationId, authToken }: ITaskCreateParams) {
            this.setFetchingTasks(true)
            if (taskTitle.trim().length < 2) return;

            const dataBody: ICreateTask = {
                title: taskTitle,
                status: "Todo",
                description: "",
                tags: [],
                teams: [{
                    id: teamId
                }],
                estimate: 0,
                organizationId: organizationId,
                tenantId: tenantId
            }
            const { data } = await createTaskRequest({
                data: dataBody,
                bearer_token: authToken
            })

            const tasks = this.getTeamTasks({ tenantId, organizationId, authToken, activeTeamId: teamId })
            this.setFetchingTasks(true)

            const created = (await tasks).find(task => task.id === data?.id)
            this.setActiveTask(created)
            return created;
        },
        async getTeamTasks({ tenantId, organizationId, activeTeamId, authToken }: ITaskGetParams) {
            const { data } = await getTeamTasksRequest({
                bearer_token: authToken,
                tenantId: tenantId,
                organizationId: organizationId
            });
            const tasks = getTasksByTeamState({ tasks: data.items, activeTeamId: activeTeamId })
            this.setTeamTasks(tasks);
            return tasks;
        },

        async deleteTask({ tenantId, taskId, authToken, organizationId, activeTeamId }: ITaskDeleteParams) {
            const { data } = await deleteTaskRequest({ tenantId, taskId, bearer_token: authToken })
            this.getTeamTasks({ tenantId, organizationId, activeTeamId: activeTeamId, authToken })
        },

        async updateTask({ taskData, taskId, authToken, refreshData }: ITaskUpdateParams) {
            this.setFetchingTasks(true)
            const { data } = await updateTaskRequest({ data: taskData, id: taskId }, authToken);
            this.setActiveTask(data)
            console.log(data)
            this.getTeamTasks({ authToken, tenantId: refreshData.tenantId, organizationId: refreshData.organizationId, activeTeamId: refreshData.activeTeamId })
            this.setFetchingTasks(false)
        },
        setActiveTask(task: any) {

            store.activeTask = task;
            store.activeTaskId = task.id;
        },
        setTeamTasks(tasks: any) {
            store.teamTasks = tasks
        },
        setFetchingTasks(value: boolean) {
            store.fetchingTasks = value
        },
        filterDataByStatus(query, tasks: ITeamTask[], filter) {
            return query.trim() === ""
                ? tasks.filter((task) => h_filter(task.status, filter))
                : tasks.filter(
                    (task) =>
                        task.title
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, "")
                            .startsWith(query.toLowerCase().replace(/\s+/g, "")) &&
                        h_filter(task.status, filter)
                );
        },
        resetTeamTasksData() {
            store.activeTask = {}
            store.activeTaskId = ""
            store.teamTasks.clear()
        }

    }))

export interface TeamStore extends Instance<typeof TaskStoreModel> { }
export interface TeamStoreSnapshot extends SnapshotOut<typeof TaskStoreModel> { }

