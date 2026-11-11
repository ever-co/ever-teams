/**
 * The sync conflicts of the platform's task integrations (Linear, Asana, Trello: `GET /integration/<provider>/:id/conflicts`
 * and `POST …/conflicts/:conflictId/resolve`). A synced task field changed both in the provider and on the platform to
 * different values since they last agreed: the provider's value was applied to the task, and the task's is kept in
 * the conflict, for a manager to accept or restore.
 */

/** The providers whose connections record conflicts. */
export type TIntegrationConflictProvider = 'linear' | 'asana' | 'trello';

/** The synced task fields a conflict can name, in the order the platform lists them. */
export const INTEGRATION_CONFLICT_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate'] as const;
export type TIntegrationConflictField = (typeof INTEGRATION_CONFLICT_FIELDS)[number];

export type TIntegrationConflictStatus = 'open' | 'resolved';

/** How a conflict ended: the provider's value stayed, the task's was written back, or a later conflict replaced it. */
export type TIntegrationConflictResolution = 'kept_external' | 'kept_platform' | 'superseded';

/** What a resolve keeps: the provider's value (already the task's), or the task's value written back. */
export type TIntegrationConflictKeep = 'external' | 'platform';

export interface IIntegrationSyncConflict {
	id: string;
	integrationId: string;
	mappingId: string | null;
	/** The run that found it. */
	runId: string | null;
	taskId: string;
	/** The provider item's id (a Linear issue, an Asana task, a Trello card). */
	sourceId: string;
	field: TIntegrationConflictField;
	/** The value both sides last agreed on. */
	syncedValue: string | null;
	/** The task's value, replaced by the provider's. */
	platformValue: string | null;
	/** The provider's value, applied to the task. */
	externalValue: string | null;
	status: TIntegrationConflictStatus;
	resolution: TIntegrationConflictResolution | null;
	resolvedAt: string | null;
	resolvedByUserId: string | null;
	createdAt: string | null;
}

/** Filters of the conflict list: open ones unless `status` says otherwise; `runId` narrows it to what one run found. */
export interface IIntegrationConflictQuery {
	status?: TIntegrationConflictStatus;
	runId?: string | null;
	take?: number;
}
