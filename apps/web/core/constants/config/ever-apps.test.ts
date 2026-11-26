/**
 * The App Launcher links only what the deployment lists in NEXT_PUBLIC_EVER_APP_LINKS. Unset, it links nothing and
 * stays hidden, so a self-hosted or rebranded deployment never sends its users to Ever's hosted apps.
 */
type EverAppsModule = typeof import('./ever-apps');

const LINKS_VARIABLE = 'NEXT_PUBLIC_EVER_APP_LINKS';

/** ever-apps reads the variable once, when it loads: each case loads a fresh copy with its own value. */
async function loadWithLinks(links: string | undefined): Promise<EverAppsModule> {
	const previous = process.env[LINKS_VARIABLE];
	if (links === undefined) {
		delete process.env[LINKS_VARIABLE];
	} else {
		process.env[LINKS_VARIABLE] = links;
	}
	let loaded: EverAppsModule | undefined;
	try {
		await jest.isolateModulesAsync(async () => {
			loaded = await import('./ever-apps');
		});
	} finally {
		if (previous === undefined) {
			delete process.env[LINKS_VARIABLE];
		} else {
			process.env[LINKS_VARIABLE] = previous;
		}
	}
	return loaded as EverAppsModule;
}

function linksOf(apps: EverAppsModule['EVER_APPS']) {
	return apps.map(({ id, url, domain }) => ({ id, url, domain }));
}

describe('the apps of the App Launcher', () => {
	it('lists no app and hides the switcher when the deployment names no link', async () => {
		const { EVER_APPS, HAS_EVER_APP_SWITCHER } = await loadWithLinks(undefined);

		expect(HAS_EVER_APP_SWITCHER).toBe(false);
		expect(EVER_APPS).toEqual([]);
	});

	it('hides the switcher when the only link is to this app', async () => {
		const { EVER_APPS, HAS_EVER_APP_SWITCHER } = await loadWithLinks('teams=https://teams.example.com');

		expect(HAS_EVER_APP_SWITCHER).toBe(false);
		expect(EVER_APPS).toEqual([]);
	});

	it('lists the linked apps in the shared order, this app even without a link, and Ever Demand as coming soon', async () => {
		const { EVER_APPS, HAS_EVER_APP_SWITCHER } = await loadWithLinks(
			'gauzy=https://gauzy.example.com, works = https://works.example.com/'
		);

		expect(HAS_EVER_APP_SWITCHER).toBe(true);
		expect(linksOf(EVER_APPS)).toEqual([
			{ id: 'works', url: 'https://works.example.com/', domain: 'works.example.com' },
			{ id: 'teams', url: '', domain: '' },
			{ id: 'gauzy', url: 'https://gauzy.example.com/', domain: 'gauzy.example.com' },
			{ id: 'demand', url: '', domain: '' }
		]);
		expect(EVER_APPS.find(({ id }) => id === 'demand')?.status).toBe('soon');
	});

	it('names every app as the other Ever apps do, in the order of the shared shell', async () => {
		const { EVER_APPS } = await loadWithLinks(
			[
				'demand=https://demand.example.com',
				'traduora=https://traduora.example.com',
				'rec=https://rec.example.com',
				'gauzy=https://gauzy.example.com',
				'works=https://works.example.com',
				'platform=https://platform.example.com'
			].join(',')
		);

		expect(EVER_APPS.map(({ name }) => name)).toEqual([
			'Ever Platform',
			'Ever Works',
			'Ever Teams',
			'Ever Gauzy',
			'Ever Rec',
			'Ever Traduora',
			'Ever Demand'
		]);
		expect(EVER_APPS.find(({ id }) => id === 'demand')?.url).toBe('https://demand.example.com/');
	});

	it('ignores unknown ids, entries without a link and links that are not http(s)', async () => {
		const { EVER_APPS } = await loadWithLinks(
			[
				'unknown=https://unknown.example.com',
				'rec',
				'=https://nameless.example.com',
				'demand=javascript:void(0)',
				'rec=ftp://rec.example.com',
				'works=not a link',
				'platform=https://platform.example.com'
			].join(',')
		);

		expect(EVER_APPS.map(({ id }) => id)).toEqual(['platform', 'teams', 'demand']);
	});
});
