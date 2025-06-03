/**
 * Centralize all query keys used by Tanstack Query.
 * Each key is defined once for better consistency.
 */
export const queryKeys = {
	// Keys related to authentication and users
	// Keys related to users
	users: {
		auth: {
			signIn: ['auth', 'sign-in'] as const,
			signUp: ['auth', 'sign-up'] as const,
			signOut: ['auth', 'sign-out'] as const,
			refreshToken: ['auth', 'refresh-token'] as const,
			verifyEmail: ['auth', 'verify-email'] as const,
			resetPassword: ['auth', 'reset-password'] as const
		},
		me: ['users', 'me'] as const,
		all: ['users'] as const,
		userProfile: (userId: string) => ['profile', userId] as const
	},
	roles: {
		all: ['roles'] as const,
		detail: (roleId: string) => ['roles', roleId] as const,
		permissions: (roleId: string) => ['roles', roleId, 'permissions'] as const,
		users: (roleId: string) => ['roles', roleId, 'users'] as const
	},
	permissions: {
		all: ['permissions'] as const,
		detail: (permissionId: string) => ['permissions', permissionId] as const
	},
	organizations: {
		all: ['organizations'] as const,
		detail: (organizationId: string) => ['organizations', organizationId] as const
	},
	teams: {
		all: ['teams'] as const,
		detail: (teamId: string) => ['teams', teamId] as const
	},

	// Keys related to Daily Plans
	dailyPlans: {
		all: ['daily-plans'] as const,
		myPlan: (date: string) => ['daily-plans', 'my-plan', date] as const, // Key for the user's plan at a given date
		detail: (planId: string) => ['daily-plans', planId] as const,
		tasks: (planId: string) => ['daily-plans', planId, 'tasks'] as const
	},

	// Keys related to teams (organization-team)
	organizationTeams: {
		all: ['organization-teams'] as const,
		paginated: (params: Record<string, any>) => ['organization-teams', 'paginated', params] as const,
		detail: (teamId: string) => ['organization-teams', teamId] as const,
		members: (teamId: string) => ['organization-teams', teamId, 'members'] as const,
		joinRequests: (teamId: string) => ['organization-teams', teamId, 'join-requests'] as const
	},

	// Keys related to tasks
	tasks: {
		all: ['tasks'] as const,
		detail: (taskId: string) => ['tasks', taskId] as const,
		byEmployee: (employeeId: string) => ['tasks', 'by-employee', employeeId] as const,
		byTeam: (teamId: string) => ['tasks', 'by-team', teamId] as const,
		byTeamAndProject: (teamId: string, projectId: string) =>
			['tasks', 'by-team', teamId, 'project', projectId] as const,
		statistics: (teamId?: string) => ['tasks', 'statistics', teamId] as const,
		activity: (taskId: string) => ['tasks', taskId, 'activity'] as const,
		linked: (taskId: string) => ['tasks', taskId, 'linked'] as const
	},

	// Keys related to task statuses
	taskStatuses: {
		all: ['task-statuses'] as const,
		byTeam: (teamId: string) => ['task-statuses', 'by-team', teamId] as const,
		detail: (statusId: string) => ['task-statuses', statusId] as const
	},

	// Keys related to task priorities
	taskPriorities: {
		all: ['task-priorities'] as const,
		byTeam: (teamId: string) => ['task-priorities', 'by-team', teamId] as const,
		detail: (priorityId: string) => ['task-priorities', priorityId] as const
	},

	// Keys related to task sizes
	taskSizes: {
		all: ['task-sizes'] as const,
		byTeam: (teamId: string) => ['task-sizes', 'by-team', teamId] as const,
		detail: (sizeId: string) => ['task-sizes', sizeId] as const
	},

	// Keys related to task labels (tags)
	taskLabels: {
		all: ['task-labels'] as const,
		byTeam: (teamId: string) => ['task-labels', 'by-team', teamId] as const,
		detail: (labelId: string) => ['task-labels', labelId] as const
	},

	// Keys related to issue types
	issueTypes: {
		all: ['issue-types'] as const,
		byTeam: (teamId: string) => ['issue-types', 'by-team', teamId] as const,
		detail: (issueTypeId: string) => ['issue-types', issueTypeId] as const
	},

	// Keys related to task versions
	taskVersions: {
		all: ['task-versions'] as const,
		byTeam: (teamId: string) => ['task-versions', 'by-team', teamId] as const,
		detail: (versionId: string) => ['task-versions', versionId] as const
	},

	// Keys related to task related issue types
	taskRelatedIssueTypes: {
		all: ['task-related-issue-types'] as const,
		byTeam: (teamId: string) => ['task-related-issue-types', 'by-team', teamId] as const,
		detail: (relatedIssueTypeId: string) => ['task-related-issue-types', relatedIssueTypeId] as const
	},

	// Keys related to projects
	projects: {
		all: ['projects'] as const,
		detail: (projectId: string) => ['projects', projectId] as const
	},

	// Keys related to the Timesheet / Timer
	timesheet: {
		all: ['timesheet'] as const,
		dailyReport: (date: string) => ['timesheet', 'daily-report', date] as const,
		timeLog: (logId: string) => ['timesheet', 'time-log', logId] as const
	},

	// Keys related to languages
	languages: {
		all: ['languages'] as const,
		system: (isSystem: boolean) => ['languages', 'system', isSystem] as const,
		byCode: (code: string) => ['languages', 'by-code', code] as const
	}
};
