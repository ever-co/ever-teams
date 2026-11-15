/** @jest-environment jsdom */
/**
 * The Keeps whose writing is not over (#5123): kept where every tab of the browser, and the next load of the page,
 * find them, so the rest is written once, whichever tab writes it.
 */
import { forgetOwedKeep, oweKeep, type OwedKeep, owedKeepNow, owedKeepsOf } from './owed-keep';

const HOUR = 60 * 60_000;
const KEPT_AT = Date.parse('2026-11-15T10:00:00.000Z');

function owedKeep(members: Partial<OwedKeep> = {}): OwedKeep {
	return {
		employeeId: 'employee-1',
		timeLogId: 'log-1',
		heartbeat: Date.parse('2026-11-15T09:50:00.000Z'),
		fromMs: Date.parse('2026-11-15T09:50:00.000Z'),
		toMs: Date.parse('2026-11-15T09:57:00.000Z'),
		apiOffsetMs: 0,
		writtenAtMs: Date.parse('2026-11-15T09:57:00.000Z'),
		keptAt: KEPT_AT,
		...members
	};
}

afterEach(() => {
	window.localStorage.clear();
	jest.restoreAllMocks();
});

describe('a Keep whose writing is not over', () => {
	it('is found by another tab, or the next load of the page, with where its writing stands', () => {
		const keep = owedKeep();
		oweKeep(keep);
		oweKeep({ ...keep, fromMs: keep.fromMs + 10 * 60_000 });

		expect(owedKeepNow(keep)).toEqual({ ...keep, fromMs: keep.fromMs + 10 * 60_000 });
		expect(owedKeepsOf('employee-1', KEPT_AT)).toEqual([{ ...keep, fromMs: keep.fromMs + 10 * 60_000 }]);
	});

	it('is gone for every tab once it is written', () => {
		const keep = owedKeep();
		oweKeep(keep);

		forgetOwedKeep(keep);

		expect(owedKeepNow(keep)).toBeNull();
		expect(owedKeepsOf('employee-1', KEPT_AT)).toEqual([]);
	});

	it('is owed per run and heartbeat: a later Keep of the same run does not take its place', () => {
		const first = owedKeep();
		const later = owedKeep({ heartbeat: first.heartbeat + HOUR, keptAt: KEPT_AT + 1 });
		oweKeep(later);
		oweKeep(first);

		expect(owedKeepsOf('employee-1', KEPT_AT + 1)).toEqual([first, later]);
	});

	it("is the employee's own: another person signed in on this browser owes nothing", () => {
		oweKeep(owedKeep());

		expect(owedKeepsOf('employee-2', KEPT_AT)).toEqual([]);
	});

	it('is forgotten after a day', () => {
		const keep = owedKeep();
		oweKeep(keep);

		expect(owedKeepsOf('employee-1', KEPT_AT + 24 * HOUR + 1)).toEqual([]);
		expect(owedKeepNow(keep)).toBeNull();
	});

	it('ignores what cannot be read', () => {
		window.localStorage.setItem('ever-teams.timer.owed-keep.log-1@1', 'not json');
		window.localStorage.setItem('ever-teams.timer.owed-keep.log-1@2', JSON.stringify({ timeLogId: 'log-1' }));

		expect(owedKeepsOf('employee-1', KEPT_AT)).toEqual([]);
	});

	it('leaves no stale record for another tab when the storage refuses where its writing stands', () => {
		const keep = owedKeep();
		oweKeep(keep);
		jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});
		const written = { ...keep, fromMs: keep.fromMs + 3 * 60_000 };

		oweKeep(written);

		// Read from the record left before, another tab or the next load would write that slot again
		jest.restoreAllMocks();
		expect(window.localStorage.getItem(`ever-teams.timer.owed-keep.log-1@${keep.heartbeat}`)).toBeNull();
		expect(owedKeepNow(keep)).toEqual(written);
		expect(owedKeepsOf('employee-1', KEPT_AT)).toEqual([written]);
		forgetOwedKeep(keep);
	});

	it('stays in the page when the browser blocks its storage', () => {
		jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});
		const keep = owedKeep();

		oweKeep(keep);

		expect(owedKeepNow(keep)).toEqual(keep);
		expect(owedKeepsOf('employee-1', KEPT_AT)).toEqual([keep]);
		forgetOwedKeep(keep);
		expect(owedKeepNow(keep)).toBeNull();
	});
});
