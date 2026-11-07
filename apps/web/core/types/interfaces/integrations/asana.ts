/** The platform's Asana integration (`/integration/asana`), as its routes answer. */

export interface IAsanaConnectionSummary {
	id: string;
	organizationId: string;
	asanaUserGid: string | null;
	asanaUserName: string | null;
	asanaUserEmail: string | null;
	connectedByUserId: string | null;
	/** Why the connection needs a person (`token_refused`), or null. */
	attentionReason: string | null;
	tokenExpiresAt: string | null;
	lastSyncedAt: string | null;
	createdAt: string | null;
}

export interface IAsanaStatus {
	/** Whether the platform holds the OAuth application (nobody can connect otherwise). */
	configured: boolean;
	/** Whether the platform has a public address Asana can deliver webhooks to. */
	webhooks: boolean;
	connection: IAsanaConnectionSummary | null;
}

export interface IAsanaWorkspace {
	gid: string;
	name: string;
}

export interface IAsanaMetadata {
	user: { gid: string; name: string; email: string | null };
	workspaces: IAsanaWorkspace[];
}

export interface IAsanaProject {
	gid: string;
	name: string;
	archived: boolean;
}

export interface IAsanaSection {
	gid: string;
	name: string;
}

export type TAsanaDirection = 'inbound' | 'outbound' | 'both';

export const ASANA_DIRECTIONS: readonly TAsanaDirection[] = ['inbound', 'outbound', 'both'];

export interface IAsanaMapping {
	id: string;
	integrationId: string;
	asanaWorkspaceGid: string;
	asanaProjectGid: string;
	asanaProjectName: string | null;
	projectId: string;
	direction: TAsanaDirection;
	/** Section gid → task status name (a section left out gives its name when that is a status, else open). */
	sectionMap: Record<string, string>;
	syncEnabled: boolean;
	hasWebhook: boolean;
	lastImportedAt: string | null;
	lastCursor: string | null;
	lastError: string | null;
}

export interface IAsanaMappingInput {
	asanaWorkspaceGid: string;
	asanaProjectGid: string;
	asanaProjectName?: string | null;
	projectId: string;
	direction?: TAsanaDirection;
	sectionMap?: Record<string, string> | null;
	syncEnabled?: boolean;
}

export type TAsanaRunKind = 'import' | 'webhook';
export type TAsanaRunStatus = 'running' | 'done' | 'failed';

export interface IAsanaRun {
	id: string;
	mappingId: string | null;
	kind: TAsanaRunKind;
	status: TAsanaRunStatus;
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
export const ASANA_CALLBACK_ERRORS = ['not_configured', 'denied', 'invalid_state', 'exchange_failed', 'user_unreadable', 'not_saved'] as const;
export type TAsanaCallbackError = (typeof ASANA_CALLBACK_ERRORS)[number];
