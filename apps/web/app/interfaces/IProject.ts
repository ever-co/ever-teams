export interface IProjectRepository {
	id: string;
	createdAt?: string;
	updatedAt?: string;
	isActive: boolean;
	isArchived: boolean;
	tenantId: string;
	organizationId: string;
	repositoryId: number;
	name: string;
	fullName: string;
	owner: string;
	integrationId: string;
}

export interface IProject {
	id: string;
	createdAt?: string;
	updatedAt?: string;
	tenantId: string;
	organizationId: string;
	repositoryId?: number;
	repository?: IProjectRepository;
}

export interface IProjectCreate {
	name: string;
	organizationId: string;
	tenantId: string;
}
