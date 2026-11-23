/** @jest-environment jsdom */
/**
 * A sign-out in one tab ends the session of every tab, and stops the running timer first. The other tab still shows
 * that run going on as it finds its session ended: the note it leaves for the sign-in page used to say the timer was
 * still running, and to sign in again to stop it (#5721).
 */
import { clearOwnSignOutMark, leaveOwnSignOutMark } from './own-sign-out-mark';
import {
	clearSessionEndedNotice,
	leaveSessionEndedNotice,
	parseSessionEndedNotice,
	storedSessionEndedNotice,
	witnessTimerAtSessionEnd
} from './session-ended-notice';

const RUN_THIS_TAB_SHOWS = { timeLogId: 'log-1', savedUntil: null };

function noteLeftAsTheSessionEnds() {
	leaveSessionEndedNotice();
	return parseSessionEndedNotice(storedSessionEndedNotice());
}

describe('the note of a session that ended while the tab showed a timer running', () => {
	let withdrawWitness: () => void;

	beforeEach(() => {
		withdrawWitness = witnessTimerAtSessionEnd(() => RUN_THIS_TAB_SHOWS);
	});

	afterEach(() => {
		withdrawWitness();
		clearSessionEndedNotice();
		clearOwnSignOutMark();
	});

	it("says nothing of the timer the person's sign-out in another tab stopped", () => {
		leaveOwnSignOutMark('log-1');

		const note = noteLeftAsTheSessionEnds();

		expect(note).not.toBeNull();
		expect(note?.timer).toBeUndefined();
	});

	it('keeps the timer of a session that ended by itself', () => {
		expect(noteLeftAsTheSessionEnds()?.timer).toEqual(RUN_THIS_TAB_SHOWS);
	});

	it('keeps the timer when the sign-out stopped another run, or none', () => {
		leaveOwnSignOutMark('log-0');
		expect(noteLeftAsTheSessionEnds()?.timer).toEqual(RUN_THIS_TAB_SHOWS);

		leaveOwnSignOutMark(null);
		expect(noteLeftAsTheSessionEnds()?.timer).toEqual(RUN_THIS_TAB_SHOWS);
	});
});
