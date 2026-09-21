/**
 * Gauzy serves the task status / priority / size icons next to its API (`<origin>/public/…`), and the
 * two places that build those URLs read the origin the server published to the BROWSER. A deployment
 * that publishes none — the documented API-proxy mode — used to get `https://api.ever.team` in the
 * kanban (a self-hosted instance calling Ever's production API) and a literal `undefined/public/…` in
 * the icon picker. Both now go through this app instead.
 */
// The default argument reads this lazily, and apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL,
// which would otherwise decide the proxy-mode cases.
jest.mock('@/core/constants/config/constants', () => ({ GAUZY_API_BASE_SERVER_URL: { value: undefined } }));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { publicAssetUrl, PUBLIC_ASSET_PROXY_PATH } from './public-asset-url';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };
const ICON = 'ever-icons/task-statuses/open.svg';

beforeEach(() => {
	publishedApiOrigin.value = undefined;
});

describe('publicAssetUrl', () => {
	it('uses the API origin this deployment published to the browser', () => {
		expect(publicAssetUrl(ICON, 'https://api.selfhost.example')).toBe(
			'https://api.selfhost.example/public/ever-icons/task-statuses/open.svg'
		);
	});

	it('joins origin and path with exactly one slash', () => {
		expect(publicAssetUrl('/ever-icons/x.svg', 'https://api.selfhost.example///')).toBe(
			'https://api.selfhost.example/public/ever-icons/x.svg'
		);
	});

	it('reads the published origin through the lazy getter when the caller passes none', () => {
		publishedApiOrigin.value = 'https://api.selfhost.example';

		expect(publicAssetUrl(ICON)).toBe('https://api.selfhost.example/public/ever-icons/task-statuses/open.svg');
	});

	it.each([undefined, '', '   '])('goes through this app when the origin is %p', (origin) => {
		expect(publicAssetUrl(ICON, origin)).toBe(`${PUBLIC_ASSET_PROXY_PATH}/ever-icons/task-statuses/open.svg`);
	});

	it.each([
		'https://api.selfhost.example/public/a.svg',
		'http://minio.lan:9000/a.png',
		'data:image/svg+xml,<svg/>'
	])('returns %s untouched', (absolute) => {
		expect(publicAssetUrl(absolute)).toBe(absolute);
		expect(publicAssetUrl(absolute, 'https://api.selfhost.example')).toBe(absolute);
	});

	it.each([undefined, null, '', '   '])('returns an empty string for %p', (path) => {
		expect(publicAssetUrl(path)).toBe('');
	});

	it('never falls back to an Ever host, in either mode', () => {
		const results = [
			publicAssetUrl(ICON),
			publicAssetUrl(ICON, ''),
			publicAssetUrl('/ever-icons/x.svg'),
			publicAssetUrl(ICON, 'https://api.selfhost.example')
		];

		for (const result of results) expect(result).not.toContain('ever.team');
	});
});
