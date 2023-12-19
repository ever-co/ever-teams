import { kanbanBoardState } from "@app/stores/kanban";
import { useTaskStatus } from "./useTaskStatus";
import { useRecoilState } from "recoil";
import { useEffect, useState } from "react";
import { ITaskStatusItemList, ITeamTask } from "@app/interfaces";
import { useTeamTasks } from "./useTeamTasks";

export function useKanban() {

    const [loading, setLoading] = useState<boolean>(true);
   
    const [kanbanBoard, setKanbanBoard] = useRecoilState(kanbanBoardState);

    const taskStatusHook = useTaskStatus();

    const { tasks, tasksFetching, updateTask } = useTeamTasks();

    /**
     * format data for kanban board
     */
    useEffect(()=> {
        if(!taskStatusHook.loading && !tasksFetching) {
            let kanban = {};

            const getTasksByStatus = (status: string | undefined) => {
                return tasks.filter((task: ITeamTask)=> {
                    return task.status === status
                })
            }

            taskStatusHook.taskStatus.map((taskStatus: ITaskStatusItemList,)=> {
                kanban = {
                    ...kanban,
                    [taskStatus.name ? taskStatus.name : ''] : getTasksByStatus(taskStatus.name)
                }
            });
            setKanbanBoard(kanban)
            setLoading(false)
        }
    },[taskStatusHook.loading, tasksFetching])

    /**
     * collapse or show kanban column
     */
    const toggleColumn = (column: string, status: boolean) => {
        const columnData = taskStatusHook.taskStatus.filter((taskStatus: ITaskStatusItemList,)=> {
            return taskStatus.name === column
         });

         const columnId = columnData[0].id;

		taskStatusHook.editTaskStatus(columnId, {
			isCollapsed: status
		});
	}

    const isColumnCollapse = (column: string) => {
        const columnData = taskStatusHook.taskStatus.filter((taskStatus: ITaskStatusItemList,)=> {
           return taskStatus.name === column
        });

        return columnData[0].isCollapsed
    }

    const reorderStatus = (itemStatus: String, index: number) => {
        taskStatusHook.taskStatus.filter((status: ITaskStatusItemList)=> {
            return status.name === itemStatus
        }).map((status: ITaskStatusItemList)=> {
            taskStatusHook.editTaskStatus(status.id, {
                order: index
            });
        })
    }

    return {
        data: kanbanBoard,
        isLoading: loading,
        columns: taskStatusHook.taskStatus,
        updateKanbanBoard: setKanbanBoard,
        updateTaskStatus: updateTask,
        toggleColumn,
        isColumnCollapse,
        reorderStatus
    }
}