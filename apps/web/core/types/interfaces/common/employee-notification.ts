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
	RateChangeRequest = 'RateChangeRequest',
	/** A timer left running, at the employee's threshold, then at twice it (#5022): about the run's time log. */
	TimerReminder = 'TimerReminder'
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
	preferences?: INotificationPreferences | null;
}

/** How a kind reaches the employee by email: at once, in the daily digest, or not at all. */
export type TNotificationEmailMode = 'immediate' | 'digest' | 'off';

/** No email between `start` and `end` (`HH:mm`, in `timeZone`); a window that ends before it starts spans midnight. */
export interface INotificationQuietHours {
	start: string;
	end: string;
	timeZone?: string;
}

/** The `preferences` of Gauzy's employee notification setting that the delivery lane reads. */
export interface INotificationPreferences {
	/** The email mode of every kind unless `emailByType` says otherwise; `immediate` when unset. */
	email?: TNotificationEmailMode | boolean;
	/** The email mode per notification type (`Assignment`, `Mention`, ...). */
	emailByType?: Partial<Record<string, TNotificationEmailMode>>;
	/** Browser notifications for every kind unless `pushByType` says otherwise; on when unset (a device is the opt-in). */
	push?: boolean;
	/** Browser notifications per notification type. */
	pushByType?: Partial<Record<string, boolean>>;
	taskUpdate?: boolean;
	dnd?: INotificationQuietHours | null;
	/** The hour (0-23, in the quiet hours' time zone, else the user's) the daily digest goes out; 8 when unset. */
	digestHour?: number;
	/**
	 * After how many hours a running timer is worth a reminder (#5022); 8 when unset, `null` (or 0) for no reminder.
	 * A second one follows at twice that.
	 */
	timerReminderHours?: number | null;
}

export type TEmployeeNotificationSettingKey =
	| 'assignment'
	| 'mention'
	| 'comment'
	| 'invitation'
	| 'message'
	| 'payment';

export type TEmployeeNotificationSettingInput = Partial<Record<TEmployeeNotificationSettingKey, boolean>> & {
	preferences?: INotificationPreferences;
};
