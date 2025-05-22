import { IBasePerTenantAndOrganizationEntityModel, ID } from '../base-interfaces';
import { ITimeSlot } from './ITimeSlot';

export interface ITimeSlotMinute extends IBasePerTenantAndOrganizationEntityModel {
	timeSlot?: ITimeSlot;
	timeSlotId?: ID;
	keyboard?: number;
	mouse?: number;
	datetime?: Date;
}
