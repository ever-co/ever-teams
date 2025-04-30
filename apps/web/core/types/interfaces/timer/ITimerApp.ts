import { IEmployee } from '../IEmployee';

export interface ITimerApps {
	time: string;
	sessions?: number;
	duration?: number;
	employeeId?: string;
	date?: string;
	title?: string;
	description?: string;
	durationPercentage?: number;
	childItems?: ITimerApps[];
}

export interface IDetailTimerSite {
	id: string;
	createdAt: Date | string;
	updatedAt: Date | string;
	deletedAt: string;
	isActive: boolean;
	isArchived: boolean;
	tenantId: string;
	organizationId: string;
	title: string;
	description: string;
	metaData: object;
	date: string;
	time: string;
	duration: string;
	type: string;
	source: string;
	recordedAt: Date | null;
	employeeId: string;
	projectId: string;
	timeSlotId: string;
	taskId: string;
	employee: IEmployee;
}
