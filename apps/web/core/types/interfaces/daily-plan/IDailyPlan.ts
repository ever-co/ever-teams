import { IBasePerTenantAndOrganizationEntity, ID } from '../global/base-interfaces';
import { IRelationalOrganizationTeam } from '../team/IOrganizationTeam';
import { DailyPlanStatusEnum } from '../../enums/daily-plan';
import { IRelationalEmployee } from '../organization/employee/IEmployee';
import { ITask } from '../task/ITask';

export interface IDailyPlanBase extends IBasePerTenantAndOrganizationEntity {
	date: Date;
	workTimePlanned: number;
	status: DailyPlanStatusEnum;
}

export interface IRemoveTaskFromManyPlansRequest {
	employeeId?: ID;
	plansIds?: ID[];
	organizationId?: ID;
}

export interface IDailyPlan extends IDailyPlanBase, IRelationalEmployee, IRelationalOrganizationTeam {
	tasks?: ITask[];
}

export interface ICreateDailyPlan extends Omit<IDailyPlanBase, 'id'>, IRelationalEmployee, IRelationalOrganizationTeam {
	taskId?: ID;
}

export interface IUpdateDailyPlan
	extends Partial<IDailyPlanBase>,
		Pick<ICreateDailyPlan, 'employeeId'>,
		Partial<Pick<IRelationalOrganizationTeam, 'organizationTeamId'>> {}

export interface IDailyPlanTasksUpdate
	extends Pick<ICreateDailyPlan, 'taskId' | 'employeeId'>,
		Omit<IBasePerTenantAndOrganizationEntity, 'id'> {}
