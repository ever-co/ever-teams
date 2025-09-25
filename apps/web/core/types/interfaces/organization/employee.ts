import { ECurrencies } from '../../generics/enums/currency';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../common/base-interfaces';
import { IOrganizationTeam } from '../team/organization-team';

import { TUser } from '@/core/types/schemas';
import { IOrganizationProject } from '../project/organization-project';
import { ITimesheet } from '../timesheet/timesheet';
import { ITimeSlot } from '../timer/time-slot/time-slot';
import { TTask } from '../../schemas/task/task.schema';

export interface IEmployee extends IBasePerTenantAndOrganizationEntityModel, ITaggable {
	id: ID;
	[x: string]: any;
	endWork?: Date | null;
	startedWorkOn?: Date | null;
	user?: TUser | null;
	userId: ID;
	valueDate?: Date | null;
	short_description?: string | null;
	description?: string | null;
	teams?: IOrganizationTeam[] | null;
	// payPeriod?: PayPeriodEnum;
	billRateValue?: number | null;
	billRateCurrency?: ECurrencies | null;
	minimumBillingRate?: number | null;
	reWeeklyLimit?: number | null;
	// organizationDepartments?: IOrganizationDepartment[];
	// organizationContacts?: IOrganizationContact[];
	projects?: IOrganizationProject[] | null;
	// organizationPosition?: IOrganizationPosition;
	// skills?: ISkill[];
	// awards?: IEmployeeAward[];
	// favorites?: IFavorite[];
	offerDate?: Date | null;
	acceptDate?: Date | null;
	rejectDate?: Date | null;
	employeeLevel?: string | null;
	anonymousBonus?: boolean | null;
	// organizationEmploymentTypes?: IOrganizationEmploymentType[];
	// requestApprovalEmployee?: IRequestApprovalEmployee[];
	// settings?: IEmployeeSetting[];
	// expenses?: IExpense[];
	timesheets?: ITimesheet[] | null;
	tasks?: TTask[] | null;
	// modules?: IOrganizationProjectModule[];
	// sprints?: IOrganizationSprint[];
	// assignedComments?: IComment[];
	timeSlots?: ITimeSlot[] | null;
	// contact?: IContact;
	// candidate?: ICandidate;
	averageIncome?: number | null;
	totalWorkHours?: number | null;
	averageExpenses?: number | null;
	averageBonus?: number | null;
	show_anonymous_bonus?: boolean | null;
	show_average_bonus?: boolean | null;
	show_average_expenses?: boolean | null;
	show_average_income?: boolean | null;
	show_billrate?: boolean | null;
	show_payperiod?: boolean | null;
	isJobSearchActive?: boolean | null;
	linkedInUrl?: string | null;
	facebookUrl?: string | null;
	instagramUrl?: string | null;
	twitterUrl?: string | null;
	githubUrl?: string | null;
	gitlabUrl?: string | null;
	upworkUrl?: string | null;
	stackoverflowUrl?: string | null;
	jobSuccess?: number | null;
	isVerified?: boolean | null;
	isVetted?: boolean | null;
	totalJobs?: number | null;
	fullName?: string | null;
	profile_link?: string | null;
	isTrackingEnabled: boolean | null;
	isDeleted?: boolean | null;
	allowScreenshotCapture?: boolean | null;
	allowManualTime?: boolean | null;
	allowModifyTime?: boolean | null;
	allowDeleteTime?: boolean | null;

	/** Upwork ID For Gauzy AI*/
	upworkId?: string | null;
	/** LinkedIn ID For Gauzy AI*/
	linkedInId?: string | null;
	/** Employee status (Online/Offline) */
	isOnline?: boolean | null;
	/** Employee time tracking status */
	isTrackingTime?: boolean | null;
	// True mean active, false away
	isAway?: boolean | null;
}

export interface IManagerAssignable {
	isManager?: boolean; // Is Manager for the entity
	assignedAt?: Date; // Assigned At Manager for the entity
}

export interface IRelationalEmployee {
	employeeId?: ID; // ID of the employee, if available.
	employee?: IEmployee;
}
export type ICreateEmployee = Pick<IEmployee, 'tenantId' | 'userId' | 'organizationId' | 'startedWorkOn'>;
export type IUpdateEmployee = Pick<IEmployee, 'id' | 'isTrackingEnabled' | 'organizationId' | 'tenantId' | 'isActive'>;

export type MemberCardEditableValues = {
	memberName: string;
	memberTask: string;
	estimateHours: number;
	estimateMinutes: number;
};
