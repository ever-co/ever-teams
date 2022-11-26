import { Instance, SnapshotOut, types } from "mobx-state-tree"
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
    })
    .views((store) => ({

    }))
    .actions((store) => ({
        async createNewTask({ taskTitle, teamId, tenantId, organizationId, authToken }: ITaskCreateParams) {
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

            this.getTeamTasks({ tenantId, organizationId, authToken, activeTeamId: teamId })
        },
        async getTeamTasks({ tenantId, organizationId, activeTeamId, authToken }: ITaskGetParams) {
            const { data } = await getTeamTasksRequest({
                bearer_token: authToken,
                tenantId: tenantId,
                organizationId: organizationId
            });
            const tasks = getTasksByTeamState({ tasks: data.items, activeTeamId: activeTeamId })
            this.setTeamTasks(tasks);
        },

        async deleteTask({ tenantId, taskId, authToken, organizationId, activeTeamId }: ITaskDeleteParams) {
            const { data } = await deleteTaskRequest({ tenantId, taskId, bearer_token: authToken })
            this.getTeamTasks({ tenantId, organizationId, activeTeamId: activeTeamId, authToken })
        },

        async updateTask({ taskData, taskId, authToken, refreshData }: ITaskUpdateParams) {
            const { data } = await updateTaskRequest({ data: taskData, id: taskId }, authToken);
            this.setActiveTask(data)
            this.getTeamTasks({authToken,tenantId:refreshData.tenantId, organizationId:refreshData.organizationId, activeTeamId:refreshData.activeTeamId})
        },
        setActiveTask(task:any) {

            store.activeTask = task;
            store.activeTaskId = task.id;
        },
        setTeamTasks(tasks:any){
            store.teamTasks=tasks
            console.log(store.teamTasks)
        }

    }))

export interface TeamStore extends Instance<typeof TaskStoreModel> { }
export interface TeamStoreSnapshot extends SnapshotOut<typeof TaskStoreModel> { }

