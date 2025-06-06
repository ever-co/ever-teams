import { IBasePerTenantAndOrganizationEntityModel, ID } from '../../common/base-interfaces';
import { ITimeSlot } from './time-slot';

export interface ITimeSlotMinute extends IBasePerTenantAndOrganizationEntityModel {
	timeSlot?: ITimeSlot;
	timeSlotId?: ID;
	keyboard?: number;
	mouse?: number;
	datetime?: Date;
}
