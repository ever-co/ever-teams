/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { toInboxEntry } from '@/core/lib/utils/inbox-entry';
import { timerReminderTargetState } from '@/core/stores/timer/timer-reminder';
import { EInboxItemKind, EInboxItemSource, IInboxItem } from '@/core/types/interfaces/common/inbox-item';
import { InboxDetail } from './inbox-detail';

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
