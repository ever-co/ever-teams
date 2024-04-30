import { IEmployee } from './IEmployee';
import { IOrganization } from './IOrganization';
import { ITeamTask } from './ITask';

export type IDailyPlan = {
	id: string;
	createdAt: string;
	updatedAt: string;
	date: Date;
	workTimePlanned: number;
	status: DailyPlanStatusEnum;
	employee?: IEmployee;
	employeeId?: IEmployee['id'];
	organizationId?: IOrganization['id'];
	organization?: IOrganization;
	tasks?: ITeamTask[];
};

export interface ICreateDailyPlan {
	date: Date;
	workTimePlanned: number;
	status: DailyPlanStatusEnum;
	employeeId?: IEmployee['id'];
	taskId?: ITeamTask['id'];
}

export declare enum DailyPlanStatusEnum {
	OPEN = 'open',
	IN_PROGRESS = 'in-progress',
	COMPLETED = 'completed'
}
