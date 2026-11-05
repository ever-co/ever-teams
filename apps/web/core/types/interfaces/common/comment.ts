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
