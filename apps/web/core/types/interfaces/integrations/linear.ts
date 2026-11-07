/** The platform's Linear integration (`/integration/linear`), as its routes answer. */

export interface ILinearConnectionSummary {
	id: string;
	organizationId: string;
	linearOrganizationId: string | null;
	linearOrganizationName: string | null;
	linearOrganizationUrlKey: string | null;
	connectedByUserId: string | null;
	/** Why the connection needs a person (`token_refused`), or null. */
	attentionReason: string | null;
	tokenExpiresAt: string | null;
	lastSyncedAt: string | null;
	createdAt: string | null;
}

export interface ILinearStatus {
	/** Whether the platform holds the OAuth application (nobody can connect otherwise). */
	configured: boolean;
	/** The task status each kind of Linear state becomes unless a mapping says otherwise. */
	defaultStateMap: Record<string, string>;
	connection: ILinearConnectionSummary | null;
}

export interface ILinearTeam {
	id: string;
	key: string;
	name: string;
}

export interface ILinearWorkflowState {
	id: string;
	name: string;
	type: string;
	position: number;
}

export interface ILinearTeamDetail {
	team: ILinearTeam;
	states: ILinearWorkflowState[];
	labels: Array<{ id: string; name: string; color: string | null }>;
}

export type TLinearDirection = 'inbound' | 'outbound' | 'both';

export const LINEAR_DIRECTIONS: readonly TLinearDirection[] = ['inbound', 'outbound', 'both'];

/** The kinds of Linear workflow state, in the order the state map lists them. */
export const LINEAR_STATE_KINDS = ['triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled'] as const;
export type TLinearStateKind = (typeof LINEAR_STATE_KINDS)[number];

export interface ILinearMapping {
	id: string;
	integrationId: string;
	linearTeamId: string;
	linearTeamKey: string | null;
	linearTeamName: string | null;
	projectId: string;
	direction: TLinearDirection;
	stateMap: Record<string, string>;
	syncEnabled: boolean;
	lastImportedAt: string | null;
	lastCursor: string | null;
	lastError: string | null;
}

export interface ILinearMappingInput {
	linearTeamId: string;
	linearTeamKey?: string | null;
	linearTeamName?: string | null;
	projectId: string;
	direction?: TLinearDirection;
	stateMap?: Record<string, string> | null;
	syncEnabled?: boolean;
}

export type TLinearRunKind = 'import' | 'webhook';
export type TLinearRunStatus = 'running' | 'done' | 'failed';

export interface ILinearRun {
	id: string;
	mappingId: string | null;
	kind: TLinearRunKind;
	status: TLinearRunStatus;
	full: boolean;
	startedAt: string | null;
	finishedAt: string | null;
	createdCount: number;
	updatedCount: number;
	skippedCount: number;
	failedCount: number;
	lastError: string | null;
}

/** The errors the platform's callback may send the person back with (`?error=`). */
export const LINEAR_CALLBACK_ERRORS = ['not_configured', 'denied', 'invalid_state', 'exchange_failed', 'workspace_unreadable', 'not_saved'] as const;
export type TLinearCallbackError = (typeof LINEAR_CALLBACK_ERRORS)[number];
