/** @jest-environment jsdom */
import { TextDecoder, TextEncoder } from 'node:util';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { meetPathFor } from '@/core/lib/utils/collaboration';
import { meetingPathFor, type ScheduledMeeting } from '@/core/lib/utils/meetings';

// Room names are base64 of their UTF-8 bytes; jsdom has no TextEncoder of its own
Object.assign(globalThis, { TextEncoder, TextDecoder });

const mockPush = jest.fn();
const mockScheduleMeeting = jest.fn();
const mockCancelMeeting = jest.fn();
const mockRescheduleMeeting = jest.fn();
let mockScheduled: {
	meetings: ScheduledMeeting[];
	canSchedule: boolean;
};

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
// nanoid ships as ESM only; a fixed suffix keeps the room names readable here
jest.mock('nanoid', () => ({ nanoid: (size = 21) => 'AbCdEfGhIjKlMnOpQrStU'.slice(0, size) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>
}));
jest.mock('@/core/components/duplicated-components/breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('@/core/components/optimized-components/meet', () => ({ preloadLiveKit: jest.fn() }));
// The confirmation dialog imports the whole components barrel (and next-auth with it): a stand-in with its buttons
jest.mock('@/core/components/common/alert-dialog-confirmation', () => ({
	AlertDialogConfirmation: ({
		isOpen,
		confirmText,
		cancelText,
		onConfirm,
		onCancel
	}: {
		isOpen: boolean;
		confirmText: string;
		cancelText: string;
		onConfirm: () => void;
		onCancel: () => void;
	}) =>
		isOpen ? (
			<div role="alertdialog">
				<button type="button" onClick={onCancel}>
					{cancelText}
				</button>
				<button type="button" onClick={onConfirm}>
					{confirmText}
				</button>
			</div>
		) : null
}));
jest.mock('@/core/stores', () => {
	const { atom } = jest.requireActual('jotai');
	return { activeTeamNameState: atom('Ever Team') };
});
jest.mock('@/core/hooks/meetings/use-scheduled-meetings', () => ({
	useScheduledMeetings: () => ({
		...mockScheduled,
		hostName: 'Ruslan Konviser',
		isLoading: false,
		isError: false,
		refetch: jest.fn(),
		scheduleMeeting: mockScheduleMeeting,
		isScheduling: false,
		rescheduleMeeting: mockRescheduleMeeting,
		isRescheduling: false,
		cancelMeeting: mockCancelMeeting,
		cancellingId: undefined
	})
}));

jest.mock('@/core/hooks/meetings/use-meeting-invitees', () => ({
	useMeetingInvitees: () => [
		{ email: 'ana@acme.com', name: 'Ana Silva' },
		{ email: 'bob@acme.com', name: 'Bob Stone' }
	]
}));

// The person's zone is the one this test runs in, so the times typed are the times of the dates built here
jest.mock('@/core/hooks/meetings/use-default-meeting-zone', () => ({
	useDefaultMeetingZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone
}));

import { MeetingsPage } from './meetings-page';

/** The room name a meeting page path carries. */
function roomOfPath(path: string): string {
	const room = new URLSearchParams(path.split('?')[1]).get('room') ?? '';
	return new TextDecoder().decode(Uint8Array.from(atob(room), (character) => character.codePointAt(0) ?? 0));
}

describe('MeetingsPage', () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockScheduleMeeting.mockReset().mockResolvedValue({ id: 'appointment-1' });
		mockCancelMeeting.mockReset().mockResolvedValue(undefined);
		mockRescheduleMeeting.mockReset().mockResolvedValue(undefined);
		mockScheduled = { meetings: [], canSchedule: true };
		// The notices' orb asks whether motion is reduced; jsdom has no matchMedia
		window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
	});

	it('starts a meeting at once, in a new room named after the team', () => {
		render(<MeetingsPage />);

		fireEvent.click(screen.getByTestId('meetings-new'));

		const path = mockPush.mock.calls[0][0] as string;
		expect(path).toMatch(/^\/meet\/jitsi\?room=/);
		expect(roomOfPath(path)).toMatch(/^EverTeam-.{10}$/);
	});

	it('opens a new form each time: an answer that comes back after Schedule was closed never shows in the next one', async () => {
		let answer: (value: unknown) => void = () => undefined;
		mockScheduleMeeting.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
		render(<MeetingsPage />);
		fireEvent.click(screen.getByTestId('meetings-schedule'));
		fireEvent.change(await screen.findByLabelText('meetings.FIELD_TITLE'), { target: { value: 'Retro' } });
		fireEvent.click(screen.getByRole('button', { name: 'meetings.SCHEDULE' }));
		// Closed while the request runs
		fireEvent.click(screen.getByRole('button', { name: 'common.CANCEL' }));

		fireEvent.click(screen.getByTestId('meetings-schedule'));
		await act(async () => {
			answer({ id: 'appointment-late' });
		});

		expect(screen.queryByTestId('meeting-scheduled')).toBeNull();
		expect(((await screen.findByLabelText('meetings.FIELD_TITLE')) as HTMLInputElement).value).toBe('');
	});

	it('proposes the next half hour from when Schedule opens, not from when the page opened', async () => {
		jest.useFakeTimers({ advanceTimers: true });
		try {
			jest.setSystemTime(new Date(2026, 10, 11, 9, 5));
			render(<MeetingsPage />);
			jest.setSystemTime(new Date(2026, 10, 11, 11, 40));

			fireEvent.click(screen.getByTestId('meetings-schedule'));

			expect(((await screen.findByLabelText('meetings.FIELD_TIME')) as HTMLInputElement).value).toBe('12:00');
		} finally {
			jest.useRealTimers();
		}
	});

	it('joins from a pasted link, and says what is wrong with anything else', async () => {
		render(<MeetingsPage />);
		fireEvent.click(screen.getByTestId('meetings-join'));
		const input = await screen.findByLabelText('meetings.JOIN_LABEL');

		fireEvent.change(input, { target: { value: 'hello world' } });
		fireEvent.click(screen.getByRole('button', { name: 'meetings.JOIN' }));
		expect(screen.getByRole('alert').textContent).toBe('meetings.JOIN_INVALID');
		expect(mockPush).not.toHaveBeenCalled();

		const link = `https://app.ever.team${meetPathFor('Ever-Ruslan-AbCdEfGhIj', true)}`;
		fireEvent.change(input, { target: { value: link } });
		fireEvent.click(screen.getByRole('button', { name: 'meetings.JOIN' }));

		expect(mockPush).toHaveBeenCalledWith(meetPathFor('Ever-Ruslan-AbCdEfGhIj', true));
	});

	it('schedules a meeting with its title, time and room link, then hands over the invitation', async () => {
		render(<MeetingsPage />);
		fireEvent.click(screen.getByTestId('meetings-schedule'));
		fireEvent.change(await screen.findByLabelText('meetings.FIELD_TITLE'), { target: { value: 'Sprint review' } });

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'meetings.SCHEDULE' }));
		});

		expect(mockScheduleMeeting).toHaveBeenCalledTimes(1);
		const draft = mockScheduleMeeting.mock.calls[0][0];
		expect(draft).toMatchObject({ title: 'Sprint review', durationMinutes: 30 });
		expect(draft.start.getTime()).toBeGreaterThan(Date.now());
		expect(draft.link).toMatch(/^http:\/\/localhost\/meet\/jitsi\?room=.+&title=Sprint%20review$/);
		const scheduled = await screen.findByTestId('meeting-scheduled');
		expect(within(scheduled).getByRole('button', { name: 'meetings.COPY_INVITATION' })).toBeTruthy();
		expect(within(scheduled).getByRole('button', { name: 'meetings.ADD_TO_CALENDAR' })).toBeTruthy();
	});

	it("invites team members picked from a list and addresses typed, as the appointment's emails", async () => {
		// cmdk measures its list and keeps the picked row in view; jsdom does neither
		Element.prototype.scrollIntoView ??= jest.fn();
		globalThis.ResizeObserver ??= class {
			observe() {}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver;
		render(<MeetingsPage />);
		fireEvent.click(screen.getByTestId('meetings-schedule'));
		fireEvent.change(await screen.findByLabelText('meetings.FIELD_TITLE'), { target: { value: 'Kick-off' } });

		fireEvent.click(screen.getByTestId('meeting-team-members'));
		fireEvent.click(await screen.findByRole('option', { name: /Ana Silva/ }));
		const participants = screen.getByRole('textbox', { name: 'meetings.FIELD_PARTICIPANTS' });
		fireEvent.change(participants, { target: { value: 'Guest <guest@example.org>' } });
		fireEvent.keyDown(participants, { key: 'Enter' });
		fireEvent.change(participants, { target: { value: 'nobody' } });
		fireEvent.keyDown(participants, { key: 'Enter' });

		expect(screen.getByRole('alert').textContent).toBe('meetings.PARTICIPANTS_INVALID');
		const chips = within(screen.getByRole('list', { name: 'meetings.FIELD_PARTICIPANTS' }));
		expect(chips.getAllByRole('listitem').map((chip) => chip.textContent)).toEqual([
			'Ana Silva',
			'guest@example.org'
		]);
		// What is no address stays to be fixed, and keeps the meeting from being scheduled
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'meetings.SCHEDULE' }));
		});
		expect(mockScheduleMeeting).not.toHaveBeenCalled();

		fireEvent.change(participants, { target: { value: 'bob@acme.com' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'meetings.SCHEDULE' }));
		});
		expect(mockScheduleMeeting.mock.calls[0][0].participantEmails).toEqual([
			'ana@acme.com',
			'guest@example.org',
			'bob@acme.com'
		]);
		expect(await screen.findByText('meetings.INVITE_HINT_PARTICIPANTS')).toBeTruthy();
	});

	it('reads the date and time typed on the clocks of the time zone picked, and says the time where one is', async () => {
		Element.prototype.scrollIntoView ??= jest.fn();
		globalThis.ResizeObserver ??= class {
			observe() {}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver;
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const elsewhere = zone === 'Asia/Tokyo' ? 'America/New_York' : 'Asia/Tokyo';
		render(<MeetingsPage />);
		fireEvent.click(screen.getByTestId('meetings-schedule'));
		fireEvent.change(await screen.findByLabelText('meetings.FIELD_TITLE'), { target: { value: 'Tokyo sync' } });
		fireEvent.change(screen.getByLabelText('meetings.FIELD_DATE'), { target: { value: '2030-01-15' } });
		fireEvent.change(screen.getByLabelText('meetings.FIELD_TIME'), { target: { value: '10:00' } });
		expect(screen.getByTestId('meeting-time-zone').textContent).toContain(zone.replace(/_/g, ' '));
		expect(screen.queryByTestId('meeting-local-time')).toBeNull();

		fireEvent.click(screen.getByTestId('meeting-time-zone'));
		fireEvent.change(await screen.findByPlaceholderText('settings.preferences.TIME_ZONE_SEARCH'), {
			target: { value: elsewhere }
		});
		fireEvent.click(await screen.findByRole('option', { name: new RegExp(elsewhere.replace(/_/g, ' ')) }));

		expect(screen.getByTestId('meeting-time-zone').textContent).toContain(elsewhere.replace(/_/g, ' '));
		expect(screen.getByTestId('meeting-local-time').textContent).toMatch(/^meetings.LOCAL_TIME_HINT:/);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'meetings.SCHEDULE' }));
		});
		const expected = elsewhere === 'Asia/Tokyo' ? '2030-01-15T01:00:00.000Z' : '2030-01-15T15:00:00.000Z';
		expect(mockScheduleMeeting.mock.calls[0][0].start.toISOString()).toBe(expected);
	});

	it('refuses a meeting without a title or at a time that has passed', async () => {
		render(<MeetingsPage />);
		fireEvent.click(screen.getByTestId('meetings-schedule'));
		const title = await screen.findByLabelText('meetings.FIELD_TITLE');

		fireEvent.click(screen.getByRole('button', { name: 'meetings.SCHEDULE' }));
		expect(screen.getByRole('alert').textContent).toBe('meetings.SCHEDULE_TITLE_MISSING');

		fireEvent.change(title, { target: { value: 'Retro' } });
		fireEvent.change(screen.getByLabelText('meetings.FIELD_DATE'), { target: { value: '2020-01-01' } });
		fireEvent.click(screen.getByRole('button', { name: 'meetings.SCHEDULE' }));

		expect(screen.getByRole('alert').textContent).toBe('meetings.SCHEDULE_PAST');
		expect(mockScheduleMeeting).not.toHaveBeenCalled();
	});

	it("lists today's meetings with a way in, and cancels one once confirmed", async () => {
		const now = Date.now();
		mockScheduled.meetings = [
			{
				id: 'appointment-1',
				title: 'Daily standup',
				description: null,
				start: new Date(now - 5 * 60_000),
				end: new Date(now + 10 * 60_000),
				link: `https://app.ever.team${meetPathFor('Ever-Standup-AbCdEfGhIj', true)}`
			}
		];
		render(<MeetingsPage />);

		expect(screen.getByText('Daily standup')).toBeTruthy();
		expect(screen.getByText('meetings.LIVE')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'meetings.JOIN_MEETING_OF:{"title":"Daily standup"}' }));
		expect(mockPush).toHaveBeenCalledWith(meetPathFor('Ever-Standup-AbCdEfGhIj', true));

		// Delete, in the card's menu, cancels the meeting once confirmed
		fireEvent.click(screen.getByRole('button', { name: 'meetings.MEETING_ACTIONS_OF:{"title":"Daily standup"}' }));
		fireEvent.click(await screen.findByRole('menuitem', { name: 'common.DELETE' }));
		const confirm = await screen.findByRole('button', { name: 'meetings.CANCEL_MEETING' });
		await act(async () => {
			fireEvent.click(confirm);
		});

		await waitFor(() => expect(mockCancelMeeting).toHaveBeenCalledWith('appointment-1'));
	});

	it('draws each meeting with its time, its host and the way in: Join while it runs, Start before', () => {
		jest.useFakeTimers({ advanceTimers: true });
		try {
			jest.setSystemTime(new Date(2026, 10, 12, 10, 0));
			const link = (room: string) => `https://app.ever.team${meetPathFor(room, true)}`;
			mockScheduled.meetings = [
				{
					id: 'appointment-1',
					title: 'Daily standup',
					description: null,
					start: new Date(2026, 10, 12, 9, 48),
					end: new Date(2026, 10, 12, 10, 15),
					link: link('Ever-Standup-AbCdEfGhIj')
				},
				{
					id: 'appointment-2',
					title: 'Retro',
					description: null,
					start: new Date(2026, 10, 12, 16, 30),
					end: new Date(2026, 10, 12, 17, 0),
					link: link('Ever-Retro-AbCdEfGhIj')
				}
			];
			render(<MeetingsPage />);

			const [live, later] = screen.getAllByTestId('scheduled-meeting');
			expect(within(live).getByText('meetings.LIVE')).toBeTruthy();
			expect(within(live).getByText('meetings.STARTED_AGO:{"ago":"12 minutes ago"}')).toBeTruthy();
			expect(within(live).getByText('meetings.HOST:{"name":"Ruslan Konviser"}')).toBeTruthy();
			const join = within(live).getByRole('button', {
				name: 'meetings.JOIN_MEETING_OF:{"title":"Daily standup"}'
			});
			expect(join.textContent).toBe('meetings.JOIN');
			expect(within(later).getByText('meetings.TODAY')).toBeTruthy();
			expect(within(later).queryByText(/^meetings\.STARTED_AGO/)).toBeNull();

			fireEvent.click(within(later).getByRole('button', { name: 'meetings.START_MEETING_OF:{"title":"Retro"}' }));
			expect(mockPush).toHaveBeenCalledWith(meetPathFor('Ever-Retro-AbCdEfGhIj', true));
		} finally {
			jest.useRealTimers();
		}
	});

	it("starts a meeting, copies its invitation and its link from the card's menu", async () => {
		const writeText = jest.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		const start = new Date(Date.now() + 60 * 60_000);
		const link = `https://app.ever.team${meetPathFor('Ever-Retro-AbCdEfGhIj', true)}`;
		mockScheduled.meetings = [
			{
				id: 'appointment-4',
				title: 'Retro',
				description: null,
				start,
				end: new Date(start.getTime() + 1_800_000),
				link
			}
		];
		render(<MeetingsPage />);
		// Late in the evening the meeting is tomorrow's
		if (!screen.queryByText('Retro')) fireEvent.click(screen.getByRole('button', { name: 'meetings.NEXT_DAY' }));
		const openMenu = async () => {
			fireEvent.click(screen.getByRole('button', { name: 'meetings.MEETING_ACTIONS_OF:{"title":"Retro"}' }));
			return screen.findByRole('menu');
		};

		const menu = await openMenu();
		expect(
			within(menu)
				.getAllByRole('menuitem')
				.map((item) => item.textContent)
		).toEqual([
			'meetings.START_MEETING',
			'meetings.COPY_INVITATION',
			'meetings.COPY_LINK',
			'meetings.ADD_TO_CALENDAR',
			'common.EDIT',
			'common.DELETE'
		]);
		await act(async () => {
			fireEvent.click(within(menu).getByRole('menuitem', { name: 'meetings.COPY_INVITATION' }));
		});
		expect(writeText).toHaveBeenLastCalledWith(
			expect.stringMatching(/^meetings\.INVITATION_TEXT:\{"title":"Retro",/)
		);
		expect(writeText.mock.calls[0][0]).toContain(link);

		const copyLink = within(await openMenu()).getByRole('menuitem', { name: 'meetings.COPY_LINK' });
		await act(async () => {
			fireEvent.click(copyLink);
		});
		expect(writeText).toHaveBeenLastCalledWith(link);

		fireEvent.click(within(await openMenu()).getByRole('menuitem', { name: 'meetings.START_MEETING' }));
		expect(mockPush).toHaveBeenCalledWith(meetPathFor('Ever-Retro-AbCdEfGhIj', true));
	});

	it("moves a meeting from Edit in its menu, and renames it with its room's link", async () => {
		jest.useFakeTimers({ advanceTimers: true });
		try {
			jest.setSystemTime(new Date(2026, 10, 12, 9, 0));
			const link = `https://app.ever.team${meetingPathFor('Ever-Retro-AbCdEfGhIj', true, 'Retro')}`;
			mockScheduled.meetings = [
				{
					id: 'appointment-5',
					title: 'Retro',
					description: 'Notes',
					start: new Date(2026, 10, 12, 16, 0),
					end: new Date(2026, 10, 12, 16, 45),
					link
				}
			];
			render(<MeetingsPage />);
			fireEvent.click(screen.getByRole('button', { name: 'meetings.MEETING_ACTIONS_OF:{"title":"Retro"}' }));
			fireEvent.click(await screen.findByRole('menuitem', { name: 'common.EDIT' }));

			const title = (await screen.findByLabelText('meetings.FIELD_TITLE')) as HTMLInputElement;
			expect(screen.getByRole('dialog', { name: 'meetings.EDIT_TITLE' })).toBeTruthy();
			expect(title.value).toBe('Retro');
			expect((screen.getByLabelText('meetings.FIELD_DATE') as HTMLInputElement).value).toBe('2026-11-12');
			expect((screen.getByLabelText('meetings.FIELD_TIME') as HTMLInputElement).value).toBe('16:00');
			// The description stays as it is: Gauzy's update cannot empty it
			expect(screen.queryByLabelText('meetings.FIELD_DESCRIPTION')).toBeNull();
			fireEvent.change(title, { target: { value: 'Sprint retro' } });
			fireEvent.change(screen.getByLabelText('meetings.FIELD_TIME'), { target: { value: '17:30' } });
			await act(async () => {
				fireEvent.click(screen.getByRole('button', { name: 'common.SAVE_CHANGES' }));
			});

			expect(mockRescheduleMeeting).toHaveBeenCalledWith('appointment-5', {
				title: 'Sprint retro',
				start: new Date(2026, 10, 12, 17, 30),
				durationMinutes: 45,
				link: link.replace('title=Retro', 'title=Sprint%20retro')
			});
			await waitFor(() => expect(screen.queryByLabelText('meetings.FIELD_TITLE')).toBeNull());
		} finally {
			jest.useRealTimers();
		}
	});

	it('renames a meeting that already began without asking to move it', async () => {
		const start = new Date(Date.now() - 5 * 60_000);
		mockScheduled.meetings = [
			{
				id: 'appointment-6',
				title: 'Standup',
				description: null,
				start,
				end: new Date(Date.now() + 600_000),
				link: null
			}
		];
		render(<MeetingsPage />);
		fireEvent.click(screen.getByRole('button', { name: 'meetings.MEETING_ACTIONS_OF:{"title":"Standup"}' }));
		fireEvent.click(await screen.findByRole('menuitem', { name: 'common.EDIT' }));
		fireEvent.change(await screen.findByLabelText('meetings.FIELD_TITLE'), { target: { value: 'Daily standup' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'common.SAVE_CHANGES' }));
		});

		expect(screen.queryByRole('alert')).toBeNull();
		expect(mockRescheduleMeeting).toHaveBeenCalledWith(
			'appointment-6',
			expect.objectContaining({ title: 'Daily standup', link: null })
		);
		expect(mockRescheduleMeeting.mock.calls[0][1].start).toBe(start);
	});

	it('shows one day of the agenda at a time: the day after, the day before, and back to today', () => {
		const now = new Date();
		const tomorrowAtTen = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0);
		mockScheduled.meetings = [
			{
				id: 'appointment-2',
				title: 'Planning',
				description: null,
				start: tomorrowAtTen,
				end: new Date(tomorrowAtTen.getTime() + 30 * 60_000),
				link: `https://app.ever.team${meetPathFor('Ever-Planning-AbCdEfGhIj', true)}`
			}
		];
		render(<MeetingsPage />);
		expect(screen.queryByText('Planning')).toBeNull();
		expect(screen.getByText('meetings.NO_MEETINGS_TODAY')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'meetings.NEXT_DAY' }));
		expect(screen.getByRole('heading', { name: /^meetings\.DAY_LABEL:.*meetings\.TOMORROW/ })).toBeTruthy();
		expect(screen.getByText('Planning')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'meetings.NEXT_DAY' }));
		expect(screen.getByText('meetings.NO_MEETINGS_DAY')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'meetings.TODAY' }));
		expect(screen.getByRole('heading', { name: /^meetings\.DAY_LABEL:.*meetings\.TODAY/ })).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'meetings.PREVIOUS_DAY' }));
		expect(screen.getByRole('heading', { name: /^meetings\.DAY_LABEL:.*meetings\.YESTERDAY/ })).toBeTruthy();
		expect(screen.queryByText('Planning')).toBeNull();
	});

	it('jumps to any day picked in the month that opens from the agenda header', async () => {
		jest.useFakeTimers({ advanceTimers: true });
		try {
			jest.setSystemTime(new Date(2026, 10, 12, 9, 0));
			mockScheduled.meetings = [
				{
					id: 'appointment-3',
					title: 'Quarterly review',
					description: null,
					start: new Date(2026, 10, 20, 10, 0),
					end: new Date(2026, 10, 20, 11, 0),
					link: `https://app.ever.team${meetPathFor('Ever-Quarterly-AbCdEfGhIj', true)}`
				}
			];
			render(<MeetingsPage />);
			expect(screen.queryByText('Quarterly review')).toBeNull();

			fireEvent.click(screen.getByTestId('meetings-agenda-day-picker'));
			fireEvent.click(await screen.findByRole('gridcell', { name: '20' }));

			expect(screen.getByText('Quarterly review')).toBeTruthy();
			expect(screen.getByRole('heading', { name: 'Friday, November 20, 2026' })).toBeTruthy();
			await waitFor(() => expect(screen.queryByRole('gridcell', { name: '20' })).toBeNull());
		} finally {
			jest.useRealTimers();
		}
	});

	it('schedules on the day the agenda shows, and never on a day that has passed', async () => {
		const now = new Date();
		const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
		const pad = (value: number) => String(value).padStart(2, '0');
		render(<MeetingsPage />);

		fireEvent.click(screen.getByRole('button', { name: 'meetings.NEXT_DAY' }));
		fireEvent.click(screen.getByRole('button', { name: 'meetings.SCHEDULE_ON_DAY' }));

		const date = (await screen.findByLabelText('meetings.FIELD_DATE')) as HTMLInputElement;
		expect(date.value).toBe(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`);
		fireEvent.click(screen.getByRole('button', { name: 'common.CANCEL' }));

		fireEvent.click(screen.getByRole('button', { name: 'meetings.TODAY' }));
		fireEvent.click(screen.getByRole('button', { name: 'meetings.PREVIOUS_DAY' }));
		expect((screen.getByRole('button', { name: 'meetings.SCHEDULE_ON_DAY' }) as HTMLButtonElement).disabled).toBe(
			true
		);
	});

	it('keeps scheduling for people with an employee record, who own the appointments', () => {
		mockScheduled.canSchedule = false;
		render(<MeetingsPage />);

		expect((screen.getByTestId('meetings-schedule') as HTMLButtonElement).disabled).toBe(true);
		expect(screen.queryByText('meetings.AGENDA')).toBeNull();
		fireEvent.click(screen.getByTestId('meetings-new'));
		expect(mockPush).toHaveBeenCalled();
	});
});
