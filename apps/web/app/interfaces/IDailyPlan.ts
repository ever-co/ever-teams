import { IBasePerTenantAndOrganizationEntity, ID } from './IBaseModel';
import { IRelationnalEmployee } from './IEmployee';
import { IRelationalOrganizationTeam } from './IOrganizationTeam';
import { ITeamTask } from './ITask';

export interface IDailyPlanBase extends IBasePerTenantAndOrganizationEntity {
	date: Date;
	workTimePlanned: number;
	status: DailyPlanStatusEnum;
}

export interface IRemoveTaskFromManyPlans {
	employeeId?: ID;
	plansIds?: ID[];
	organizationId?: ID;
}

export interface IDailyPlan extends IDailyPlanBase, IRelationnalEmployee, IRelationalOrganizationTeam {
	tasks?: ITeamTask[];
}

export interface ICreateDailyPlan extends IDailyPlanBase, IRelationnalEmployee, IRelationalOrganizationTeam {
	taskId?: ID;
}

export interface IUpdateDailyPlan
	extends Partial<IDailyPlanBase>,
	Pick<ICreateDailyPlan, 'employeeId'>,
	Partial<Pick<IRelationalOrganizationTeam, 'organizationTeamId'>> { }

export interface IDailyPlanTasksUpdate
	extends Pick<ICreateDailyPlan, 'taskId' | 'employeeId'>,
	IBasePerTenantAndOrganizationEntity { }

export enum DailyPlanStatusEnum {
	OPEN = 'open',
	IN_PROGRESS = 'in-progress',
	COMPLETED = 'completed'
}

export interface IUpdateTimesheetStatus {
	ids: ID[] | ID,
	organizationId?: ID,
	status: ID,
	tenantId?: ID
}

export type IDailyPlanMode = 'today' | 'tomorrow' | 'custom';
