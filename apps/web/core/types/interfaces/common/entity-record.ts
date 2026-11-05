import { ID } from './base-interfaces';

export interface IEntityRecordScope {
	tenantId: ID;
	organizationId: ID;
}

export interface IRecordAuthorUser {
	name?: string | null;
	imageUrl?: string | null;
}

export interface IRecordAuthorEmployee {
	fullName?: string | null;
	user?: IRecordAuthorUser | null;
}

/** The author relations Gauzy returns with `relations: employee, employee.user, createdByUser`. */
export interface IAuthoredRecord {
	employee?: IRecordAuthorEmployee | null;
	createdByUser?: IRecordAuthorUser | null;
}
