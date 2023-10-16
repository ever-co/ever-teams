export interface IProject {
	id: string;
	createdAt?: string;
	updatedAt?: string;
	tenantId: string;
	organizationId: string;
	externalRepositoryId?: number;
}

export interface IProjectCreate {
	name: string;
	organizationId: string;
	tenantId: string;
}
