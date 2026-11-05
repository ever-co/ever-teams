import { EBaseEntityEnum } from '../../generics/enums/entity';
import { ID } from './base-interfaces';
import { IRecordAuthorEmployee } from './entity-record';

/** Gauzy's `EmployeeNotificationTypeEnum`, stored as an integer and returned by name. */
export enum EEmployeeNotificationType {
	Payment = 'Payment',
	Assignment = 'Assignment',
	Invitation = 'Invitation',
	Mention = 'Mention',
	Comment = 'Comment',
	Message = 'Message',
	Broadcast = 'Broadcast',
	RateChangeRequest = 'RateChangeRequest'
}

export interface IEmployeeNotification {
	id: ID;
	/** Written by Gauzy in English when the event is filed, for example `Ana Assigned you to the Task "Login"`. */
	title?: string | null;
	message?: string | null;
	type?: EEmployeeNotificationType | null;
	isRead?: boolean | null;
	readAt?: string | null;
	isArchived?: boolean | null;
	archivedAt?: string | null;
	onHoldUntil?: string | null;
	entity?: EBaseEntityEnum | `${EBaseEntityEnum}` | 'Broadcast' | null;
	entityId?: ID | null;
	sentByEmployeeId?: ID | null;
	sentByEmployee?: IRecordAuthorEmployee | null;
	receiverEmployeeId?: ID | null;
	createdAt: string;
}

/** The fields a receiver changes on one of their notifications; Gauzy's update route takes them as given. */
export interface IEmployeeNotificationUpdateInput {
	isRead?: boolean;
	readAt?: string | null;
	isArchived?: boolean;
	archivedAt?: string | null;
	onHoldUntil?: string | null;
}

export interface IMarkAllNotificationsReadResponse {
	success: boolean;
	count: number;
}

/** One row of Gauzy's `employee_notification_setting`: one switch per notification type, on by default. */
export interface IEmployeeNotificationSetting {
	id: ID;
	employeeId?: ID | null;
	payment?: boolean | null;
	assignment?: boolean | null;
	invitation?: boolean | null;
	mention?: boolean | null;
	comment?: boolean | null;
	message?: boolean | null;
	preferences?: Record<string, unknown> | null;
}

export type TEmployeeNotificationSettingKey =
	| 'assignment'
	| 'mention'
	| 'comment'
	| 'invitation'
	| 'message'
	| 'payment';

export type TEmployeeNotificationSettingInput = Partial<Record<TEmployeeNotificationSettingKey, boolean>>;
