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
	/** Stamped by the platform when the text changes (ever-gauzy #11802); absent on a comment never edited. */
	editedAt?: string | null;
	resolved?: boolean | null;
	resolvedAt?: string | null;
	resolvedByEmployeeId?: ID | null;
	resolvedByEmployee?: IAuthoredRecord['employee'];
}

/** An edit of a comment's text: the mentions it now holds replace the ones it had. */
export interface ICommentTextUpdate {
	comment: string;
	mentionEmployeeIds: ID[];
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
