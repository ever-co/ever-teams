export const BREAKPOINTS = {
	MOBILE: 768
};
type RoleName =
	| 'SUPER_ADMIN'
	| 'ADMIN'
	| 'DATA_ENTRY'
	| 'EMPLOYEE'
	| 'CANDIDATE'
	| 'MANAGER'
	| 'VIEWER'
	| 'INTERVIEWER';

interface Role {
	isActive: boolean;
	isArchived: boolean;
	name: RoleName;
	isSystem: boolean;
}
type PermissionMap = {
	[K in RoleName]?: RoleName[];
};
export const ROLES: Role[] = [
	{
		isActive: true,
		isArchived: false,
		name: 'SUPER_ADMIN',
		isSystem: true
	},
	{
		isActive: true,
		isArchived: false,
		name: 'ADMIN',
		isSystem: true
	},
	{
		isActive: true,
		isArchived: false,
		name: 'DATA_ENTRY',
		isSystem: false
	},
	{
		isActive: true,
		isArchived: false,
		name: 'EMPLOYEE',
		isSystem: true
	},
	{
		isActive: true,
		isArchived: false,
		name: 'CANDIDATE',
		isSystem: true
	},
	{
		isActive: true,
		isArchived: false,
		name: 'MANAGER',
		isSystem: false
	},
	{
		isActive: true,
		isArchived: false,
		name: 'VIEWER',
		isSystem: true
	},
	{
		isActive: true,
		isArchived: false,
		name: 'INTERVIEWER',
		isSystem: false
	}
];
export const PERMISSION_ROLES: PermissionMap = {
	MANAGER: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
	DATA_ENTRY: ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY', 'MANAGER'],
	EMPLOYEE: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE', 'MANAGER'],
	CANDIDATE: ['SUPER_ADMIN', 'ADMIN', 'CANDIDATE'],
	INTERVIEWER: ['SUPER_ADMIN', 'ADMIN', 'INTERVIEWER'],
	VIEWER: ['SUPER_ADMIN', 'ADMIN', 'VIEWER']
};
