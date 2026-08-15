import { type Theme } from 'theme-ui';

import type { LogType, TimerSource } from './enums';
import type { IRole } from '../others/IRole';

export interface ITime {
	hours: number;
	minutes: number;
	seconds: number;
}

export type ISeparator = string | React.ReactElement;

export interface ITheme extends Theme<{}> {
	colors: { textColor: string; backgroundColor: string; primaryColor: string; secondaryColor: string };
}

export interface ICustomTheme extends Theme<{}> {}

export interface ITenant {
	archivedAt: string | null;
	createdAt: string | null;
	deletedAt: string | null;
	id: string;
	imageId: string | null;
	isActive: boolean;
	isArchived: boolean;
	logo: string;
	name: string;
	standardWorkHoursPerDay: number;
	updatedAt: string | null;
}

export interface IEmployee {
	fullName: string;
	deletedAt: string | null;
	id: string;
	createdAt: string | null;
	updatedAt: string | null;
	isActive: boolean;
	isArchived: boolean;
	tenantId: string | null;
	organizationId: string;
	valueDate: string | null;
	short_description: string | null;
	description: string | null;
	startedWorkOn: string | null;
	endWork: string | null;
	payPeriod: string | null;
	billRateValue: number;
	minimumBillingRate: string | null;
	billRateCurrency: string | null;
	reWeeklyLimit: string | null;
	offerDate: string | null;
	acceptDate: string | null;
	rejectDate: string | null;
	employeeLevel: string | null;
	anonymousBonus: string | null;
	averageIncome: string | null;
	averageBonus: string | null;
	totalWorkHours: number;
	averageExpenses: string | null;
	show_anonymous_bonus: string | null;
	show_average_bonus: string | null;
	show_average_expenses: string | null;
	show_average_income: string | null;
	show_billrate: string | null;
	show_payperiod: string | null;
	show_start_work_on: string | null;
	isJobSearchActive: string | null;
	linkedInUrl: string | null;
	facebookUrl: string | null;
	instagramUrl: string | null;
	twitterUrl: string | null;
	githubUrl: string | null;
	gitlabUrl: string | null;
	upworkUrl: string | null;
	stackoverflowUrl: string | null;
	isVerified: string | null;
	isVetted: string | null;
	totalJobs: string | null;
	jobSuccess: string | null;
	profile_link: string | null;
	isTrackingEnabled: boolean;
	isOnline: boolean;
	isAway: boolean;
	isTrackingTime: boolean;
	allowScreenshotCapture: boolean;
	upworkId: string | null;
	linkedInId: string | null;
	userId: string | null;
	contactId: string | null;
	organizationPositionId: string | null;
	isDeleted: boolean;
	organization: IOrganization;
	user?: IUser;
}

export interface IOrganization {
	deletedAt: string | null;
	id: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	isActive: boolean;
	isArchived: boolean;
	tenantId: string | null;
	name: string | null;
	isDefault: boolean;
	profile_link: string | null;
	banner: string | null;
	totalEmployees: number;
	short_description: string | null;
	client_focus: string | null;
	overview: string | null;
	imageUrl: string | null;
	currency: string | null;
	valueDate: string | null;
	defaultValueDateType: string | null;
	defaultAlignmentType: string | null;
	timeZone: string | null;
	regionCode: string | null;
	brandColor: string | null;
	dateFormat: string | null;
	officialName: string | null;
	startWeekOn: string | null;
	taxId: string | null;
	numberFormat: string | null;
	minimumProjectSize: number;
	bonusType: string | null;
	bonusPercentage: string | null;
	invitesAllowed: boolean;
	show_income: boolean;
	show_profits: boolean;
	show_bonuses_paid: boolean;
	show_total_hours: boolean;
	show_minimum_project_size: boolean;
	show_projects_count: boolean;
	show_clients_count: boolean;
	show_clients: boolean;
	show_employees_count: boolean;
	inviteExpiryPeriod: number;
	fiscalStartDate: string | null;
	fiscalEndDate: string | null;
	registrationDate: string | null;
	futureDateAllowed: boolean;
	allowManualTime: boolean;
	allowModifyTime: boolean;
	allowDeleteTime: boolean;
	allowTrackInactivity: boolean;
	inactivityTimeLimit: number;
	activityProofDuration: number;
	requireReason: boolean;
	requireDescription: boolean;
	requireProject: boolean;
	requireTask: boolean;
	requireClient: boolean;
	timeFormat: number;
	separateInvoiceItemTaxAndDiscount: string | null;
	website: string | null;
	fiscalInformation: string | null;
	currencyPosition: string | null;
	discountAfterTax: string | null;
	defaultStartTime: string | null;
	defaultEndTime: string | null;
	defaultInvoiceEstimateTerms: string | null;
	convertAcceptedEstimates: string | null;
	daysUntilDue: string | null;
	isRemoveIdleTime: boolean;
	allowScreenshotCapture: boolean;
	upworkOrganizationId: string | null;
	upworkOrganizationName: string | null;
	randomScreenshot: boolean;
	trackOnSleep: boolean;
	screenshotFrequency: string | null;
	enforced: boolean;
	contactId: string | null;
	imageId: string | null;
	image: string | null;
}

