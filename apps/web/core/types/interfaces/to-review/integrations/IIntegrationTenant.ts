export interface IIntegrationTenant {
	id: string;
	createdAt: string | Date;
	updatedAt: string | Date;
	tenantId: string;
	organizationId: string;
	name: string;
	integrationId: string;
}
