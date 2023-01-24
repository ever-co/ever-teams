import { FC, useCallback, useEffect, useState } from "react";
import { useStores } from "../../../../models";
import { useAuthTeamTasks } from "../../../../services/hooks/features/useAuthTeamTasks";
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks";
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization";
import { ITaskStatus } from "../../../../services/interfaces/ITask";


const useProfileScreenLogic = (
    {
        activeTabIndex,
        userId
    }:
        {
            activeTabIndex: number;
            userId: string
        }
) => {
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);
    const [filterStatus, setFilterStatus] = useState<ITaskStatus>()
    const [showModal, setShowModal] = useState(false)
    const [showFilterPopup, setShowFilterPopup] = useState(false)
    const [assignListRefresh, setAssignListRefresh] = useState(false)
    const { members, } = useOrganizationTeam();


    const member = members.find((m) => {
        return m.employee.userId === userId;
    });

    const currentUser = member?.employee.user;

    const { countTasksByTab } = useAuthTeamTasks(currentUser);
    const { onAssignTask, onUnassignedTask, loadTeamTasksData, createNewTask } = useTeamTasks();

    const {
        TaskStore: { teamTasks, activeTask, setUnassignedTasks, unassignedTasks, assignedTasks, setAssignedTasks, setTeamTasks },
        TimerStore: { localTimerStatus }
    } = useStores();


    const filterTasksByStatus = (status: ITaskStatus) => {
        if (!status) return teamTasks;

        return teamTasks.filter((t) => t.status === status)
    }

    const new_teamTasks = filterTasksByStatus(filterStatus)

    const otherTasks = activeTask
        ? new_teamTasks.filter((t) => t.id !== activeTask.id)
        : new_teamTasks;



    const hangleAssignTask = async (taskId: string) => {
        const data = await onAssignTask({
            taskId,
            memberId: currentUser?.id
        })
        const tasks = await loadTeamTasksData();
        loadAssignAndUnassign(currentUser?.id)
        setAssignListRefresh(!assignListRefresh)
    }


    const hangleUnassignTask = async (taskId: string) => {
        const data = await onUnassignedTask({
            taskId,
            memberId: currentUser?.id
        })
        const tasks = await loadTeamTasksData();
        loadAssignAndUnassign(currentUser?.id)
        setAssignListRefresh(!assignListRefresh)
    }


    const createAndAssign = useCallback(async (title: string) => {
        const created = await createNewTask(title);

        const allTasks = await loadTeamTasksData();
        await hangleAssignTask(created.data.id)
    }, [])


    const loadAssignAndUnassign = (userId: string) => {
        const assigntasks = teamTasks.filter((task) => {
            return task.members.some((m) => m.userId === userId);
        });

        setAssignedTasks(assigntasks)

        const unassigntasks = teamTasks.filter((task) => {
            return !task.members.some((m) => m.userId === userId);
        });
        setUnassignedTasks(unassigntasks)
        setAssignListRefresh(!assignListRefresh)
    };


    return {
        hangleAssignTask,
        hangleUnassignTask,
        otherTasks,
        showModal,
        showFilterPopup,
        setShowFilterPopup,
        selectedTabIndex,
        setShowModal,
        currentUser,
        countTasksByTab,
        setSelectedTabIndex,
        member,
        assignedTasks,
        unassignedTasks,
        activeTask,
        assignListRefresh,
        createAndAssign,
    }
}

export default useProfileScreenLogic;