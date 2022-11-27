import { ITeamTask } from "../interfaces/ITask";

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
