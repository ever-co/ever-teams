export type MenuEntry = 'work' | 'team' | 'tasks' | 'settings';

/** The menu's row of the screen on show, from its address: Team is `/`, as on the web. */
export function menuEntryOf(pathname: string): MenuEntry | undefined {
	if (pathname === '/timer') {
		return 'work';
	}
	if (pathname === '/') {
		return 'team';
	}
	if (pathname.startsWith('/profile/')) {
		return 'tasks';
	}
	if (pathname.startsWith('/settings')) {
		return 'settings';
	}
	return undefined;
}
