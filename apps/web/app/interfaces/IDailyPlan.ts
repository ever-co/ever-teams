import { IBasePerTenantAndOrganizationEntity } from './IBaseModel';
import { IRelationnalEmployee } from './IEmployee';
import { ITeamTask } from './ITask';

export interface IDailyPlanBase extends IBasePerTenantAndOrganizationEntity {
	date: Date;
	workTimePlanned: number;
	status: DailyPlanStatusEnum;
}

export interface IDailyPlan extends IDailyPlanBase, IRelationnalEmployee {
	tasks?: ITeamTask[];
}

export interface ICreateDailyPlan extends IDailyPlanBase, IRelationnalEmployee {
	taskId?: ITeamTask['id'];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IUpdateDailyPlan extends Partial<IDailyPlanBase> {}

export interface IDailyPlanTasksUpdate
	extends Pick<ICreateDailyPlan, 'taskId' | 'employeeId'>,
		IBasePerTenantAndOrganizationEntity {}

export enum DailyPlanStatusEnum {
	OPEN = 'open',
	IN_PROGRESS = 'in-progress',
	COMPLETED = 'completed'
}

export type IDailyPlanMode = 'today' | 'tomorow' | 'custom';
