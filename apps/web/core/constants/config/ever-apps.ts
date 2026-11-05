type EverAppId = 'gauzy' | 'teams' | 'works' | 'platform' | 'demand' | 'rec' | 'traduora';

export interface EverApp {
	id: EverAppId;
	shortName: string;
	logo: string;
	url: string;
	domain: string;
}

const CURRENT_EVER_APP_ID: EverAppId = 'teams';

// Product names and URLs come from ever-website (lib/billing/catalog.json and the account-deletion data). Same order
// and logos as the Gauzy app switcher (ever-gauzy packages/ui-core/common/src/lib/constants/ever-apps.constants.ts):
// keep both lists in sync. Works ships the Teams tile and Demand the Platform tile today, so those pairs look alike.
export const EVER_APPS: ReadonlyArray<EverApp> = [
	{
		id: 'platform',
		shortName: 'Platform',
		logo: '/assets/ever-apps/platform.svg',
		url: 'https://ever.co',
		domain: 'ever.co'
	},
	{
		id: 'works',
		shortName: 'Works',
		logo: '/assets/ever-apps/works.svg',
		url: 'https://app.ever.works',
		domain: 'app.ever.works'
	},
	{
		id: 'teams',
		shortName: 'Teams',
		logo: '/assets/ever-apps/teams.svg',
		url: 'https://app.ever.team',
		domain: 'app.ever.team'
	},
	{
		id: 'gauzy',
		shortName: 'Gauzy',
		logo: '/assets/ever-apps/gauzy.svg',
		url: 'https://app.gauzy.co',
		domain: 'app.gauzy.co'
	},
	{
		id: 'demand',
		shortName: 'Demand',
		logo: '/assets/ever-apps/demand.svg',
		url: 'https://everdemand.co',
		domain: 'everdemand.co'
	},
	{ id: 'rec', shortName: 'Rec', logo: '/assets/ever-apps/rec.svg', url: 'https://rec.so', domain: 'rec.so' },
	{
		id: 'traduora',
		shortName: 'Traduora',
		logo: '/assets/ever-apps/traduora.png',
		url: 'https://traduora.co',
		domain: 'traduora.co'
	}
];

export function isCurrentEverApp(app: EverApp) {
	return app.id === CURRENT_EVER_APP_ID;
}
