import { EBaseEntityEnum } from '../../generics/enums/entity';
import { ID } from './base-interfaces';
import { IAuthoredRecord } from './entity-record';

/** One `{ [field]: value }` entry of `previousValues` / `updatedValues`. */
export type IActivityLogUpdatedValues = Record<string, unknown>;

export interface IActivityLog extends IAuthoredRecord {
	id: ID;
	entity: EBaseEntityEnum;
	entityId: ID;
	action: string;
	actorType?: string | number | null;
	description?: string | null;
	updatedFields?: string[] | null;
	previousValues?: IActivityLogUpdatedValues[] | null;
	updatedValues?: IActivityLogUpdatedValues[] | null;
	employeeId?: ID | null;
	tenantId?: ID | null;
	organizationId?: ID | null;
	createdAt: string;
}
