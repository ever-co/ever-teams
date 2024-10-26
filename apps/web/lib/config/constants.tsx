export const BREAKPOINTS = {
	MOBILE: 768
};
export const ROLES = [
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
export const PERMISSION_ROLES = {
	MANAGER: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
	DATA_ENTRY: ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY', 'MANAGER'],
	EMPLOYEE: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE', 'MANAGER'],
	CANDIDATE: ['SUPER_ADMIN', 'ADMIN', 'CANDIDATE'],
	INTERVIEWER: ['SUPER_ADMIN', 'ADMIN', 'INTERVIEWER'],
	VIEWER: ['SUPER_ADMIN', 'ADMIN', 'VIEWER']
};
