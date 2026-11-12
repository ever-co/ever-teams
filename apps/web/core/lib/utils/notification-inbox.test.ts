import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { EEmployeeNotificationType, IEmployeeNotification } from '@/core/types/interfaces/common/employee-notification';
import { toNotificationEntry } from './notification-inbox';

function notification(overrides: Partial<IEmployeeNotification>): IEmployeeNotification {
	return {
		id: 'notification-1',
		title: 'Ana Lima asked for a rate change',
		message: 'Current rate: 40 USD/h. Requested: 55 USD/h.',
		isRead: false,
		createdAt: '2026-11-05T08:00:00.000Z',
		...overrides
	};
}

describe('toNotificationEntry for a rate change request', () => {
	it('reads the type Gauzy sends and leads to Members settings, where the admin edits the rate', () => {
		const entry = toNotificationEntry(
			notification({ type: EEmployeeNotificationType.RateChangeRequest, entityId: 'employee-ana' })
		);

		expect(entry.type).toBe(EEmployeeNotificationType.RateChangeRequest);
		expect(entry.href).toBe('/settings/team/members');
		expect(entry.taskId).toBeNull();
		expect(entry.message).toBe('Current rate: 40 USD/h. Requested: 55 USD/h.');
	});

	it("names the requester from Gauzy's title when the sender is not loaded", () => {
		const entry = toNotificationEntry(notification({ type: EEmployeeNotificationType.RateChangeRequest }));

		expect(entry.senderName).toBe('Ana Lima');
	});

	it('leaves the other notifications on their task, with no link', () => {
		const entry = toNotificationEntry(
			notification({
				type: EEmployeeNotificationType.Assignment,
				entity: EBaseEntityEnum.Task,
				entityId: 'task-1'
			})
		);

		expect(entry.href).toBeNull();
		expect(entry.taskId).toBe('task-1');
		expect(entry.timerReminder).toBeNull();
	});
});

describe('toNotificationEntry for a timer reminder', () => {
	it('opens the timer, and reads the reminder off the title and the run it is about (#5022)', () => {
		const entry = toNotificationEntry(
			notification({
				type: EEmployeeNotificationType.TimerReminder,
				title: 'Your timer is still running after 16 hours on "Ship it"',
				message: 'Did you forget it? Stop it, then correct the time in your timesheet if needed.',
				entity: EBaseEntityEnum.TimeLog,
				entityId: 'log-1'
			})
		);

		expect(entry.type).toBe(EEmployeeNotificationType.TimerReminder);
		expect(entry.href).toBe('/');
		expect(entry.taskId).toBeNull();
		expect(entry.subject).toBe('Ship it');
		expect(entry.senderName).toBeNull();
		expect(entry.timerReminder).toEqual({ level: 2, hours: 16, timeLogId: 'log-1' });
	});
});
