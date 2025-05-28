import { IBasePerTenantAndOrganizationEntityModel, ID } from '@/core/types/interfaces/common/base-interfaces';
import { IRelationalOrganizationTeam } from '../../team/organization-team';
import { EDailyPlanStatus } from '../../enums/daily-plan';
import { IRelationalEmployee } from '../../organization/employee';
import { ITask } from '../task';

export interface IDailyPlanBase extends IBasePerTenantAndOrganizationEntityModel {
	date: Date;
	workTimePlanned: number;
	status: EDailyPlanStatus;
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
		Omit<IBasePerTenantAndOrganizationEntityModel, 'id'> {}
