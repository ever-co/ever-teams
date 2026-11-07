/** The shell's own refresh of the team detail (timers of other clients, plans): once a minute. */
export const TEAM_SHELL_REFRESH_INTERVAL = 60_000;

/**
 * How often the active team's detail is read again. Off without auto refresh. While a team view is shown it is read
 * faster (`presenceInterval`) and again on tab return — unless the live channel is connected: it announces presence
 * changes as they happen (each refetches the teams), so the shell's minute is enough for what it does not carry.
 */
export function teamDetailRefreshOf(options: {
	autoRefreshEnabled: boolean;
	teamPresenceViewActive: boolean;
	live: boolean;
	presenceInterval: number;
}): { interval: number | false; onWindowFocus: boolean } {
	const { autoRefreshEnabled, teamPresenceViewActive, live, presenceInterval } = options;
	if (!autoRefreshEnabled) return { interval: false, onWindowFocus: false };
	if (!teamPresenceViewActive) return { interval: TEAM_SHELL_REFRESH_INTERVAL, onWindowFocus: false };
	return { interval: live ? TEAM_SHELL_REFRESH_INTERVAL : presenceInterval, onWindowFocus: true };
}
