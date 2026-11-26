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

describe('the apps of the app switcher', () => {
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

	it('lists the linked apps in the switcher order, and this app even without a link', async () => {
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
				'tech=https://tech.example.com',
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
			'Ever Demand',
			'Ever Tech'
		]);
		expect(EVER_APPS.find(({ id }) => id === 'demand')?.url).toBe('https://demand.example.com/');
		expect(EVER_APPS.find(({ id }) => id === 'tech')?.url).toBe('https://tech.example.com/');
	});

	it('gives every app its own translated line, named after its id', async () => {
		const { EVER_APPS } = await loadWithLinks(
			['platform', 'works', 'gauzy', 'rec', 'traduora', 'demand', 'tech']
				.map((id) => `${id}=https://${id}.example.com`)
				.join(',')
		);

		expect(EVER_APPS.map(({ id, lineKey }) => ({ id, lineKey }))).toEqual(
			['platform', 'works', 'teams', 'gauzy', 'rec', 'traduora', 'demand', 'tech'].map((id) => ({
				id,
				lineKey: `switchers.APP_LINE_${id.toUpperCase()}`
			}))
		);
		expect(EVER_APPS.find(({ id }) => id === 'tech')?.logo).toBe('/assets/ever-apps/tech.svg');
	});

	it('lists Ever Demand as coming soon only while the deployment gives it no link', async () => {
		const withoutLink = await loadWithLinks('works=https://works.example.com');
		const withLink = await loadWithLinks('works=https://works.example.com,demand=https://demand.example.com');

		expect(withoutLink.EVER_APPS.find(({ id }) => id === 'demand')?.status).toBe('soon');
		expect(withLink.EVER_APPS.find(({ id }) => id === 'demand')?.status).toBe('available');
	});

	it('leads "+ Add" to the add page of the linked Ever Platform, whatever path its link has', async () => {
		const { EVER_APP_ADD_URL } = await loadWithLinks(
			'platform=https://platform.example.com/o/acme,works=https://works.example.com'
		);

		expect(EVER_APP_ADD_URL).toBe('https://platform.example.com/apps?add=app');
	});

	it('has no "+ Add" without a link to Ever Platform, or without the launcher', async () => {
		const withoutPlatform = await loadWithLinks('works=https://works.example.com');
		const withoutLauncher = await loadWithLinks(undefined);

		expect(withoutPlatform.EVER_APP_ADD_URL).toBe('');
		expect(withoutLauncher.EVER_APP_ADD_URL).toBe('');
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
