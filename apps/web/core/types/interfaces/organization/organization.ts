import { ETimeFormat } from '../../generics/enums/date';
import { EDefaultValueDateType, EWeekDays } from '../../generics/enums/date';
import { IBasePerTenantEntityModel, ITaggable } from '../common/base-interfaces';
import { IRelationalImageAsset } from '../common/image-asset';
import { IEmployee } from './employee';
import { IOrganizationLanguage } from './organization-language';

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
	imageUrl?: string | null;
	banner: string | null;
	short_description?: string | null;
	client_focus?: string | null;
	show_income?: boolean | null;
	show_profits?: boolean | null;
	show_bonuses_paid?: boolean | null;
	show_total_hours?: boolean | null;
	show_minimum_project_size?: boolean | null;
	show_projects_count?: boolean | null;
	show_clients_count?: boolean | null;
	show_employees_count?: boolean | null;
	overview?: string | null;
	// skills: ISkill[];
	currency?: string | null;
	defaultValueDateType?: EDefaultValueDateType | null;
	defaultAlignmentType?: string | null;
	dateFormat?: string | null;
	brandColor?: string | null;
	timeZone?: string | null;
	officialName?: string | null;
	startWeekOn?: EWeekDays | null;
	taxId?: string | null;
	numberFormat?: string | null;
	// bonusType?: BonusTypeEnum;
	bonusPercentage?: number | null;
	employees?: IEmployee[];
	invitesAllowed?: boolean | null;
	inviteExpiryPeriod?: number | null;
	futureDateAllowed?: boolean | null;
	allowManualTime?: boolean | null;
	allowModifyTime?: boolean | null;
	allowDeleteTime?: boolean | null;
	regionCode?: string | null;
	requireReason?: boolean | null;
	requireDescription?: boolean | null;
	requireProject?: boolean | null;
	requireTask?: boolean | null;
	requireClient?: boolean | null;
	timeFormat?: ETimeFormat | null;
	defaultStartTime?: string | null;
	defaultEndTime?: string | null;
	registrationDate?: Date | null;
	// contact: IContact;
	separateInvoiceItemTaxAndDiscount?: boolean | null;
	// organizationSprints?: IOrganizationSprint[];
	minimumProjectSize?: string | null;
	show_clients?: boolean | null;
	// "left" and "right" values, used to know where to put currency symbol relative to amount
	currencyPosition?: string | null;
	website?: string | null;
	// used in invoice headers to display organization details
	fiscalInformation?: string | null;
	fiscalStartDate?: Date | null;
	fiscalEndDate?: Date | null;
	discountAfterTax?: boolean | null;
	// awards?: IOrganizationAward[];
	languages?: IOrganizationLanguage[];
	// featureOrganizations?: IFeatureOrganization[];
	defaultInvoiceEstimateTerms?: string | null;
	convertAcceptedEstimates?: boolean | null;
	daysUntilDue?: number | null;
	// accountingTemplates?: IAccountingTemplate[];
	// reportOrganizations?: IReportOrganization[];
	/** Upwork Organization For Gauzy AI*/
	upworkOrganizationId?: string | null;
	upworkOrganizationName?: string | null;
}

export interface IOrganizationTimerSetting {
	allowTrackInactivity?: boolean | null;
	inactivityTimeLimit?: number | null;
	activityProofDuration?: number | null;
	isRemoveIdleTime?: boolean | null;
	allowScreenshotCapture?: boolean | null;
	randomScreenshot?: boolean | null;
	trackOnSleep?: boolean | null;
	screenshotFrequency?: string | null;
	enforced?: boolean | null;
	standardWorkHoursPerDay?: number | null;
}

export interface ICustomFieldsObject<T = any> {
	[key: string]: T;
}
export interface IOrganizationCreate {
	name: string;
	currency: string;
	tenantId: string;
	invitesAllowed: true;
}
