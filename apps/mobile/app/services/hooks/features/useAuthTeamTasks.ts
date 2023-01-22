import { useCallback, useEffect, useMemo, useState } from "react";
import { useStores } from "../../../models";
import { IUser } from "../../interfaces/interfaces/IUserData";
import { useTeamTasks } from "./useTeamTasks";

export const useAuthTeamTasks=(user: IUser | undefined) =>{
    const { TaskStore: { teamTasks, fetchingTasks, setTeamTasks, setAssignedTasks, setUnassignedTasks, unassignedTasks, assignedTasks },
        teamStore: { activeTeam, setActiveTeam } } = useStores();

    const loadAssignedTasks = useCallback(() => {

        if (!user) return [];
        const tasks = teamTasks.filter((task) => {
            return task.members.some((m) => m.userId === user.id);
        });
        setAssignedTasks(tasks)
        return tasks
    }, []);

    const loadUnassignedTasks = useCallback(() => {
        if (!user) return [];
        const tasks = teamTasks.filter((task) => {
            return !task.members.some((m) => m.userId === user.id);
        });

        setUnassignedTasks(tasks)
        return tasks
    }, []);

    useEffect(()=>{
        console.log("update tasks")
        loadAssignedTasks()
        loadUnassignedTasks();
    },[user, teamTasks, setTeamTasks])

    const countTasksByTab = useCallback((tabIndex: number) => {
        switch (tabIndex) {
            case 0:
                return teamTasks.length;
            case 1:
                return assignedTasks.length;
            case 2:
                return unassignedTasks.length;
            default:
                return 0;

        }
    }, [teamTasks, activeTeam, fetchingTasks])

    useEffect(() => {
        loadAssignedTasks();
        loadUnassignedTasks();
    }, [teamTasks, unassignedTasks, assignedTasks, user])

    return {
        assignedTasks,
        unassignedTasks,
        countTasksByTab,
        loadAssignedTasks,
        loadUnassignedTasks
    };
}