export enum ILanguages {
	'en',
	'bg',
	'he',
	'ru',
	'fr',
	'es',
	'zh',
	'de',
	'pt',
	'it',
	'nl',
	'pl',
	'ar'
}

export interface IUserCreateInput extends IRelationalImageAsset {
	firstName?: string;
	lastName?: string;
	email?: string;
	phoneNumber?: string;
	username?: string;
	role?: IRole;
	roleId?: string;
	hash?: string;
	imageUrl?: string;
	preferredLanguage?: string;
	timeZone?: string;
	timeFormat?: string;
	defaultTeamId?: string;
	lastTeamId?: string;
	defaultOrganization?: IOrganization;
	defaultOrganizationId?: string;
	lasOrganization?: IOrganization;
	lastOrganizationId?: string;
}

export interface IUserUpdateInput extends IUserCreateInput {
	id?: string;
	organizationId?: string;
	tenantId?: string;
}

export interface IRelationalImageAsset {
	image?: IImageAsset | null;
	imageId?: string | null;
}

export interface IImageAsset {
	fullUrl?: string;
	thumbUrl?: string;
}

export interface IUser {
	deletedAt: string;
	id: string;
	createdAt: string;
	updatedAt: string;
	isActive: boolean;
	isArchived: boolean;
	tenant?: ITenant;
	tenantId: string;
	thirdPartyId: string;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber: string;
	username: string;
	timeZone: string;
	timeFormat: string;
	hash: string;
	refreshToken: string;
	imageUrl: string;
	preferredLanguage: string;
	preferredComponentLayout: ['CARDS_GRID', 'TABLE'];
	code: string;
	codeExpireAt: string;
	emailVerifiedAt: string;
	emailToken: string;
	roleId: string;
	imageId: string;
	organizationId: string;
	image: IImage;
	role: IRole | null;
	employee: IEmployee;
}

export interface IImage {
	createdAt: string | null;
	deletedAt: string | null;
	fullUrl: string;
	height: number;
	id: string;
	isActive: boolean;
	isArchived: boolean;
	isFeatured: boolean;
	name: string;
	organizationId: string;
	size: number;
	tenantId: string;
	thumb: string;
	thumbUrl: string;
	updatedAt: string;
	url: string;
	width: number;
}

export interface ITimeSlot {
	createdAt?: string | null;
	deletedAt?: string | null;
	description?: string | null;
	duration?: number;
	editedAt?: string | null;
	employeeId?: string | null;
	id?: string | null;
	isActive?: boolean;
	isArchived?: boolean;
	isBillable?: boolean;
	isEdited?: boolean;
	isRunning?: boolean;
	logType?: LogType;
	organizationContactId?: string | null;
	organizationId: string;
	organizationTeamId: string;
	projectId: string;
	reason?: string | null;
	source?: TimerSource;
	startedAt?: string | null;
	stoppedAt?: string | null;
	taskId: string;
	tenantId: string;
	timesheetId?: string | null;
	updatedAt?: string | null;
	version?: string | null;
}

export interface ITimerStatus {
	duration: number;
	lastLog: ITimeSlot | null;
	running: boolean;
}

export interface ILog {
	duration: number;
	employee: IEmployeeWithUser;
	employeeId: string;
	id: string;
	isEdited: boolean;
	startedAt: string;
	stoppedAt: string;
	timeSlots: ITimeSlot[];
}
export interface IOrganizationMembers {
	total: number;
	items: IUser[];
}

export interface IDailyReport {
	logs: ILog[];
	sum: number;
}

export type IEmployeeWithUser = IEmployee & { user: IUser };

export interface IWeeklyReport {
	activity: number;
	dates: { [key: string]: number | IDailyReport };
	employee: IEmployeeWithUser;
	sum: number;
}

export type IWeeklyReports = IWeeklyReport[];

export interface ICurrentTeamsState {
	projectId: string | null;
	taskId: string | null;
	organizationTeamId: string | null;
	clientId: any;
}
