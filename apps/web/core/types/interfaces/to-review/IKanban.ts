import { ITask } from './ITask';

export interface IKanban {
	[key: string]: ITask[];
}
