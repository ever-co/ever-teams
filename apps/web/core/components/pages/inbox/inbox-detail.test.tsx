/** @jest-environment jsdom */

import React from 'react';
import { TextDecoder, TextEncoder } from 'node:util';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { toInboxEntry } from '@/core/lib/utils/inbox-entry';
import { timerReminderTargetState } from '@/core/stores/timer/timer-reminder';
import { EInboxItemKind, EInboxItemSource, IInboxItem } from '@/core/types/interfaces/common/inbox-item';
import { isJitsiMeeting, meetPathFor } from '@/core/lib/utils/collaboration';
import { meetingPathOfInput, type ScheduledMeeting } from '@/core/lib/utils/meetings';
import { InboxDetail } from './inbox-detail';

// Room names are base64 of their UTF-8 bytes; jsdom has no TextEncoder of its own
Object.assign(globalThis, { TextEncoder, TextDecoder });

const mockPush = jest.fn();
let mockInvited: ScheduledMeeting[] = [];
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/core/hooks/meetings/use-invited-meetings', () => ({
	useInvitedMeetings: () => ({ meetings: mockInvited, isLoading: false, isError: false, refetch: jest.fn() })
}));
jest.mock('@/core/hooks/meetings/use-scheduled-meetings', () => ({
	useScheduledMeetings: () => ({ meetings: [] })
}));

jest.mock('next-intl', () => {
	const t = Object.assign(
		(key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
		{ rich: (key: string) => key }
	);
	return { useTranslations: () => t, useLocale: () => 'en' };
});

/** A timer reminder as the platform files it in the inbox (#5022). */
function reminder(overrides: Partial<IInboxItem> = {}): IInboxItem {
	return {
		id: 'item-1',
		kind: EInboxItemKind.Notification,
		source: EInboxItemSource.Gauzy,
		status: 'OPEN',
		title: 'Your timer is still running after 16 hours on "Ship it"',
		body: 'Did you forget it? Stop it, then correct the time in your timesheet if needed.',
		entity: 'TimeLog',
		entityId: 'log-1',
		taskId: null,
		externalSource: 'gauzy-notification',
		externalId: 'notification-1',
		metadata: { notificationType: 'TimerReminder' },
		createdAt: '2026-11-11T16:00:00.000Z',
		recipient: { isRead: false },
		...overrides
	};
}

function mount(item: IInboxItem, runKey: string | null) {
	const store = createStore();
	const stop = jest.fn();
	if (runKey) {
		store.set(timerReminderTargetState, { runKey, stop });
	}
	const onOpenTarget = jest.fn();
	const entry = toInboxEntry(item);
	render(
		<Provider store={store}>
			<InboxDetail
				entry={entry}
				person={null}
				taskTitle={null}
				canTriage
				onOpenTarget={onOpenTarget}
				onToggleRead={jest.fn()}
				onArchive={jest.fn()}
				onSnooze={jest.fn()}
				onDone={jest.fn()}
			/>
		</Provider>
	);
	return { store, stop, onOpenTarget, entry };
}

describe('InboxDetail of a timer reminder', () => {
	it("says it in the reader's language, and opens the timer", () => {
		const { onOpenTarget, entry } = mount(reminder(), null);

		expect(screen.getByText('notifications.TIMER_REMINDER.FORGOTTEN_TITLE {"hours":16}')).toBeTruthy();
		expect(screen.getByText('notifications.TIMER_REMINDER.FORGOTTEN_DESCRIPTION')).toBeTruthy();
		expect(screen.getByText('Ship it')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'notifications.TIMER_REMINDER.OPEN' }));
		expect(onOpenTarget).toHaveBeenCalledWith(entry);
	});

	it('opens the timer, not a task, when its item names one', () => {
		const { onOpenTarget, entry } = mount(reminder({ taskId: 'task-1' }), null);

		expect(entry.taskId).toBeNull();
		expect(entry.href).toBe('/');
		expect(screen.queryByRole('button', { name: 'inbox.DETAIL.OPEN_TASK' })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'notifications.TIMER_REMINDER.OPEN' }));
		expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({ taskId: null, href: '/' }));
	});

	it('names the open action after the timer for an entry that carries a task as well', () => {
		render(
			<Provider store={createStore()}>
				<InboxDetail
					entry={{ ...toInboxEntry(reminder()), taskId: 'task-1' }}
					person={null}
					taskTitle={null}
					canTriage
					onOpenTarget={jest.fn()}
					onToggleRead={jest.fn()}
					onArchive={jest.fn()}
					onSnooze={jest.fn()}
					onDone={jest.fn()}
				/>
			</Provider>
		);

		expect(screen.getByRole('button', { name: 'notifications.TIMER_REMINDER.OPEN' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'inbox.DETAIL.OPEN_TASK' })).toBeNull();
	});

	it('stops the timer through the app owner while the run it is about still runs', () => {
		const { stop } = mount(reminder(), 'log-1');

		fireEvent.click(screen.getByRole('button', { name: 'notifications.TIMER_REMINDER.STOP' }));

		expect(stop).toHaveBeenCalledTimes(1);
	});

	it('offers no stop once that run stopped, or while another one runs', () => {
		const { store } = mount(reminder(), 'log-2');
		expect(screen.queryByRole('button', { name: 'notifications.TIMER_REMINDER.STOP' })).toBeNull();

		act(() => store.set(timerReminderTargetState, null));
		expect(screen.queryByRole('button', { name: 'notifications.TIMER_REMINDER.STOP' })).toBeNull();
		expect(screen.getByRole('button', { name: 'notifications.TIMER_REMINDER.OPEN' })).toBeTruthy();
	});
});

