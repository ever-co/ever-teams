/** The platform's Jira Cloud integration (`/integration/jira`), as its routes answer. */

export interface IJiraConnectionSummary {
	id: string;
	organizationId: string;
	/** The Jira Cloud site the connection works with; null until one is chosen (the token reaches several). */
	cloudId: string | null;
	siteUrl: string | null;
	siteName: string | null;
	/** The Atlassian account the token is. */
	accountId: string | null;
	accountName: string | null;
	/** Whether a site must still be chosen before anything else works. */
	siteRequired: boolean;
	/** The connection's dynamic webhook: when it expires (the platform refreshes it before), and why its last registration failed. */
	webhookExpiresAt: string | null;
	webhookError: string | null;
	connectedByUserId: string | null;
	/** Why the connection needs a person (`token_refused`), or null. */
	attentionReason: string | null;
	tokenExpiresAt: string | null;
	lastSyncedAt: string | null;
	createdAt: string | null;
}

export interface IJiraStatus {
	/** Whether the platform holds the OAuth app (nobody can connect otherwise). */
	configured: boolean;
	/** Whether the platform has a public address Jira can deliver webhooks to. */
	webhooks: boolean;
	/** The task status each status category becomes unless a mapping says otherwise. */
	defaultStatusMap: Record<string, string>;
	connection: IJiraConnectionSummary | null;
}

/** A Jira Cloud site the connection's token reaches; one of them is the connection's (`selected`). */
export interface IJiraSite {
	/** The cloud id. */
	id: string;
	url: string;
	name: string;
	scopes?: string[];
	avatarUrl?: string | null;
	selected: boolean;
}

export interface IJiraProject {
	id: string;
	key: string;
	name: string;
	projectTypeKey?: string | null;
	style?: string | null;
}

export interface IJiraIssueType {
	id: string;
	name: string;
	subtask: boolean;
	hierarchyLevel?: number | null;
}

/** The three status categories every Jira status belongs to. */
export type TJiraStatusCategory = 'new' | 'indeterminate' | 'done';

export const JIRA_STATUS_CATEGORIES: readonly TJiraStatusCategory[] = ['new', 'indeterminate', 'done'];

export interface IJiraStatusDefinition {
	id: string;
	name: string;
	statusCategory: { key: TJiraStatusCategory | string; name?: string };
}

/** A Jira project with its issue types and the statuses its workflows use (`GET …/projects/:projectId`). */
export interface IJiraProjectDetail {
	project: IJiraProject;
	issueTypes: IJiraIssueType[];
	statuses: IJiraStatusDefinition[];
}

export type TJiraDirection = 'inbound' | 'outbound' | 'both';

export const JIRA_DIRECTIONS: readonly TJiraDirection[] = ['inbound', 'outbound', 'both'];

export interface IJiraMapping {
	id: string;
	integrationId: string;
	jiraProjectId: string;
	jiraProjectKey: string | null;
	jiraProjectName: string | null;
	projectId: string;
	direction: TJiraDirection;
	/**
	 * Status category (`new`, `indeterminate`, `done`) or `status:<id>` → task status name. The platform answers the
	 * categories filled with its defaults; a `status:<id>` entry wins over its status's category.
	 */
	statusMap: Record<string, string>;
	/** The issue types imported (ids); empty for every type. */
	issueTypeIds: string[];
	syncEnabled: boolean;
	lastImportedAt: string | null;
	lastCursor: string | null;
	lastError: string | null;
}

export interface IJiraMappingInput {
	jiraProjectId: string;
	jiraProjectKey?: string | null;
	jiraProjectName?: string | null;
	projectId: string;
	direction?: TJiraDirection;
	statusMap?: Record<string, string> | null;
	issueTypeIds?: string[] | null;
	syncEnabled?: boolean;
}

export type TJiraRunKind = 'import' | 'webhook';
export type TJiraRunStatus = 'running' | 'done' | 'failed';

/** An issue a run could not apply, by its key, and why. */
export interface IJiraRunFailure {
	key: string;
	error: string;
}

/** What a run reports beside its counts (written as it goes). */
export interface IJiraRunReport {
	startedFrom: string | null;
	stoppedAt: string | null;
	/** Whether every page was read (a run stopped early continues from `stoppedAt` next time). */
	complete: boolean;
	pages: number;
	issuesRead: number;
	comments: number;
	links: number;
	relations: number;
	conflicts: number;
	failures: IJiraRunFailure[];
	/** How many failed issues the report does not name. */
	moreFailures: number;
}

export interface IJiraRun {
	id: string;
	mappingId: string | null;
	kind: TJiraRunKind;
	status: TJiraRunStatus;
	full: boolean;
	startedAt: string | null;
	finishedAt: string | null;
	createdCount: number;
	updatedCount: number;
	skippedCount: number;
	failedCount: number;
	lastError: string | null;
	report?: IJiraRunReport | null;
	/** How many sync conflicts the run found (the runs list says it; a run just started has none yet). */
	conflictCount?: number;
}

/** What `POST …/:id/webhook` did with the connection's webhook. */
export type TJiraWebhookOutcome = 'off' | 'unchanged' | 'registered' | 'refreshed' | 'removed' | 'failed';

/** The errors the platform's callback may send the person back with (`?error=`). */
export const JIRA_CALLBACK_ERRORS = [
	'not_configured',
	'denied',
	'invalid_state',
	'exchange_failed',
	'site_unreadable',
	'no_site',
	'site_mismatch',
	'not_saved'
] as const;
export type TJiraCallbackError = (typeof JIRA_CALLBACK_ERRORS)[number];
