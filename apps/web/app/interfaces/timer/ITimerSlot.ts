import { IEmployee } from '../IEmployee';

export interface ITimerSlot {
	id: string;
	createdAt: Date | string;
	updatedAt: Date | string;
	deletedAt: Date | null;
	isActive: boolean;
	isArchived: boolean;
	tenantId: string;
	organizationId: string;
	duration: number;
	keyboard: number;
	mouse: number;
	overall: number;
	startedAt: Date | string;
	employeeId: string;
	employee: IEmployee;
	stoppedAt: Date | string;
	percentage: number;
	keyboardPercentage: number;
	mousePercentage: number;

	screenshots: IScreenshot[];
}

export interface IScreenshot {
	organizationId: string;
	id: string;
	createdAt: Date | string;
	updatedAt: Date | string;
	deletedAt: null;
	isActive: true;
	isArchived: false;
	tenantId: string;
	file: string;
	thumb: string;
	thumbUrl: string;
	recordedAt: Date | string;
	isWorkRelated: true;
	description: string;
	timeSlotId: string;
	userId: string;
	fullUrl: string;
	apps: string[];
}

export interface ITimerSlotDataRequest {
	id: string;
	startedAt: Date | string;
	user: {
		imageUrl: string;
		name: string;
	};
	timeSlots: ITimerSlot[];
}