describe('InboxDetail of a meeting notification (#5022)', () => {
	const link = `https://app.ever.team${meetPathFor('Ever-Planning-AbCdEfGhIj', true)}`;
	const meeting = (title: string) =>
		reminder({
			title,
			body: 'Thursday, November 12, 2099, 2:00 – 2:30 PM (Europe/Paris)',
			entity: 'EmployeeAppointment',
			entityId: 'appointment-9',
			metadata: { notificationType: 'Meeting', sentByEmployeeId: 'employee-1' }
		});

	const MINUTE = 60 * 1000;
	/** The meeting one is invited to, starting `startsIn` from now. */
	const invitedTo = (startsIn: number): ScheduledMeeting => ({
		id: 'appointment-9',
		title: 'Planning',
		description: null,
		start: new Date(Date.now() + startsIn),
		end: new Date(Date.now() + startsIn + 30 * MINUTE),
		link,
		isInvited: true,
		hostName: 'Ana Silva'
	});

	beforeEach(() => {
		mockPush.mockReset();
		// Five minutes from now: within the minutes before the start in which a meeting opens to join
		mockInvited = [invitedTo(5 * MINUTE)];
	});

	it("says who invited, in the reader's language, with the meeting's time, and joins it", () => {
		const { onOpenTarget, entry } = mount(meeting('You are invited to "Planning"'), null);

		expect(screen.getByText('notifications.MEETING.INVITED')).toBeTruthy();
		expect(screen.getByText('Planning')).toBeTruthy();
		expect(screen.getByText('Thursday, November 12, 2099, 2:00 – 2:30 PM (Europe/Paris)')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'notifications.MEETING.OPEN' }));
		expect(onOpenTarget).toHaveBeenCalledWith(entry);

		fireEvent.click(screen.getByRole('button', { name: 'meetings.JOIN_MEETING_OF {"title":"Planning"}' }));
		expect(mockPush).toHaveBeenCalledWith(meetingPathOfInput(link, isJitsiMeeting()));
	});

	it('offers no way to join a meeting cancelled, or one the person was removed from', () => {
		mount(meeting('"Planning" was cancelled'), null);
		expect(screen.getByText('notifications.MEETING.CANCELLED')).toBeTruthy();
		expect(screen.queryByRole('button', { name: /meetings\.JOIN_MEETING_OF/ })).toBeNull();
	});

	it('offers no way to join a meeting days ahead: the meetings page opens it', () => {
		mockInvited = [invitedTo(3 * 24 * 60 * MINUTE)];
		mount(meeting('You are invited to "Planning"'), null);

		expect(screen.getByRole('button', { name: 'notifications.MEETING.OPEN' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: /meetings\.JOIN_MEETING_OF/ })).toBeNull();
	});
});
