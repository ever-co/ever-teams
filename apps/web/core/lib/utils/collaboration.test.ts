/**
 * The whiteboard target of the collaborate dialog and the team's board button: the external board app, in live mode
 * with the picked people, naming the Ever Teams origin it is opened from (the board signs the person in on that
 * deployment, never on a default one); the in-app board when nobody is picked or no usable board app is configured.
 */
import { boardTargetFor } from './collaboration';

const MEMBERS = ['member-1', 'member-2'];

describe('boardTargetFor', () => {
	it('opens the board app live, with the picked people and the origin it is opened from', () => {
		const target = boardTargetFor(MEMBERS, 'https://board.ever.team', 'https://demo.ever.team');
		const url = new URL(target.href);

		expect(target.isExternal).toBe(true);
		expect(url.origin).toBe('https://board.ever.team');
		expect(url.searchParams.get('live')).toBe('true');
		expect(atob(url.searchParams.get('members') ?? '')).toBe('member-1,member-2');
		expect(url.searchParams.get('origin')).toBe('https://demo.ever.team');
	});

	it('names each deployment its own origin, never a fixed one', () => {
		const origins = ['https://app.ever.team', 'https://stage.ever.team', 'http://localhost:3030'].map((origin) =>
			new URL(boardTargetFor(MEMBERS, 'https://board.ever.team', origin).href).searchParams.get('origin')
		);

		expect(origins).toEqual(['https://app.ever.team', 'https://stage.ever.team', 'http://localhost:3030']);
	});

	it('opens the board app without an origin when the page has none to name', () => {
		const target = boardTargetFor(MEMBERS, 'https://board.ever.team', '');

		expect(target.isExternal).toBe(true);
		expect(new URL(target.href).searchParams.has('origin')).toBe(false);
	});

	it('opens the in-app board when nobody is picked', () => {
		expect(boardTargetFor([], 'https://board.ever.team', 'https://app.ever.team')).toEqual({
			href: '/board',
			isExternal: false
		});
	});

	it.each([undefined, null, '', 'board.ever.team', 'javascript:alert(1)'])(
		'opens the in-app board when the board app setting is %p',
		(boardAppDomain) => {
			expect(boardTargetFor(MEMBERS, boardAppDomain, 'https://app.ever.team')).toEqual({
				href: '/board',
				isExternal: false
			});
		}
	);
});
