/** The platform's Trello integration (`/integration/trello`), as its routes answer. */

export interface ITrelloConnectionSummary {
	id: string;
	organizationId: string;
	trelloMemberId: string | null;
	trelloMemberUsername: string | null;
	trelloMemberName: string | null;
	connectedByUserId: string | null;
	/** Why the connection needs a person (`token_refused`), or null. */
	attentionReason: string | null;
	lastSyncedAt: string | null;
	createdAt: string | null;
}

export interface ITrelloStatus {
	/** Whether the platform holds the application's key and a return page (nobody can connect otherwise). */
	configured: boolean;
	/** Whether the platform has a public address and the application's secret, so Trello's webhooks can be taken. */
	webhooks: boolean;
	connection: ITrelloConnectionSummary | null;
}

export interface ITrelloBoard {
	id: string;
	name: string;
	closed: boolean;
	idOrganization: string | null;
	url: string | null;
}

export interface ITrelloMetadata {
	member: { id: string; username: string; fullName: string };
	boards: ITrelloBoard[];
}

export interface ITrelloList {
	id: string;
	name: string;
	closed: boolean;
	pos: number;
}

export type TTrelloDirection = 'inbound' | 'outbound' | 'both';

export const TRELLO_DIRECTIONS: readonly TTrelloDirection[] = ['inbound', 'outbound', 'both'];

export interface ITrelloMapping {
	id: string;
	integrationId: string;
	trelloBoardId: string;
	trelloBoardName: string | null;
	projectId: string;
	direction: TTrelloDirection;
	/** List id → task status name (a list left out gives its name when that is a status, else open). */
	listMap: Record<string, string>;
	syncEnabled: boolean;
	hasWebhook: boolean;
	lastImportedAt: string | null;
	lastCursor: string | null;
	lastError: string | null;
}

export interface ITrelloMappingInput {
	trelloBoardId: string;
	trelloBoardName?: string | null;
	projectId: string;
	direction?: TTrelloDirection;
	listMap?: Record<string, string> | null;
	syncEnabled?: boolean;
}

export type TTrelloRunKind = 'import' | 'webhook';
export type TTrelloRunStatus = 'running' | 'done' | 'failed';

export interface ITrelloRun {
	id: string;
	mappingId: string | null;
	kind: TTrelloRunKind;
	status: TTrelloRunStatus;
	full: boolean;
	startedAt: string | null;
	finishedAt: string | null;
	createdCount: number;
	updatedCount: number;
	skippedCount: number;
	failedCount: number;
	lastError: string | null;
	/** How many sync conflicts the run found (the runs list says it; a run just started has none yet). */
	conflictCount?: number;
}
