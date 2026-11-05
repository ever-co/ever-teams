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
	});
});
