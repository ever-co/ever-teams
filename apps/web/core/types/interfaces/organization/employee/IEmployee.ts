import { ECurrencies } from '@/core/types/interfaces/enums/currency';
import { IBasePerTenantAndOrganizationEntityModel, ID, ITaggable } from '../../global/base-interfaces';
import { IOrganizationTeam } from '../../team/IOrganizationTeam';
import { IUser } from '../../user/IUser';
import { IOrganizationProject } from '../../project/IOrganizationProject';
import { ITask } from '../../task/ITask';
import { ITimesheet } from '../../timesheet/ITimesheet';
import { ITimeSlot } from '../../timer/time-slot/ITimeSlot';

export interface IEmployee extends IBasePerTenantAndOrganizationEntityModel, ITaggable {
	id: ID;
	[x: string]: any;
	endWork?: Date;
	startedWorkOn?: Date;
	user: IUser;
	userId: ID;
	valueDate?: Date;
	short_description?: string;
	description?: string;
	teams?: IOrganizationTeam[];
	// payPeriod?: PayPeriodEnum;
	billRateValue?: number;
	billRateCurrency?: ECurrencies;
	minimumBillingRate?: number;
	reWeeklyLimit?: number;
	// organizationDepartments?: IOrganizationDepartment[];
	// organizationContacts?: IOrganizationContact[];
	projects?: IOrganizationProject[];
	// organizationPosition?: IOrganizationPosition;
	// skills?: ISkill[];
	// awards?: IEmployeeAward[];
	// favorites?: IFavorite[];
	offerDate?: Date;
	acceptDate?: Date;
	rejectDate?: Date;
	employeeLevel?: string;
	anonymousBonus?: boolean;
	// organizationEmploymentTypes?: IOrganizationEmploymentType[];
	// requestApprovalEmployee?: IRequestApprovalEmployee[];
	// settings?: IEmployeeSetting[];
	// expenses?: IExpense[];
	timesheets?: ITimesheet[];
	tasks?: ITask[];
	// modules?: IOrganizationProjectModule[];
	// sprints?: IOrganizationSprint[];
	// assignedComments?: IComment[];
	timeSlots?: ITimeSlot[];
	// contact?: IContact;
	// candidate?: ICandidate;
	averageIncome?: number;
	totalWorkHours?: number;
	averageExpenses?: number;
	averageBonus?: number;
	show_anonymous_bonus?: boolean;
	show_average_bonus?: boolean;
	show_average_expenses?: boolean;
	show_average_income?: boolean;
	show_billrate?: boolean;
	show_payperiod?: boolean;
	isJobSearchActive?: boolean;
	linkedInUrl?: string;
	facebookUrl?: string;
	instagramUrl?: string;
	twitterUrl?: string;
	githubUrl?: string;
	gitlabUrl?: string;
	upworkUrl?: string;
	stackoverflowUrl?: string;
	jobSuccess?: number;
	isVerified?: boolean;
	isVetted?: boolean;
	totalJobs?: number;
	fullName?: string;
	profile_link?: string;
	isTrackingEnabled: boolean;
	isDeleted?: boolean;
	allowScreenshotCapture?: boolean;
	allowManualTime?: boolean;
	allowModifyTime?: boolean;
	allowDeleteTime?: boolean;

	/** Upwork ID For Gauzy AI*/
	upworkId?: string;
	/** LinkedIn ID For Gauzy AI*/
	linkedInId?: string;
	/** Employee status (Online/Offline) */
	isOnline?: boolean;
	/** Employee time tracking status */
	isTrackingTime?: boolean;
	// True mean active, false away
	isAway?: boolean;
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

export type MemberCard_EditableValues = {
	memberName: string;
	memberTask: string;
	estimateHours: number;
	estimateMinutes: number;
};
