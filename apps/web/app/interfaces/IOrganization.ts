export interface IOrganization {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	name: string;
	isDefault: boolean;
	profile_link: string;
	banner: any;
	totalEmployees: any;
	short_description: any;
	client_focus: any;
	overview: any;
	imageUrl: string;
	currency: string;
	valueDate: any;
	defaultValueDateType: string;
	isActive: boolean;
	defaultAlignmentType: any;
	timeZone: any;
	regionCode: any;
	brandColor: string;
	dateFormat: any;
	officialName: any;
	startWeekOn: any;
	taxId: any;
	numberFormat: any;
	minimumProjectSize: any;
	bonusType: any;
	bonusPercentage: any;
	invitesAllowed: any;
	show_income: boolean;
	show_profits: boolean;
	show_bonuses_paid: boolean;
	show_total_hours: boolean;
	show_minimum_project_size: boolean;
	show_projects_count: boolean;
	show_clients_count: boolean;
	show_clients: boolean;
	show_employees_count: boolean;
	inviteExpiryPeriod: any;
	fiscalStartDate: any;
	fiscalEndDate: any;
	registrationDate: any;
	futureDateAllowed: any;
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
	separateInvoiceItemTaxAndDiscount: any;
	website: any;
	fiscalInformation: any;
	currencyPosition: string;
	discountAfterTax: any;
	defaultStartTime: any;
	defaultEndTime: any;
	defaultInvoiceEstimateTerms: any;
	convertAcceptedEstimates: any;
	daysUntilDue: any;
	contactId: string;
}

export type IUserOrganization = Pick<
	IOrganization,
	'id' | 'isActive' | 'isDefault' | 'tenantId'
> & {
	userId: string;
	organizationId: string;
	updatedAt: string;
	createdAt: string;
};

export interface IOrganizationCreate {
	name: string;
	currency: string;
	tenantId: string;
	invitesAllowed: true;
}
