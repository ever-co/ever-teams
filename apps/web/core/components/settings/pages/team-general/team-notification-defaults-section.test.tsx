/** @jest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/locales/en.json';
import { TeamNotificationDefaultsSection } from './team-notification-defaults-section';

jest.mock('@/core/components/common/select', () => ({
	Select: ({
		children,
		onValueChange,
		value
	}: {
		children: React.ReactNode;
		onValueChange: (v: string) => void;
		value: string;
	}) => (
		<div data-value={value}>
			{children}
			<button type="button" onClick={() => onValueChange('__test__')}>
				pick
			</button>
		</div>
	),
	SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectValue: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
	SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('TeamNotificationDefaultsSection (#5022)', () => {
	it('builds a second change on the first while the first save is on its way', async () => {
		const saves: unknown[] = [];
		let answer: () => void = () => undefined;
		const saveNotificationDefaults = jest.fn(
			(defaults: unknown) =>
				new Promise<void>((resolve) => {
					saves.push(defaults);
					answer = resolve;
				})
		);
		render(
			<NextIntlClientProvider locale="en" messages={messages}>
				<TeamNotificationDefaultsSection
					team={{ id: 'team-1', name: 'Design', notificationDefaults: { taskUpdate: false } } as never}
					canEdit
					saveNotificationDefaults={saveNotificationDefaults}
				/>
			</NextIntlClientProvider>
		);
		const picks = screen.getAllByRole('button', { name: 'pick' });

		// Email, then the due date reminder, before the first save answers: tokens the rows do not know read as
		// "members choose" for the switches and as a number for the thresholds, so pick the email and the due date rows
		await act(async () => {
			picks[0].click();
		});
		await act(async () => {
			picks[4].click();
		});
		await act(async () => answer());

		expect(saves).toHaveLength(2);
		// The second save keeps what the first one set, and the key the team held
		expect(saves[1]).toEqual(expect.objectContaining({ taskUpdate: false, email: '__test__' }));
		expect(saves[1]).toHaveProperty('taskDueReminderHours');
	});
});
