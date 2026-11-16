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
	TimerReminder = 'TimerReminder',
	/**
	 * A meeting the person hosts or is invited to (#5022): they were invited or removed, it was changed or cancelled, it
	 * starts soon or it is starting. About the meeting's appointment; the title says which (`meetingNoticeOf`).
	 */
	Meeting = 'Meeting',
	/**
	 * A record the employee follows changed (#5022): a task's status, priority, due date or members, or a project's
	 * status, dates or archiving (its members follow it). The message says what changed.
	 */
	TaskUpdate = 'TaskUpdate',
	/** A task the employee is assigned to is due soon, at their threshold before its due date (#5022): about the task. */
	TaskDueReminder = 'TaskDueReminder',
	/** A colleague shared a Board with the employee, in the Boards app (#5022): the Board is in `metadata.board`. */
	BoardShare = 'BoardShare',
	/** A colleague mentioned the employee in a Board, in the Boards app (#5022): the Board is in `metadata.board`. */
	BoardMention = 'BoardMention'
}

/**
 * The Board a `BoardShare` or a `BoardMention` names. A Board is no record of the platform: it is named by its room or
 * its snapshot, with the name and the link the sender's Boards app sent, each as sent (`board-notification.ts` there).
 */
export interface INotificationBoard {
	roomId?: string | null;
	snapshotId?: string | null;
	name?: string | null;
	/** The address that opens the Board; its `#` part holds the Board's key when the sender chose to send it. */
	link?: string | null;
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
	/** What the notification says about a thing outside the platform: the Board of a `BoardShare` or a `BoardMention`. */
	metadata?: { board?: INotificationBoard | null } | null;
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
	/**
	 * How many minutes before a meeting the person hosts or is invited to they are reminded of it (#5022); 15 when
	 * unset, `null` (or 0) for no reminder before. The notice that it is starting comes either way.
	 */
	meetingReminderMinutes?: number | null;
	/**
	 * How many hours before a task's due date its assignees are reminded of it (#5022); 24 when unset, `null` (or 0) for
	 * no reminder.
	 */
	taskDueReminderHours?: number | null;
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
