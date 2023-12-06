import { kanbanBoardState } from "@app/stores/kanban";
import { useTaskStatus } from "./useTaskStatus";
import { useRecoilState } from "recoil";
import { useEffect, useState } from "react";
import { ITaskStatusItemList } from "@app/interfaces";

export function useKanban() {

    const [loading, setLoading] = useState<boolean>(true);
   
    const [kanbanBoard, setKanbanBoard] = useRecoilState(kanbanBoardState);

    const taskStatusHook = useTaskStatus();

    /**
     * format data for kanban board
     */
    useEffect(()=> {
        if(taskStatusHook.loading) {
            let kanban = {};
            taskStatusHook.taskStatus.map((taskStatus: ITaskStatusItemList,)=> {
                kanban = {
                    ...kanban,
                    [taskStatus.name ? taskStatus.name : ''] : []
                }
            });
            setKanbanBoard(kanban)
            setLoading(false)
        }
    },[taskStatusHook.loading])

    return {
        data: kanbanBoard,
        isLoading: loading,
        columns: taskStatusHook.taskStatus
    }
}