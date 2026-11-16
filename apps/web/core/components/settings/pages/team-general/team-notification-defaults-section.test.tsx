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

	const sectionOf = (team: object, saveNotificationDefaults: (defaults: unknown) => Promise<void>) => (
		<NextIntlClientProvider locale="en" messages={messages}>
			<TeamNotificationDefaultsSection
				team={{ id: 'team-1', name: 'Design', ...team } as never}
				canEdit
				saveNotificationDefaults={saveNotificationDefaults}
			/>
		</NextIntlClientProvider>
	);

	it('does not send a refused change again with the next one', async () => {
		const saves: unknown[] = [];
		const saveNotificationDefaults = jest
			.fn((defaults: unknown) => {
				saves.push(defaults);
				return Promise.resolve();
			})
			.mockImplementationOnce((defaults: unknown) => {
				saves.push(defaults);
				return Promise.reject(new Error('refused'));
			});
		render(sectionOf({ notificationDefaults: null }, saveNotificationDefaults));
		const picks = screen.getAllByRole('button', { name: 'pick' });

		await act(async () => {
			picks[0].click();
		});
		await act(async () => {
			picks[4].click();
		});

		expect(saves[0]).toEqual({ email: '__test__' });
		expect(saves[1]).not.toHaveProperty('email');
		expect(saves[1]).toHaveProperty('taskDueReminderHours');
	});

	/** A Gauzy whose answers the test lands one by one: `stored` is what the last request to land wrote. */
	const gauzy = () => {
		const requests: Array<{ defaults: unknown; land: () => void }> = [];
		const server = {
			stored: undefined as unknown,
			requests,
			save: jest.fn(
				(defaults: unknown) =>
					new Promise<void>((resolve) => {
						requests.push({
							defaults,
							land: () => {
								server.stored = defaults;
								resolve();
							}
						});
					})
			),
			/** Lands every request on its way, the one sent last first, until none is left. */
			landLatestFirst: async () => {
				let landed = 0;
				while (landed < requests.length) {
					const waiting = requests.slice(landed).reverse();
					landed = requests.length;
					for (const request of waiting) {
						await act(async () => request.land());
					}
				}
			}
		};
		return server;
	};

	it('never lets a request that reaches Gauzy late write older defaults over newer ones', async () => {
		const server = gauzy();
		render(sectionOf({ notificationDefaults: null }, server.save));
		const picks = screen.getAllByRole('button', { name: 'pick' });

		// Email, then browser notifications, before the first save answers
		await act(async () => {
			picks[0].click();
		});
		await act(async () => {
			picks[1].click();
		});
		// One save at a time: the second waits for the first
		expect(server.save).toHaveBeenCalledTimes(1);
		await server.landLatestFirst();

		expect(server.stored).toEqual({ email: '__test__', push: false });
	});

	it('keeps a change on its way when the team read after an earlier save lands', async () => {
		const server = gauzy();
		const { rerender } = render(sectionOf({ notificationDefaults: null }, server.save));
		const picks = screen.getAllByRole('button', { name: 'pick' });

		// Email, then the due date reminder; the team read after the email's save lands while the second waits
		await act(async () => {
			picks[0].click();
		});
		await act(async () => {
			picks[4].click();
		});
		rerender(sectionOf({ notificationDefaults: { email: '__test__' } }, server.save));
		await act(async () => {
			screen.getAllByRole('button', { name: 'pick' })[3].click();
		});
		await server.landLatestFirst();

		expect(server.stored).toEqual(expect.objectContaining({ email: '__test__' }));
		expect(server.stored).toHaveProperty('taskDueReminderHours');
		expect(server.stored).toHaveProperty('timerReminderHours');
	});

	it('never takes a read of the team older than one already seen', async () => {
		const save = jest.fn().mockResolvedValue(undefined);
		const { container, rerender } = render(
			sectionOf({ notificationDefaults: { push: false }, updatedAt: '2026-11-16T10:00:02.000Z' }, save)
		);

		// A team list fetched before the push default was saved lands after the read that holds it
		rerender(sectionOf({ notificationDefaults: null, updatedAt: '2026-11-16T10:00:01.000Z' }, save));
		expect(container.querySelectorAll('[data-value]')[1].getAttribute('data-value')).toBe('off');
		await act(async () => {
			screen.getAllByRole('button', { name: 'pick' })[0].click();
		});

		expect(save).toHaveBeenLastCalledWith({ push: false, email: '__test__' });
	});

	it('offers nothing on a Gauzy that keeps no team defaults, which reads a team without the key', () => {
		render(sectionOf({}, jest.fn()));

		expect(screen.queryByRole('button', { name: 'pick' })).toBeNull();
		expect(screen.queryByText(messages.settings.teamGeneral.NOTIFICATIONS_SECTION)).toBeNull();
	});
});
