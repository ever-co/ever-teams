type EverAppId = 'gauzy' | 'teams' | 'works' | 'platform' | 'demand' | 'rec' | 'traduora';

export interface EverApp {
	id: EverAppId;
	shortName: string;
	monogram: string;
	url: string;
	domain: string;
}

const CURRENT_EVER_APP_ID: EverAppId = 'teams';

// Product names and URLs come from ever-website (lib/billing/catalog.json and the account-deletion data). Same order
// and monograms as the Gauzy app switcher (ever-gauzy packages/ui-core/common/src/lib/constants/ever-apps.constants.ts):
// keep both lists in sync. Traduora keeps two letters so its tile does not read as a second Teams.
export const EVER_APPS: ReadonlyArray<EverApp> = [
	{ id: 'platform', shortName: 'Platform', monogram: 'P', url: 'https://ever.co', domain: 'ever.co' },
	{ id: 'works', shortName: 'Works', monogram: 'W', url: 'https://app.ever.works', domain: 'app.ever.works' },
	{ id: 'teams', shortName: 'Teams', monogram: 'T', url: 'https://app.ever.team', domain: 'app.ever.team' },
	{ id: 'gauzy', shortName: 'Gauzy', monogram: 'G', url: 'https://app.gauzy.co', domain: 'app.gauzy.co' },
	{ id: 'demand', shortName: 'Demand', monogram: 'D', url: 'https://everdemand.co', domain: 'everdemand.co' },
	{ id: 'rec', shortName: 'Rec', monogram: 'R', url: 'https://rec.so', domain: 'rec.so' },
	{ id: 'traduora', shortName: 'Traduora', monogram: 'Tr', url: 'https://traduora.co', domain: 'traduora.co' }
];

export function isCurrentEverApp(app: EverApp) {
	return app.id === CURRENT_EVER_APP_ID;
}
