import { TEAM_SHELL_REFRESH_INTERVAL, teamDetailRefreshOf } from './team-detail-refresh';

describe('teamDetailRefreshOf', () => {
	const base = { autoRefreshEnabled: true, teamPresenceViewActive: true, live: false, presenceInterval: 25_000 };

	it('reads a shown team view faster, and again on tab return', () => {
		expect(teamDetailRefreshOf(base)).toEqual({ interval: 25_000, onWindowFocus: true });
	});

	it('leaves presence to the live channel while it is connected', () => {
		expect(teamDetailRefreshOf({ ...base, live: true })).toEqual({ interval: TEAM_SHELL_REFRESH_INTERVAL, onWindowFocus: true });
	});

	it('keeps the shell minute without a team view, and nothing without auto refresh', () => {
		expect(teamDetailRefreshOf({ ...base, teamPresenceViewActive: false })).toEqual({ interval: TEAM_SHELL_REFRESH_INTERVAL, onWindowFocus: false });
		expect(teamDetailRefreshOf({ ...base, autoRefreshEnabled: false })).toEqual({ interval: false, onWindowFocus: false });
	});
});
