import { IEmployee } from '../IEmployee';
import { IOrganization } from '../IOrganization';
import { ITeamTask } from '../ITask';
import { TimeLogType, TimerSource } from '../ITimer';
import { ITimerSlot } from './ITimerSlot';

export interface ITimerLogsDailyReportRequest {
	tenantId: string;
	organizationId: string;
	employeeIds: string[];
	startDate: Date;
	endDate: Date;
}

export interface ITimerLogsDailyReport {
	activity: number;
	date: string; // '2024-07-19'
	sum: number; // in seconds
}

export interface IAddManualTimeRequest {
	employeeId: string;
	projectId?: string;
	taskId?: string;
	organizationContactId?: string;
	description?: string;
	reason?: string;
	startedAt: Date;
	stoppedAt: Date;
	editedAt?: Date;
	tags?: string[];
	isBillable?: boolean;
	organizationId?: string;
	organization?: Pick<IOrganization, 'id'>;
	tenantId?: string;
	logType: TimeLogType;
	source: TimerSource.BROWSER;
}

export interface ITimeLog {
	employee: IEmployee;
	employeeId: string;
	timesheetId?: string;
	task?: ITeamTask;
	taskId?: string;
	timeSlots?: ITimerSlot[];
	projectId?: string;
	startedAt?: Date;
	stoppedAt?: Date;
	/** Edited At* */
	editedAt?: Date;
	description?: string;
	reason?: string;
	duration: number;
	isBillable: boolean;
	tags?: string[];
	isRunning?: boolean;
	isEdited?: boolean;
}
