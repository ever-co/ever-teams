let appShell: string | undefined;

/**
 * Stands in for src/navigation/next-shell-build in a test: NEXT_SHELL_BUILD reads the build the test names with
 * runAsBuild, at each use, where the real module reads EXPO_PUBLIC_APP_SHELL once when the build is made.
 * In a test file: jest.mock('<path to>/next-shell-build', () => jest.requireActual('<path to>/test/app-shell').nextShellBuildStandIn)
 */
export const nextShellBuildStandIn = {
	get NEXT_SHELL_BUILD(): boolean {
		return appShell === 'next';
	}
};

/** The build the next code runs as: 'next' for the new app's builds, undefined for the app people install. */
export function runAsBuild(value: 'next' | undefined): void {
	appShell = value;
}
