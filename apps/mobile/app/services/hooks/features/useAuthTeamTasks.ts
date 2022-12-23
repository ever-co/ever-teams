import { useMemo } from "react";
import { useStores } from "../../../models";
import { IUser } from "../../interfaces/interfaces/IUserData";

export function useAuthTeamTasks(user: IUser | undefined) {
    const { TaskStore: { teamTasks } } = useStores();


    const assignedTasks = useMemo(() => {
        if (!user) return [];
        return teamTasks.filter((task) => {
            return task.members.some((m) => m.id === user.id);
        });
    }, [teamTasks, user]);

    const unassignedTasks = useMemo(() => {
        if (!user) return [];
        return teamTasks.filter((task) => {
            return !task.members.some((m) => m.id === user.id);
        });
    }, [teamTasks, user]);

    return {
        assignedTasks,
        unassignedTasks,
    };
}