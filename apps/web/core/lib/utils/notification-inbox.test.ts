import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { EEmployeeNotificationType, IEmployeeNotification } from '@/core/types/interfaces/common/employee-notification';
import { boardInvitationHref } from '@/core/lib/notifications/board-invitations';
import { filterNotificationEntries, toNotificationEntry } from './notification-inbox';

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

describe('toNotificationEntry for a project (#5022)', () => {
	it('opens the project, and reads who changed it off the title', () => {
		const entry = toNotificationEntry(
			notification({
				title: 'Ana Lima Updated the Project "Website"',
				message: 'The project was archived.',
				type: EEmployeeNotificationType.TaskUpdate,
				entity: EBaseEntityEnum.OrganizationProject,
				entityId: 'project-1'
			})
		);
		expect(entry.type).toBe(EEmployeeNotificationType.TaskUpdate);
		expect(entry.href).toBe('/projects/project-1');
		expect(entry.taskId).toBeNull();
		expect(entry.subject).toBe('Website');
		expect(entry.senderName).toBe('Ana Lima');
		expect(entry.message).toBe('The project was archived.');
	});
});

describe('toNotificationEntry for a due date reminder (#5022)', () => {
	it('opens the task of a due date reminder, which names no sender', () => {
		const entry = toNotificationEntry(
			notification({
				title: 'The Task "Login" is due in 3 hours',
				message: 'Due at 2026-11-19 17:00 (Europe/Paris).',
				type: EEmployeeNotificationType.TaskDueReminder,
				entity: EBaseEntityEnum.Task,
				entityId: 'task-1'
			})
		);
		expect(entry.type).toBe(EEmployeeNotificationType.TaskDueReminder);
		expect(entry.taskId).toBe('task-1');
		expect(entry.href).toBeNull();
		expect(entry.senderName).toBeNull();
	});
});

describe('senderNameFromTitle and a quoted subject (#5022)', () => {
	it('reads no sender from a verb inside the quoted subject', () => {
		const entry = toNotificationEntry(
			notification({
				title: 'The Task "Review Updated API" is due in 3 hours',
				type: EEmployeeNotificationType.TaskDueReminder,
				entity: EBaseEntityEnum.Task,
				entityId: 'task-1'
			})
		);
		expect(entry.senderName).toBeNull();
		expect(entry.subject).toBe('Review Updated API');
	});

	it('still reads the sender before the subject', () => {
		const entry = toNotificationEntry(notification({ title: 'Ana Lima Updated the Task "Assigned to nobody"' }));
		expect(entry.senderName).toBe('Ana Lima');
	});
});

describe('toNotificationEntry for a Board invitation (#5022)', () => {
	it('opens the Board app this deployment is set up with, else the in-app board', () => {
		const entry = toNotificationEntry(
			notification({
				title: 'Ana Lima Invited you to a Board with the Team "Design"',
				message: null,
				type: EEmployeeNotificationType.Invitation,
				entity: EBaseEntityEnum.OrganizationTeam,
				entityId: 'team-1'
			})
		);
		expect(entry.href).toBe(boardInvitationHref());
		expect(entry.href).not.toBeNull();
		expect(entry.senderName).toBe('Ana Lima');
		expect(entry.subject).toBe('Design');
	});
});

describe('toNotificationEntry for a meeting (#5022)', () => {
	it('opens the meetings page, reads its kind and title, and takes no sender from the title', () => {
		const entry = toNotificationEntry(
			notification({
				type: EEmployeeNotificationType.Meeting,
				title: '"Proposal sent to customer" was changed',
				entity: EBaseEntityEnum.EmployeeAppointment,
				entityId: 'appointment-1'
			})
		);

		expect(entry.href).toBe('/meet');
		expect(entry.meeting).toEqual({
			kind: 'changed',
			title: 'Proposal sent to customer',
			minutes: null,
			appointmentId: 'appointment-1'
		});
		expect(entry.senderName).toBeNull();
	});

	it('names the employee the platform says sent it', () => {
		const entry = toNotificationEntry(
			notification({
				type: EEmployeeNotificationType.Meeting,
				title: 'You are invited to "Planning"',
				sentByEmployee: { fullName: 'Ana Silva' } as IEmployeeNotification['sentByEmployee']
			})
		);

		expect(entry.senderName).toBe('Ana Silva');
	});
});

describe('toNotificationEntry for a Board shared or a mention in one (#5022)', () => {
	const configured = process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN;
	const link = 'https://board.ever.team/#room=r00m,secret-key';

	beforeEach(() => {
		process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN = 'https://board.ever.team';
	});

	afterEach(() => {
		if (configured === undefined) {
			delete process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN;
		} else {
			process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN = configured;
		}
	});

	it('opens the Board at the link sent with it, and names who shared which Board', () => {
		const entry = toNotificationEntry(
			notification({
				title: 'Ana Lima shared the Board "Sprint plan" with you',
				message: null,
				type: EEmployeeNotificationType.BoardShare,
				metadata: { board: { roomId: 'r00m', name: 'Sprint plan', link } }
			})
		);
		const href = new URL(entry.href as string);
		expect(href.origin).toBe('https://board.ever.team');
		expect(href.hash).toBe('#room=r00m,secret-key');
		expect(entry.senderName).toBe('Ana Lima');
		expect(entry.subject).toBe('Sprint plan');
		expect(entry.taskId).toBeNull();
	});

	it('opens nothing without a link, or for a link elsewhere, and still says who mentioned them', () => {
		const withoutLink = toNotificationEntry(
			notification({
				title: 'Ana Lima mentioned you in a Board',
				message: null,
				type: EEmployeeNotificationType.BoardMention,
				metadata: { board: { roomId: 'r00m' } }
			})
		);
		expect(withoutLink.href).toBeNull();
		expect(withoutLink.senderName).toBe('Ana Lima');
		expect(withoutLink.subject).toBeNull();
		const elsewhere = toNotificationEntry(
			notification({
				title: 'Ana Lima shared a Board with you',
				type: EEmployeeNotificationType.BoardShare,
				metadata: { board: { roomId: 'r00m', link: 'https://evil.example/#room=r00m,key' } }
			})
		);
		expect(elsewhere.href).toBeNull();
	});

	it('counts a mention in a Board among the mentions', () => {
		const mention = toNotificationEntry(
			notification({ title: 'Ana Lima mentioned you in a Board', type: EEmployeeNotificationType.BoardMention })
		);
		const share = toNotificationEntry(
			notification({ title: 'Ana Lima shared a Board with you', type: EEmployeeNotificationType.BoardShare })
		);
		expect(filterNotificationEntries([mention, share], 'mentions')).toEqual([mention]);
	});
	it("reads the Board's name from the metadata, whatever quotes the sender's name holds", () => {
		const entry = toNotificationEntry(
			notification({
				title: 'Ana "Nina" Lima shared the Board "Sprint plan" with you',
				message: null,
				type: EEmployeeNotificationType.BoardShare,
				sentByEmployee: null,
				metadata: { board: { roomId: 'r00m', name: 'Sprint plan', link } }
			})
		);
		expect(entry.subject).toBe('Sprint plan');
		expect(entry.senderName).toBe('Ana "Nina" Lima');
	});
});
