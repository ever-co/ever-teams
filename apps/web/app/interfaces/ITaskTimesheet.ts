import { IEmployee } from './IEmployee';
import { IProject } from './IProject';
import { ITeamTask } from './ITask';
import { ITimerSlot } from './timer/ITimerSlot';

export interface ITaskTimesheet {
	title: string;
	description?: string;
	metaData?: string;
	date: Date;
	time: string;
	duration?: number;
	type?: string;
	source?: string;
	employee?: IEmployee;
	employeeId?: IEmployee['id'];
	project?: IProject;
	projectId?: IProject['id'];
	timeSlot?: ITimerSlot;
	timeSlotId?: ITimerSlot['id'];
	task?: ITeamTask;
	taskId?: ITeamTask['id'];
}
