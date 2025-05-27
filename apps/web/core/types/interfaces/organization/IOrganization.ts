import { ETimeFormat } from '../enums/date';
import { EDefaultValueDateType, EWeekDays } from '../enums/date';
import { IBasePerTenantEntityModel, ITaggable } from '../global/base-interfaces';
import { IRelationalImageAsset } from '../global/IImageAsset';
import { IEmployee } from './employee/IEmployee';
import { IOrganizationLanguage } from './IOrganizationLanguage';

export interface IOrganization
	extends IBasePerTenantEntityModel,
		IRelationalImageAsset,
		IOrganizationTimerSetting,
		ITaggable {
	name: string;
	isDefault: boolean;
	profile_link: string;
	valueDate?: Date;
	totalEmployees: number;
	status?: string;
	// Organization logo Url
	imageUrl?: string;
	banner: string;
	short_description: string;
	client_focus: string;
	show_income?: boolean;
	show_profits?: boolean;
	show_bonuses_paid?: boolean;
	show_total_hours?: boolean;
	show_minimum_project_size?: boolean;
	show_projects_count?: boolean;
	show_clients_count?: boolean;
	show_employees_count?: boolean;
	overview: string;
	// skills: ISkill[];
	currency: string;
	defaultValueDateType: EDefaultValueDateType;
	defaultAlignmentType?: string;
	dateFormat?: string;
	brandColor?: string;
	timeZone?: string;
	officialName?: string;
	startWeekOn?: EWeekDays;
	taxId?: string;
	numberFormat?: string;
	// bonusType?: BonusTypeEnum;
	bonusPercentage?: number;
	employees?: IEmployee[];
	invitesAllowed?: boolean;
	inviteExpiryPeriod?: number;
	futureDateAllowed?: boolean;
	allowManualTime?: boolean;
	allowModifyTime?: boolean;
	allowDeleteTime?: boolean;
	regionCode?: string;
	requireReason?: boolean;
	requireDescription?: boolean;
	requireProject?: boolean;
	requireTask?: boolean;
	requireClient?: boolean;
	timeFormat?: ETimeFormat;
	defaultStartTime?: string;
	defaultEndTime?: string;
	registrationDate?: Date;
	// contact: IContact;
	separateInvoiceItemTaxAndDiscount?: boolean;
	// organizationSprints?: IOrganizationSprint[];
	minimumProjectSize?: string;
	show_clients?: boolean;
	// "left" and "right" values, used to know where to put currency symbol relative to amount
	currencyPosition?: string;
	website?: string;
	// used in invoice headers to display organization details
	fiscalInformation?: string;
	fiscalStartDate?: Date;
	fiscalEndDate?: Date;
	discountAfterTax?: boolean;
	// awards?: IOrganizationAward[];
	languages?: IOrganizationLanguage[];
	// featureOrganizations?: IFeatureOrganization[];
	defaultInvoiceEstimateTerms?: string;
	convertAcceptedEstimates?: boolean;
	daysUntilDue?: number;
	// accountingTemplates?: IAccountingTemplate[];
	// reportOrganizations?: IReportOrganization[];
	/** Upwork Organization For Gauzy AI*/
	upworkOrganizationId?: string;
	upworkOrganizationName?: string;
}

export interface IOrganizationTimerSetting {
	allowTrackInactivity?: boolean;
	inactivityTimeLimit?: number;
	activityProofDuration?: number;
	isRemoveIdleTime?: boolean;
	allowScreenshotCapture?: boolean;
	randomScreenshot?: boolean;
	trackOnSleep?: boolean;
	screenshotFrequency?: number;
	enforced?: boolean;
	standardWorkHoursPerDay?: number;
}

export interface CustomFieldsObject<T = any> {
	[key: string]: T;
}
export interface IOrganizationCreate {
	name: string;
	currency: string;
	tenantId: string;
	invitesAllowed: true;
}
