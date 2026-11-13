/** @jest-environment jsdom */
/**
 * #5084: the notes field belongs to the timer the member sees. A run that timer does not show, one going on for
 * another team, brought its notes into the field: what the member typed next for the team in front of them was
 * tied to that run's entry, kept out of their next start and sent with the stop of that entry.
 */
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

import { notesToSendAtStart, notesToSendAtStop } from '@/core/lib/utils/timer/timer-notes';
import { activeTeamIdState, timerNotesState, timerStatusState } from '@/core/stores';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { useTimerNotes } from './use-timer-notes';

const TEAM_OF_RUN = 'team-1';
const OTHER_TEAM = 'team-2';
const RUN_LOG = { id: 'log-1', description: 'Fix the login page', organizationTeamId: TEAM_OF_RUN };
const RUN = { running: true, lastLog: RUN_LOG } as never as ITimerStatus;

/** The notes field while a timer runs for the first team, seen from the team given. */
function renderNotesIn(activeTeamId: string) {
	const store = createStore();
	store.set(activeTeamIdState, activeTeamId);
	store.set(timerStatusState, RUN);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const { result } = renderHook(() => useTimerNotes(), { wrapper });
	return { store, result };
}

describe('the notes field beside a running timer', () => {
	it('reads the notes of a run of the active team, as after a reload', () => {
		const { result } = renderNotesIn(TEAM_OF_RUN);

		expect(result.current.text).toBe('Fix the login page');
		expect(result.current.isRunning).toBe(true);
		expect(result.current.isReadOnly).toBe(false);
	});

	it('takes no notes from a run of another team, and keeps what is typed for the next start', () => {
		const { store, result } = renderNotesIn(OTHER_TEAM);

		expect(result.current.text).toBe('');
		expect(result.current.isRunning).toBe(false);

		act(() => {
			result.current.setText('Review the invoices');
		});

		const notes = store.get(timerNotesState);
		expect(notes).toEqual({ text: 'Review the invoices', timeLogId: null });
		expect(notesToSendAtStart(notes)).toBe('Review the invoices');
		expect(notesToSendAtStop(notes, RUN_LOG)).toBeUndefined();
	});

	it('reads the notes of that run once the member opens its team', () => {
		const { store, result } = renderNotesIn(OTHER_TEAM);
		expect(result.current.text).toBe('');

		act(() => {
			store.set(activeTeamIdState, TEAM_OF_RUN);
		});

		expect(result.current.text).toBe('Fix the login page');
		expect(result.current.isRunning).toBe(true);
	});

	it('keeps the notes of a running entry when the member opens another team, for the stop that ends it', () => {
		const { store, result } = renderNotesIn(TEAM_OF_RUN);
		act(() => {
			result.current.setText('Fix the login page, then the sign-up form');
		});

		act(() => {
			store.set(activeTeamIdState, OTHER_TEAM);
		});

		const notes = store.get(timerNotesState);
		expect(notes).toEqual({ text: 'Fix the login page, then the sign-up form', timeLogId: RUN_LOG.id });
		expect(notesToSendAtStop(notes, RUN_LOG)).toBe('Fix the login page, then the sign-up form');
		// The field shows them there without letting the other team's notes be edited, until the run's team opens again
		expect(result.current.isReadOnly).toBe(true);

		act(() => {
			store.set(activeTeamIdState, TEAM_OF_RUN);
		});

		expect(result.current.isReadOnly).toBe(false);
	});
});
