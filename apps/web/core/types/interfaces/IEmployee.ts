import { IUser } from './IUserData';

export interface IEmployee {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	organizationId: string;
	valueDate: any;
	isActive: boolean;
	short_description: any;
	description: any;
	startedWorkOn: any;
	isTrackingTime?: boolean;
	endWork: any;
	payPeriod: string;
	billRateValue: number;
	billRateCurrency: string;
	reWeeklyLimit: number;
	offerDate: any;
	acceptDate: any;
	rejectDate: any;
	employeeLevel: string;
	anonymousBonus: any;
	averageIncome: any;
	averageBonus: any;
	totalWorkHours: any;
	averageExpenses: any;
	show_anonymous_bonus: any;
	show_average_bonus: any;
	show_average_expenses: any;
	show_average_income: any;
	show_billrate: any;
	show_payperiod: any;
	show_start_work_on: any;
	isJobSearchActive: any;
	linkedInUrl: any;
	facebookUrl: any;
	instagramUrl: any;
	twitterUrl: any;
	githubUrl: any;
	gitlabUrl: any;
	upworkUrl: any;
	stackoverflowUrl: any;
	isVerified: any;
	isVetted: any;
	totalJobs: any;
	jobSuccess: any;
	profile_link: string;
	isTrackingEnabled: boolean;
	userId: string;
	contactId: any;
	organizationPositionId: any;
	user?: IUser;
	fullName: string;
	isOnline?: boolean;
}

export type ICreateEmployee = Pick<IEmployee, 'tenantId' | 'userId' | 'organizationId' | 'startedWorkOn'>;
export type IUpdateEmployee = Pick<IEmployee, 'id' | 'isTrackingEnabled' | 'organizationId' | 'tenantId' | 'isActive'>

export interface IRole {
	id?: string;
	createdAt?: string;
	updatedAt?: string;
	tenantId?: string;
	name: string;
	isSystem?: boolean;
}

export type IWorkingEmployee = Pick<
	IEmployee,
	| 'id'
	| 'isActive'
	| 'short_description'
	| 'description'
	| 'startedWorkOn'
	| 'billRateValue'
	| 'billRateCurrency'
	| 'averageIncome'
	| 'averageBonus'
	| 'averageExpenses'
	| 'isTrackingEnabled'
	| 'user'
	| 'fullName'
>;

export interface IRelationnalEmployee {
	readonly employee?: IEmployee;
	readonly employeeId?: IEmployee['id'];
}
