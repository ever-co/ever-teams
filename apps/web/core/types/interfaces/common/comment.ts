import { EBaseEntityEnum } from '../../generics/enums/entity';
import { ID } from './base-interfaces';
import { IAuthoredRecord, IEntityRecordScope } from './entity-record';

export interface IComment extends IAuthoredRecord {
	id: ID;
	comment: string;
	entity: EBaseEntityEnum;
	entityId: ID;
	parentId?: ID | null;
	employeeId?: ID | null;
	createdByUserId?: ID | null;
	tenantId?: ID | null;
	organizationId?: ID | null;
	createdAt: string;
	updatedAt?: string | null;
	/** Stamped by the platform when the text changes (ever-gauzy #11802); absent on a comment never edited. */
	editedAt?: string | null;
	/** A thread its author closed; it stays readable. */
	resolved?: boolean | null;
	resolvedAt?: string | null;
	resolvedByEmployeeId?: ID | null;
	resolvedByEmployee?: IAuthoredRecord['employee'];
}

/** An edit of a comment's text: the mentions it now holds replace the ones it had; left out, they stay as stored. */
export interface ICommentTextUpdate {
	comment: string;
	mentionEmployeeIds?: ID[];
}

/** A resolve or a reopen of a comment thread: the platform records the caller as the resolver. */
export interface ICommentResolveUpdate {
	resolved: boolean;
	resolvedAt: string | null;
	resolvedByEmployeeId: ID | null;
}

/** The keys Gauzy's `CreateCommentDTO` declares and the web sends; the author is never sent. */
export interface ICommentCreateInput extends IEntityRecordScope {
	comment: string;
	entity: EBaseEntityEnum;
	entityId: ID;
	entityName?: string;
	parentId?: ID;
	/** The employees named with `@` in the text: Gauzy notifies each of them. */
	mentionEmployeeIds?: ID[];
}

/**
 * The keys of Gauzy's `UpdateCommentDTO` the web sends. Every one is its author's to change (Gauzy matches the
 * comment on the caller's employee), `resolved` included. An omitted `mentionEmployeeIds` keeps the mentions.
 */
export interface ICommentUpdateInput {
	comment?: string;
	resolved?: boolean;
	/** Cleared with `null` on a reopen: Gauzy does not derive it. */
	resolvedAt?: string | null;
	mentionEmployeeIds?: ID[];
}
