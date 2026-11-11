/**
 * The Board app's address names the Ever Teams origin it was opened from, so the Board signs the person in on that
 * deployment and never on a default one.
 */
import { BOARD_EVER_TEAMS_ORIGIN_PARAM, boardAppUrl, withEverTeamsOrigin } from './board-app';

describe('boardAppUrl', () => {
	it('names the Ever Teams origin the Board is opened from', () => {
		const url = boardAppUrl('https://board.ever.team', 'https://demo.ever.team');

		expect(url?.origin).toBe('https://board.ever.team');
		expect(url?.searchParams.get(BOARD_EVER_TEAMS_ORIGIN_PARAM)).toBe('https://demo.ever.team');
	});

	it('names the origin only, never the page the person is on', () => {
		const url = boardAppUrl('https://board.ever.team', 'https://app.ever.team/settings/team?tab=members#danger');

		expect(url?.searchParams.get(BOARD_EVER_TEAMS_ORIGIN_PARAM)).toBe('https://app.ever.team');
	});

	it('keeps the path and query of the setting', () => {
		const url = boardAppUrl(' https://teams.example.com/board/?theme=dark ', 'http://localhost:3030');

		expect(url?.toString()).toBe(
			'https://teams.example.com/board/?theme=dark&origin=http%3A%2F%2Flocalhost%3A3030'
		);
	});

	it.each([undefined, null, '', 'null', 'about:blank', 'app://ever-teams', 'not a url'])(
		'adds no origin for %p',
		(everTeamsOrigin) => {
			const url = boardAppUrl('https://board.ever.team', everTeamsOrigin);

			expect(url?.toString()).toBe('https://board.ever.team/');
		}
	);

	it.each([undefined, null, '', ' ', 'board.ever.team', 'javascript:alert(1)', 'ftp://board.ever.team'])(
		'is null when NEXT_PUBLIC_BOARD_APP_DOMAIN is %p',
		(boardAppDomain) => {
			expect(boardAppUrl(boardAppDomain, 'https://app.ever.team')).toBeNull();
		}
	);

	it('withEverTeamsOrigin adds the origin to an address built elsewhere, before its fragment', () => {
		const url = withEverTeamsOrigin(new URL('https://board.ever.team/#json=id,key'), 'https://stage.ever.team');

		expect(url.toString()).toBe('https://board.ever.team/?origin=https%3A%2F%2Fstage.ever.team#json=id,key');
	});
});
