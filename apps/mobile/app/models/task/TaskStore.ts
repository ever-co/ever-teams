import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { h_filter } from "../../screens/Authenticated/TimerScreen/components/ComboBox";
import { ICreateTask, ITeamTask } from "../../services/interfaces/ITask";
import { createTaskRequest, deleteTaskRequest, getTeamTasksRequest, updateTaskRequest } from "../../services/client/requests/tasks";
import { getTasksByTeamState, ITaskCreateParams, ITaskDeleteParams, ITaskGetParams, ITaskUpdateParams } from "./Task";


export const TaskStoreModel = types
    .model("TaskStore")
    .props({
        teamTasks: types.array(types.frozen<ITeamTask>()),
        activeTask: types.optional(types.frozen(), {status:"Todo"}),
        activeTaskId: types.optional(types.string, ""),
        assignedTasks: types.array(types.frozen<ITeamTask>()),
        unassignedTasks: types.array(types.frozen<ITeamTask>()),
        fetchingTasks: types.optional(types.boolean, false),
        tasksStatisticsState: types.optional(types.frozen(), null),
        statActiveTask: types.optional(types.frozen(), {total:0, today:0}),
        count:types.optional(types.number,0)
    })
    .views((store) => ({

    }))
    .actions((store) => ({

        setAssignedTasks(value: any) {
            store.assignedTasks = value
        },

        setUnassignedTasks(value: any) {
            store.unassignedTasks = value
        },

        setActiveTask(task: any) {
            store.activeTask = task;
        },
        setActiveTaskId(id: string) {
            store.activeTaskId = id;
        },
        setTasksStatisticsState(stats: any) {
            store.tasksStatisticsState = stats
        },
        setStatActiveTask(stats: any) {
            store.statActiveTask = stats
        },
        setTeamTasks(tasks: any) {
            store.teamTasks = tasks
        },
        setFetchingTasks(value: boolean) {
            store.fetchingTasks = value
        },
        setCount(value:number){
            store.count=value;
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

