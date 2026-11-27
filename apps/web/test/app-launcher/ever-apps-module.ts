/**
 * A stand-in for `@/core/constants/config/ever-apps` in the App Launcher's component tests: the apps a deployment
 * lists, linked to example hosts, Ever Teams as the app you are in, and an app `soon` without a link. Used from a
 * `jest.mock` factory (`jest.requireActual('@/test/app-launcher/ever-apps-module').everAppsModule(...)`), so one
 * definition serves the panel and the rail.
 */
type AppSpec = readonly [id: string, name: string, status?: 'available' | 'beta' | 'soon'];

function everApp([id, name, status = 'available']: AppSpec) {
	const isLinked = id !== 'teams' && status !== 'soon';
	return {
		id,
		name,
		lineKey: `switchers.APP_LINE_${id.toUpperCase()}`,
		logo: `/assets/ever-apps/${id}.svg`,
		url: isLinked ? `https://${id}.example.com/` : '',
		domain: isLinked ? `${id}.example.com` : '',
		status
	};
}

/**
 * `addUrlOf` is read each time a component renders, never while the factory runs: `jest.mock` is hoisted above the
 * test's own variables, so a test keeps its deployment in a `mock…` variable and changes it per case.
 */
export function everAppsModule(apps: ReadonlyArray<AppSpec>, addUrlOf: () => string) {
	return {
		HAS_EVER_APP_SWITCHER: true,
		EVER_APPS: apps.map(everApp),
		get EVER_APP_ADD_URL() {
			return addUrlOf();
		},
		isCurrentEverApp: (entry: { id: string }) => entry.id === 'teams'
	};
}
