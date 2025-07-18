/**
 * Centralize all query keys used by Tanstack Query.
 * Each key is defined once for better consistency.
 */
export const queryKeys = {
	// Keys related to authentication and users
	auth: {
		all: ['auth'] as const,
		workspaces: (userId: string | undefined | null) => ['auth', 'workspaces', ...(userId ? [userId] : [])] as const,
		currentWorkspace: (userId: string | undefined | null) =>
			['auth', 'current-workspace', ...(userId ? [userId] : [])] as const,
		switchWorkspace: (workspaceId: string | undefined | null, userId: string | undefined | null) =>
			['auth', 'switch-workspace', ...(workspaceId ? [workspaceId] : []), ...(userId ? [userId] : [])] as const
	},
	// Keys related to users
	users: {
		auth: {
			all: ['auth'] as const,
			signIn: ['auth', 'sign-in'] as const,
			signUp: ['auth', 'sign-up'] as const,
			signOut: ['auth', 'sign-out'] as const,
			refreshToken: ['auth', 'refresh-token'] as const,
			verifyEmail: ['auth', 'verify-email'] as const,
			resetPassword: ['auth', 'reset-password'] as const
		},
		emailReset: {
			all: ['users', 'email-reset'] as const,
			request: (email: string | undefined | null) =>
				['users', 'email-reset', 'request', ...(email ? [email] : [])] as const,
			verify: (code: string | undefined | null) =>
				['users', 'email-reset', 'verify', ...(code ? [code] : [])] as const
		},
		operations: {
			all: ['users', 'operations'] as const,
			delete: (userId: string | undefined | null) =>
				['users', 'operations', 'delete', ...(userId ? [userId] : [])] as const,
			reset: ['users', 'operations', 'reset'] as const
		},
		settings: {
			all: ['users', 'settings'] as const,
			updateAvatar: (userId: string | undefined | null) =>
				['users', 'settings', 'update-avatar', ...(userId ? [userId] : [])] as const,
			refreshUser: ['users', 'settings', 'refresh-user'] as const
		},
		me: ['users', 'me'] as const,
		all: ['users'] as const,
		userProfile: (userId: string | undefined | null) => ['profile', ...(userId ? [userId] : [])] as const,
		// Employee-related keys under users
		employees: {
			all: ['users', 'employees'] as const,
			working: (tenantId: string | undefined | null, organizationId: string | undefined | null) =>
				[
					'users',
					'employees',
					'working',
					...(tenantId ? [tenantId] : []),
					...(organizationId ? [organizationId] : [])
				] as const,
			detail: (employeeId: string | undefined | null) =>
				['users', 'employees', ...(employeeId ? [employeeId] : [])] as const,
			operations: {
				all: ['users', 'employees', 'operations'] as const,
				update: (employeeId: string | undefined | null) =>
					['users', 'employees', 'operations', 'update', ...(employeeId ? [employeeId] : [])] as const
			}
		},
		// Invitation-related keys under users
		invitations: {
			all: ['users', 'invitations'] as const,
			team: (
				tenantId: string | undefined | null,
				organizationId: string | undefined | null,
				teamId: string | undefined | null
			) =>
				[
					'users',
					'invitations',
					'team',
					...(tenantId ? [tenantId] : []),
					...(organizationId ? [organizationId] : []),
					...(teamId ? [teamId] : [])
				] as const,
			my: (tenantId: string | undefined | null) =>
				['users', 'invitations', 'my', ...(tenantId ? [tenantId] : [])] as const,
			operations: {
				all: ['users', 'invitations', 'operations'] as const,
				invite: (teamId: string | undefined | null) =>
					['users', 'invitations', 'operations', 'invite', ...(teamId ? [teamId] : [])] as const,
				remove: (invitationId: string | undefined | null) =>
					['users', 'invitations', 'operations', 'remove', ...(invitationId ? [invitationId] : [])] as const,
				resend: (invitationId: string | undefined | null) =>
					['users', 'invitations', 'operations', 'resend', ...(invitationId ? [invitationId] : [])] as const,
				acceptReject: (invitationId: string | undefined | null) =>
					[
						'users',
						'invitations',
						'operations',
						'acceptReject',
						...(invitationId ? [invitationId] : [])
					] as const
			}
		}
	},
	roles: {
		all: ['roles'] as const,
		detail: (roleId: string | undefined | null) => ['roles', ...(roleId ? [roleId] : [])] as const,
		permissions: (roleId: string | undefined | null) =>
			['roles', ...(roleId ? [roleId] : []), 'permissions'] as const,
		users: (roleId: string | undefined | null) => ['roles', ...(roleId ? [roleId] : []), 'users'] as const
	},
	permissions: {
		all: ['permissions'] as const,
		detail: (permissionId: string | undefined | null) =>
			['permissions', ...(permissionId ? [permissionId] : [])] as const
	},
	organizations: {
		all: ['organizations'] as const,
		detail: (organizationId: string | undefined | null) =>
			['organizations', ...(organizationId ? [organizationId] : [])] as const
	},
	teams: {
		all: ['teams'] as const,
		detail: (teamId: string | undefined | null) => ['teams', ...(teamId ? [teamId] : [])] as const,

		// Public teams keys
		public: {
			all: ['teams', 'public'] as const,
			byProfileAndTeam: (profileLink: string | undefined | null, teamId: string | undefined | null) =>
				[
					'teams',
					'public',
					'by-profile-team',
					...(profileLink ? [profileLink] : []),
					...(teamId ? [teamId] : [])
				] as const,
			miscData: (profileLink: string | undefined | null, teamId: string | undefined | null) =>
				[
					'teams',
					'public',
					'misc-data',
					...(profileLink ? [profileLink] : []),
					...(teamId ? [teamId] : [])
				] as const
		}
	},

	// Keys related to Daily Plans
	dailyPlans: {
		// Standard daily plans keys (preserved for backward compatibility)
		all: ['daily-plans'] as const,
		myPlans: (teamId: string | undefined | null) =>
			['daily-plans', 'my-plans', ...(teamId ? [teamId] : [])] as const,
		detail: (planId: string | undefined | null) => ['daily-plans', ...(planId ? [planId] : [])] as const,
		tasks: (planId: string | undefined | null) => ['daily-plans', ...(planId ? [planId] : []), 'tasks'] as const,
		allPlans: (teamId: string | undefined | null) =>
			['daily-plans', 'all-plans', ...(teamId ? [teamId] : [])] as const,
		byEmployee: (employeeId: string | undefined | null, teamId: string | undefined | null) =>
			['daily-plans', 'by-employee', ...(employeeId ? [employeeId] : []), ...(teamId ? [teamId] : [])] as const,
		byTask: (taskId: string | undefined | null) => ['daily-plans', 'by-task', ...(taskId ? [taskId] : [])] as const
	},

	// Keys related to teams (organization-team)
	organizationTeams: {
		// Standard organization teams keys (preserved for backward compatibility)
		all: ['organization-teams'] as const,
		paginated: (params: Record<string, string>) => ['organization-teams', 'paginated', params] as const,
		detail: (teamId: string | undefined | null) => ['organization-teams', ...(teamId ? [teamId] : [])] as const,
		members: (teamId: string | undefined | null) =>
			['organization-teams', ...(teamId ? [teamId] : []), 'members'] as const,
		joinRequests: (teamId: string | undefined | null) =>
			['organization-teams', ...(teamId ? [teamId] : []), 'join-requests'] as const,

		// ✅ Mutation keys for team operations
		mutations: {
			create: (params: any | undefined | null) =>
				['organization-teams', 'mutations', 'create', ...(params ? [params] : [])] as const,
			update: (teamId: string | undefined | null) =>
				['organization-teams', 'mutations', 'update', ...(teamId ? [teamId] : [])] as const,
			edit: (teamId: string | undefined | null) =>
				['organization-teams', 'mutations', 'edit', ...(teamId ? [teamId] : [])] as const,
			delete: (teamId: string | undefined | null) =>
				['organization-teams', 'mutations', 'delete', ...(teamId ? [teamId] : [])] as const,
			removeUser: (userId: string | undefined | null) =>
				['organization-teams', 'mutations', 'remove-user', ...(userId ? [userId] : [])] as const,
			// ✅ New keys for employee operations
			employee: {
				all: ['organization-teams', 'mutations', 'employee'] as const,
				delete: (employeeId: string | undefined | null) =>
					[
						'organization-teams',
						'mutations',
						'employee',
						'delete',
						...(employeeId ? [employeeId] : [])
					] as const,
				update: (employeeId: string | undefined | null) =>
					[
						'organization-teams',
						'mutations',
						'employee',
						'update',
						...(employeeId ? [employeeId] : [])
					] as const,
				updateOrder: (employeeId: string | undefined | null) =>
					[
						'organization-teams',
						'mutations',
						'employee',
						'update-order',
						...(employeeId ? [employeeId] : [])
					] as const,
				updateActiveTask: (employeeId: string | undefined | null) =>
					[
						'organization-teams',
						'mutations',
						'employee',
						'update-active-task',
						...(employeeId ? [employeeId] : [])
					] as const
			}
		},

		// ✅ Request to join operations (consolidated from separate 'team' namespace)
		requestToJoin: {
			all: ['organization-teams', 'request-to-join'] as const,
			list: () => ['organization-teams', 'request-to-join', 'list'] as const,
			mutations: {
				request: ['organization-teams', 'request-to-join', 'request'] as const,
				validate: ['organization-teams', 'request-to-join', 'validate'] as const,
				resendCode: ['organization-teams', 'request-to-join', 'resend-code'] as const,
				acceptReject: ['organization-teams', 'request-to-join', 'accept-reject'] as const
			}
		}
	},

	tags: {
		all: ['tags'] as const
	},

	// Keys related to tasks
	tasks: {
		// Standard task keys (preserved for backward compatibility)
		all: ['tasks'] as const,
		detail: (taskId: string | undefined | null) => ['tasks', ...(taskId ? [taskId] : [])] as const,
		byEmployee: (employeeId: string | undefined | null, teamId: string | undefined | null) =>
			['tasks', 'by-employee', ...(employeeId ? [employeeId] : []), ...(teamId ? [teamId] : [])] as const,
		byTeam: (teamId: string | undefined | null) => ['tasks', 'by-team', ...(teamId ? [teamId] : [])] as const,
		byTeamAndProject: (teamId: string | undefined | null, projectId: string | undefined | null) =>
			['tasks', 'by-team', ...(teamId ? [teamId] : []), 'project', ...(projectId ? [projectId] : [])] as const,
		statistics: (teamId?: string | undefined | null) =>
			['tasks', 'statistics', ...(teamId ? [teamId] : [])] as const,
		activity: (taskId: string | undefined | null) => ['tasks', ...(taskId ? [taskId] : []), 'activity'] as const,
		linked: (taskId: string | undefined | null) => ['tasks', ...(taskId ? [taskId] : []), 'linked'] as const
	},

	// Keys related to activities
	activities: {
		all: ['activities'] as const,
		byTask: (
			taskId: string | undefined | null,
			tenantId: string | undefined | null,
			organizationId: string | undefined | null,
			defaultRange?: string | undefined | null,
			unitOfTime?: string | undefined | null
		) =>
			[
				'activities',
				'by-task',
				...(taskId ? [taskId] : []),
				...(tenantId ? [tenantId] : []),
				...(organizationId ? [organizationId] : []),
				...(defaultRange ? [defaultRange] : []),
				...(unitOfTime ? [unitOfTime] : [])
			] as const,
		dailyChart: (params: Record<string, any>) => ['activities', 'daily-activity-report-chart', params] as const,
		daily: (params: Record<string, any>) => ['activities', 'daily-activity-report', params] as const,
		statisticsCounts: (params: Record<string, any>) => ['activities', 'statistics-counts', params] as const,
		activityReport: (params: Record<string, any>) => ['activities', 'activity-report', params] as const
	},

	// Keys related to task statuses
	taskStatuses: {
		all: ['task-statuses'] as const,
		byTeam: (teamId: string | undefined | null) =>
			['task-statuses', 'by-team', ...(teamId ? [teamId] : [])] as const,
		detail: (statusId: string | undefined | null) => ['task-statuses', ...(statusId ? [statusId] : [])] as const
	},

	// Keys related to task priorities
	taskPriorities: {
		all: ['task-priorities'] as const,
		byTeam: (teamId: string | undefined | null) =>
			['task-priorities', 'by-team', ...(teamId ? [teamId] : [])] as const,
		detail: (priorityId: string | undefined | null) =>
			['task-priorities', ...(priorityId ? [priorityId] : [])] as const
	},

	// Keys related to task sizes
	taskSizes: {
		all: ['task-sizes'] as const,
		byTeam: (teamId: string | undefined | null) => ['task-sizes', 'by-team', ...(teamId ? [teamId] : [])] as const,
		detail: (sizeId: string | undefined | null) => ['task-sizes', ...(sizeId ? [sizeId] : [])] as const
	},

	// Keys related to task labels (tags)
	taskLabels: {
		all: ['task-labels'] as const,
		byTeam: (teamId: string | undefined | null) => ['task-labels', 'by-team', ...(teamId ? [teamId] : [])] as const,
		detail: (labelId: string | undefined | null) => ['task-labels', ...(labelId ? [labelId] : [])] as const
	},

	// Keys related to issue types
	issueTypes: {
		all: ['issue-types'] as const,
		byTeam: (teamId: string | undefined | null) => ['issue-types', 'by-team', ...(teamId ? [teamId] : [])] as const,
		detail: (issueTypeId: string | undefined | null) =>
			['issue-types', ...(issueTypeId ? [issueTypeId] : [])] as const
	},

	// Keys related to task versions
	taskVersions: {
		all: ['task-versions'] as const,
		byTeam: (teamId: string | undefined | null) =>
			['task-versions', 'by-team', ...(teamId ? [teamId] : [])] as const,
		detail: (versionId: string | undefined | null) => ['task-versions', ...(versionId ? [versionId] : [])] as const
	},

	// Keys related to task related issue types
	taskRelatedIssueTypes: {
		all: ['task-related-issue-types'] as const,
		byTeam: (teamId: string | undefined | null) =>
			['task-related-issue-types', 'by-team', ...(teamId ? [teamId] : [])] as const,
		detail: (relatedIssueTypeId: string | undefined | null) =>
			['task-related-issue-types', ...(relatedIssueTypeId ? [relatedIssueTypeId] : [])] as const
	},

	// Keys related to projects
	projects: {
		all: ['projects'] as const,
		detail: (projectId: string | undefined | null) => ['projects', ...(projectId ? [projectId] : [])] as const
	},

	// Keys related to organization projects
	organizationProjects: {
		all: ['organization-projects'] as const,
		detail: (projectId: string | undefined | null) =>
			['organization-projects', ...(projectId ? [projectId] : [])] as const,
		byOrganization: (organizationId: string | undefined | null, tenantId: string | undefined | null) =>
			[
				'organization-projects',
				'by-organization',
				...(organizationId ? [organizationId] : []),
				...(tenantId ? [tenantId] : [])
			] as const,
		withQueries: (queries: Record<string, string> | undefined | null) =>
			['organization-projects', 'with-queries', ...(queries ? [queries] : [])] as const
	},

	// Keys related to the Timesheet / Timer
	timesheet: {
		all: ['timesheet'] as const,
		dailyReport: (date: string | null | undefined) =>
			['timesheet', 'daily-report', ...(date ? [date] : [])] as const,
		timerLogsDailyReport: (
			tenantId: string | null | undefined,
			organizationId: string | null | undefined,
			employeeIds: string[] | null | undefined,
			startDate: string | null | undefined,
			endDate: string | null | undefined
		) =>
			[
				'timesheet',
				'timer-logs-daily-report',
				...(tenantId ? [tenantId] : []),
				...(organizationId ? [organizationId] : []),
				...(employeeIds && employeeIds.length ? [employeeIds.join(',')] : []),
				...(startDate ? [startDate] : []),
				...(endDate ? [endDate] : [])
			] as const,
		timeLog: (logId: string | null | undefined) => ['timesheet', 'time-log', ...(logId ? [logId] : [])] as const,
		logs: (
			tenantId: string | null | undefined,
			organizationId: string | null | undefined,
			startDate: string | null | undefined,
			endDate: string | null | undefined,
			employeeIds?: string[] | null | undefined,
			projectIds?: string[] | null | undefined,
			taskIds?: string[] | null | undefined,
			status?: string[] | null | undefined
		) =>
			[
				'timesheet',
				'logs',
				...(tenantId ? [tenantId] : []),
				...(organizationId ? [organizationId] : []),
				...(startDate ? [startDate] : []),
				...(endDate ? [endDate] : []),
				...(employeeIds && employeeIds.length ? [employeeIds.join(',')] : []),
				...(projectIds && projectIds.length ? [projectIds.join(',')] : []),
				...(taskIds && taskIds.length ? [taskIds.join(',')] : []),
				...(status && status.length ? [status.join(',')] : [])
			] as const
	},

	// Keys related to Timer activities and limits
	timer: {
		timer: ['timer'] as const,
		timeLimits: {
			all: ['timer', 'time-limits'] as const,
			byParams: (params: Record<string, any> | null) =>
				['timer', 'time-limits', 'by-params', ...(params ? [params] : [])] as const
		},
		timeLogs: {
			all: ['timer', 'time-logs'] as const,
			byEmployee: (employeeId: string | undefined | null) =>
				['timer', 'time-logs', 'by-employee', ...(employeeId ? [employeeId] : [])] as const,
			byParams: (params: Record<string, any> | null) =>
				['timer', 'time-logs', 'by-params', ...(params ? [params] : [])] as const
		},
		timeSlots: {
			all: ['timer', 'time-slots'] as const,
			byParams: (params: Record<string, any> | null) =>
				['timer', 'time-slots', 'by-params', ...(params ? [params] : [])] as const,
			operations: {
				all: ['timer', 'time-slots', 'operations'] as const,
				delete: (ids: string[] | undefined | null) =>
					['timer', 'time-slots', 'operations', 'delete', ...(ids ? [ids.join(',')] : [])] as const
			}
		}
	},

	// Keys related to languages
	languages: {
		all: ['languages'] as const,
		system: (isSystem: boolean) => ['languages', 'system', isSystem] as const,
		byCode: (code: string | undefined | null) => ['languages', 'by-code', ...(code ? [code] : [])] as const
	},

	// Keys related to currencies
	currencies: {
		all: ['currencies'] as const,
		byOrganization: (tenantId: string | undefined | null, organizationId: string | undefined | null) =>
			[
				'currencies',
				'organization',
				...(tenantId ? [tenantId] : []),
				...(organizationId ? [organizationId] : [])
			] as const
	},

	// Keys related to integration
	integrations: {
		all: ['integrations'] as const,
		types: (tenantId: string | undefined | null) =>
			['integrations', 'types', ...(tenantId ? [tenantId] : [])] as const,
		byTenant: (tenantId: string | undefined | null) =>
			['integrations', 'tenant', ...(tenantId ? [tenantId] : [])] as const,
		byTypeAndQuery: (integrationTypeId: string | undefined | null, searchQuery: string | undefined | null) =>
			[
				'integrations',
				'by-type-query',
				...(integrationTypeId ? [integrationTypeId] : []),
				...(searchQuery ? [searchQuery] : [])
			] as const,
		tenantByName: (
			tenantId: string | undefined | null,
			organizationId: string | undefined | null,
			name: string | undefined | null
		) =>
			[
				'integrations',
				'tenant-by-name',
				...(tenantId ? [tenantId] : []),
				...(organizationId ? [organizationId] : []),
				...(name ? [name] : [])
			] as const,
		github: {
			all: ['integrations', 'github'] as const,
			metadata: (
				tenantId: string | undefined | null,
				organizationId: string | undefined | null,
				integrationId: string | undefined | null
			) =>
				[
					'integrations',
					'github',
					'metadata',
					...(tenantId ? [tenantId] : []),
					...(organizationId ? [organizationId] : []),
					...(integrationId ? [integrationId] : [])
				] as const,
			repositories: (
				tenantId: string | undefined | null,
				organizationId: string | undefined | null,
				integrationId: string | undefined | null
			) =>
				[
					'integrations',
					'github',
					'repositories',
					...(tenantId ? [tenantId] : []),
					...(organizationId ? [organizationId] : []),
					...(integrationId ? [integrationId] : [])
				] as const
		}
	},

	// Keys related to API health check
	apiCheck: {
		all: ['api-check'] as const,
		health: ['api-check', 'health'] as const
	},

	// Keys related to email verification
	emailVerification: {
		all: ['email-verification'] as const,
		verifyToken: (email: string | undefined | null, token: string | undefined | null) =>
			['email-verification', 'verify-token', ...(email ? [email] : []), ...(token ? [token] : [])] as const
	},

	// Keys related to favorites
	favorites: {
		all: ['favorites'] as const,
		byEmployee: (employeeId: string | undefined | null) =>
			['favorites', 'by-employee', ...(employeeId ? [employeeId] : [])] as const,
		detail: (favoriteId: string | undefined | null) => ['favorites', ...(favoriteId ? [favoriteId] : [])] as const
	},

	board: {
		liveCollaboration: ['live-collaboration'] as const
	}
};
