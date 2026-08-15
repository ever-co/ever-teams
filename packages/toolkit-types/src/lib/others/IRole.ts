export enum RoleName {
	'ADMIN' = 'ADMIN',
	'SUPER_ADMIN' = 'SUPER_ADMIN',
	'EMPLOYEE' = 'EMPLOYEE',
	'DATA_ENTRY' = 'DATA_ENTRY',
	'CANDIDATE' = 'CANDIDATE',
	'MANAGER' = 'MANAGER',
	'VIEWER' = 'VIEWER',
	'INTERVIEWER' = 'INTERVIEWER'
}

export interface IRole {
	id: string;
	createdAt: string;
	updatedAt: string;
	tenantId: string;
	name: RoleName;
	isSystem: boolean;
}
