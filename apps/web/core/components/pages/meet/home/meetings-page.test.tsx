/** @jest-environment jsdom */
import { TextDecoder, TextEncoder } from 'node:util';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { meetPathFor } from '@/core/lib/utils/collaboration';
import type { ScheduledMeeting } from '@/core/lib/utils/meetings';

// Room names are base64 of their UTF-8 bytes; jsdom has no TextEncoder of its own
Object.assign(globalThis, { TextEncoder, TextDecoder });

const mockPush = jest.fn();
const mockScheduleMeeting = jest.fn();
const mockCancelMeeting = jest.fn();
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
		isLoading: false,
		isError: false,
		refetch: jest.fn(),
		scheduleMeeting: mockScheduleMeeting,
		isScheduling: false,
		cancelMeeting: mockCancelMeeting,
		cancellingId: undefined
	})
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

		fireEvent.click(screen.getByRole('button', { name: 'meetings.CANCEL_MEETING_OF:{"title":"Daily standup"}' }));
		const confirm = await screen.findByRole('button', { name: 'meetings.CANCEL_MEETING' });
		await act(async () => {
			fireEvent.click(confirm);
		});

		await waitFor(() => expect(mockCancelMeeting).toHaveBeenCalledWith('appointment-1'));
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

	it('keeps scheduling for people with an employee record, who own the appointments', () => {
		mockScheduled.canSchedule = false;
		render(<MeetingsPage />);

		expect((screen.getByTestId('meetings-schedule') as HTMLButtonElement).disabled).toBe(true);
		expect(screen.queryByText('meetings.AGENDA')).toBeNull();
		fireEvent.click(screen.getByTestId('meetings-new'));
		expect(mockPush).toHaveBeenCalled();
	});
});
