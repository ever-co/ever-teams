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
	billing: string;
	currency: string;
	id: string;
	image: string | null;
	imageUrl: string;
	name: string;
	owner: string;
	public: boolean;
	taskListType: string;
}

export interface IProjectCreate {
	name: string;
	organizationId: string;
	tenantId: string;
}
