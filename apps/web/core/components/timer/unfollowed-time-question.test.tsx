/** @jest-environment jsdom */
/**
 * The question put to a person whose web timer ran for a few minutes without the app following it (#5123).
 */
import { act, fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) =>
		values ? `${key}(${Object.values(values).join(',')})` : key,
	useLocale: () => 'en-GB'
}));

import {
	askAboutUnfollowedTime,
	dropUnfollowedTimeQuestion,
	type UnfollowedTimeAnswer
} from '@/core/lib/utils/timer/unfollowed-time';
import { UnfollowedTimeQuestion } from './unfollowed-time-question';

const MINUTE = 60_000;
/** Five past two in the afternoon, on the computer's clock. */
const LAST_HEARTBEAT = new Date(2026, 10, 14, 14, 5).getTime();

/** The app asks about a run whose last heartbeat was at 14:05, seven minutes ago. */
function ask() {
	let ended: UnfollowedTimeAnswer | undefined;
	act(() => {
		void askAboutUnfollowedTime(
			{
				employeeId: 'employee-1',
				timeLogId: 'log-1',
				from: new Date(LAST_HEARTBEAT).toISOString(),
				until: LAST_HEARTBEAT + 7 * MINUTE
			},
			3 * MINUTE
		).then((answer) => {
			ended = answer;
		});
	});
	return () => ended;
}

/** Lets the answer reach the app. */
const settle = () =>
	act(async () => {
		await Promise.resolve();
	});

afterEach(() => {
	act(() => dropUnfollowedTimeQuestion());
});

describe('UnfollowedTimeQuestion', () => {
	it('shows nothing while the app has nothing to ask', () => {
		render(<UnfollowedTimeQuestion />);

		expect(screen.queryByRole('alertdialog')).toBeNull();
	});

	it('says from when to when the timer ran without the app, and offers to keep that time or to stop there', async () => {
		render(<UnfollowedTimeQuestion />);

		ask();

		expect(await screen.findByRole('alertdialog')).toBeTruthy();
		expect(screen.getByText('timer.unfollowed.TITLE')).toBeTruthy();
		expect(screen.getByText('timer.unfollowed.TEXT(14:05,14:12)')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'timer.unfollowed.KEEP' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'timer.unfollowed.STOP(14:05)' })).toBeTruthy();
	});

	it('keeps the time when the person says so, and closes', async () => {
		render(<UnfollowedTimeQuestion />);
		const answer = ask();

		fireEvent.click(await screen.findByRole('button', { name: 'timer.unfollowed.KEEP' }));
		await settle();

		expect(answer()).toBe('keep');
		expect(screen.queryByRole('alertdialog')).toBeNull();
	});

	it('stops the run at its last heartbeat when the person says so, and closes', async () => {
		render(<UnfollowedTimeQuestion />);
		const answer = ask();

		fireEvent.click(await screen.findByRole('button', { name: 'timer.unfollowed.STOP(14:05)' }));
		await settle();

		expect(answer()).toBe('stop');
		expect(screen.queryByRole('alertdialog')).toBeNull();
	});

	it('stays open on Escape, which is not an answer', async () => {
		render(<UnfollowedTimeQuestion />);
		const answer = ask();
		const dialog = await screen.findByRole('alertdialog');

		fireEvent.keyDown(dialog, { key: 'Escape' });
		await settle();

		expect(answer()).toBeUndefined();
		expect(screen.getByRole('alertdialog')).toBeTruthy();
	});

	it('closes when the question ends elsewhere: answered in another tab, or left unanswered until the delay', async () => {
		render(<UnfollowedTimeQuestion />);
		ask();
		await screen.findByRole('alertdialog');

		act(() => dropUnfollowedTimeQuestion());

		expect(screen.queryByRole('alertdialog')).toBeNull();
	});
});
