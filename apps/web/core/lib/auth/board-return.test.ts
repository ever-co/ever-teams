/**
 * @jest-environment jsdom
 */
/**
 * A sign-in the Board app started keeps the Board address for this tab until the sign-in ends, and gives it back once:
 * only an address on the trusted Board origin, only for 30 minutes, the current page's address first. A value
 * someone wrote into the tab's storage is checked again before it is used.
 */
import { rememberBoardReturn, takeBoardReturn } from './board-return';

const GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
const ORIGINAL_ENV = process.env;
// The storage entry board-return.ts writes (white box: the tests below tamper with it)
const STORAGE_KEY = 'ever-teams:board-return';
const BOARD_ADDRESS = 'https://board.ever.team/?live=true&origin=https%3A%2F%2Fdemo.ever.team#room=abc,key';
const NOW = Date.UTC(2026, 10, 11, 12, 0, 0);

function openPage(path: string) {
	window.history.replaceState(null, '', path);
}

function signInPageFor(boardAddress: string) {
	return `/auth/passcode?redirect=${encodeURIComponent(boardAddress)}`;
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	// The server injects the runtime env in the browser; the tests set its content.
	(globalThis as Record<string, unknown>)[GLOBAL] = { NEXT_PUBLIC_BOARD_APP_DOMAIN: 'https://board.ever.team' };
	window.sessionStorage.clear();
	openPage('/auth/passcode');
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

describe('rememberBoardReturn and takeBoardReturn', () => {
	it('keep the Board address of the first auth page and give it back once at the end of the sign-in', () => {
		rememberBoardReturn(`?redirect=${encodeURIComponent(BOARD_ADDRESS)}`, NOW);
		openPage('/auth/password');

		expect(takeBoardReturn(NOW + 60_000)).toBe(BOARD_ADDRESS);
		expect(takeBoardReturn(NOW + 60_000)).toBeNull();
	});

	it('give back the address of the current page first, and drop the one kept', () => {
		rememberBoardReturn(`?redirect=${encodeURIComponent('https://board.ever.team/old')}`, NOW);
		openPage(signInPageFor('https://board.ever.team/new'));

		expect(takeBoardReturn(NOW)).toBe('https://board.ever.team/new');
		openPage('/auth/passcode');
		expect(takeBoardReturn(NOW)).toBeNull();
	});

	it('change nothing for a page without the parameter', () => {
		rememberBoardReturn(`?redirect=${encodeURIComponent(BOARD_ADDRESS)}`, NOW);
		rememberBoardReturn('?method=password&email=ada%40example.com', NOW);

		expect(takeBoardReturn(NOW)).toBe(BOARD_ADDRESS);
	});

	it('drop the kept address when a later auth page carries an address that is not the Board', () => {
		rememberBoardReturn(`?redirect=${encodeURIComponent(BOARD_ADDRESS)}`, NOW);
		rememberBoardReturn(`?redirect=${encodeURIComponent('https://evil.example/')}`, NOW);

		expect(takeBoardReturn(NOW)).toBeNull();
	});

	it.each([
		'https://evil.example/',
		'//evil.example/',
		'javascript:alert(1)',
		'https://board.ever.team@evil.example/',
		'https://board.ever.team.evil.example/',
		'http://board.ever.team/'
	])('never give back %s, from the page or kept', (address) => {
		rememberBoardReturn(`?redirect=${encodeURIComponent(address)}`, NOW);
		expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();

		openPage(signInPageFor(address));
		expect(takeBoardReturn(NOW)).toBeNull();
	});

	it('check a kept address again before giving it back', () => {
		window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ url: 'https://evil.example/', savedAt: NOW }));

		expect(takeBoardReturn(NOW)).toBeNull();
		expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('give back nothing once the Board is no longer configured', () => {
		rememberBoardReturn(`?redirect=${encodeURIComponent(BOARD_ADDRESS)}`, NOW);
		(globalThis as Record<string, unknown>)[GLOBAL] = { NEXT_PUBLIC_BOARD_APP_DOMAIN: '' };
		delete process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN;

		expect(takeBoardReturn(NOW)).toBeNull();
	});

	it.each([
		['after 30 minutes', NOW + 30 * 60_000 + 1],
		['saved in the future', NOW - 1]
	])('give back nothing %s', (_label, takenAt) => {
		rememberBoardReturn(`?redirect=${encodeURIComponent(BOARD_ADDRESS)}`, NOW);

		expect(takeBoardReturn(takenAt)).toBeNull();
	});

	it.each(['not json', '{"url":"https://board.ever.team/"}', '{"savedAt":1}', 'null', '42'])(
		'give back nothing for the stored value %s',
		(stored) => {
			window.sessionStorage.setItem(STORAGE_KEY, stored);

			expect(takeBoardReturn(NOW)).toBeNull();
		}
	);

	it('still give back the address of the current page when the browser refuses the storage', () => {
		const storage = jest.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
			throw new DOMException('Access denied', 'SecurityError');
		});
		try {
			expect(() => rememberBoardReturn(`?redirect=${encodeURIComponent(BOARD_ADDRESS)}`, NOW)).not.toThrow();
			openPage(signInPageFor(BOARD_ADDRESS));

			expect(takeBoardReturn(NOW)).toBe(BOARD_ADDRESS);
			expect(storage).toHaveBeenCalled();
		} finally {
			storage.mockRestore();
		}
	});
});
