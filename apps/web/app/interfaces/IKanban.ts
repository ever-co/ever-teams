import { ITeamTask } from "./ITask";

export interface IKanban {
    [key: string]: ITeamTask[]
}