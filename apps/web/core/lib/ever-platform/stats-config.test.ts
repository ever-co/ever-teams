/**
 * The statistics settings are declared by the operator, never guessed, and the report never goes to an
 * address it should not: https only, plain http only to a local address.
 */
import {
	DEFAULT_EVER_PLATFORM_API_URL,
	readInstallSource,
	readPairedApiUrl,
	readSendIntervalS,
	readStatsApiUrl,
	readStatsCountry
} from './stats-config';

let warn: jest.SpyInstance;

beforeEach(() => {
	delete (globalThis as { __everTeamsConfigWarnings?: Set<string> }).__everTeamsConfigWarnings;
	warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => warn.mockRestore());

describe('EVER_INSTALL_SOURCE', () => {
	it.each([
		[undefined, 'self-hosted'],
		['', 'self-hosted'],
		['cloud', 'cloud'],
		['self-hosted', 'self-hosted'],
		['ever.sh', 'ever.sh'],
		['works_app', 'works_app'],
		['desktop', 'desktop'],
		['partner:acme-hosting', 'partner:acme-hosting'],
		['partner:a', 'self-hosted'],
		['Cloud', 'self-hosted'],
		['https://example.com', 'self-hosted']
	])('%p is %p', (value, expected) => {
		expect(readInstallSource({ EVER_INSTALL_SOURCE: value })).toBe(expected);
	});
});

describe('EVER_STATS_COUNTRY', () => {
	it.each([
		[undefined, 'ZZ'],
		['DE', 'DE'],
		['de', 'ZZ'],
		['DEU', 'ZZ'],
		['someone@example.com', 'ZZ']
	])('%p is %p', (value, expected) => {
		expect(readStatsCountry({ EVER_STATS_COUNTRY: value })).toBe(expected);
	});
});

describe('the statistics address', () => {
	it('defaults to the public Ever Platform API, then EVER_PLATFORM_API_URL', () => {
		expect(readStatsApiUrl({})).toBe(DEFAULT_EVER_PLATFORM_API_URL);
		expect(readStatsApiUrl({ EVER_PLATFORM_API_URL: 'https://platform.example.test/' })).toBe(
			'https://platform.example.test'
		);
		expect(
			readStatsApiUrl({
				EVER_PLATFORM_API_URL: 'https://platform.example.test',
				EVER_STATS_API_URL: 'https://stats.example.test'
			})
		).toBe('https://stats.example.test');
	});

	it.each([
		'http://example.com',
		'http://203.0.113.10:8080',
		'ftp://stats.example.test',
		'https://user:secret@stats.example.test',
		'https://stats.example.test/?token=1',
		'not a url'
	])('refuses %p (nothing is sent) and says so once', (value) => {
		expect(readStatsApiUrl({ EVER_STATS_API_URL: value })).toBeNull();
		expect(readStatsApiUrl({ EVER_STATS_API_URL: value })).toBeNull();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0][0])).not.toContain(value);
	});

	it.each(['http://localhost:8080', 'http://127.0.0.1:3989', 'http://10.231.7.252:8080', 'http://192.168.1.9'])(
		'accepts plain http to the local address %p',
		(value) => {
			expect(readStatsApiUrl({ EVER_STATS_API_URL: value })).toBe(value);
		}
	);
});

describe('EVER_STATS_SEND_INTERVAL_S', () => {
	it('applies only to a local statistics address', () => {
		expect(readSendIntervalS('http://127.0.0.1:3989', { EVER_STATS_SEND_INTERVAL_S: '5' })).toBe(5);
		expect(readSendIntervalS(DEFAULT_EVER_PLATFORM_API_URL, { EVER_STATS_SEND_INTERVAL_S: '5' })).toBeNull();
		expect(readSendIntervalS('http://127.0.0.1:3989', { EVER_STATS_SEND_INTERVAL_S: '0' })).toBeNull();
		expect(readSendIntervalS('http://127.0.0.1:3989', { EVER_STATS_SEND_INTERVAL_S: '1.5' })).toBeNull();
		expect(readSendIntervalS('http://127.0.0.1:3989', {})).toBeNull();
	});
});

describe('the paired API', () => {
	it('is the configured API exactly, with /api, and never a hosted fallback', () => {
		expect(readPairedApiUrl({})).toBeNull();
		expect(readPairedApiUrl({ GAUZY_API_SERVER_URL: ' ' })).toBeNull();
		expect(readPairedApiUrl({ GAUZY_API_SERVER_URL: 'http://api:3000' })).toBe('http://api:3000/api');
		expect(readPairedApiUrl({ NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.example.test/' })).toBe(
			'https://api.example.test/api'
		);
		expect(
			readPairedApiUrl({
				GAUZY_API_SERVER_URL: 'http://api:3000',
				NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.example.test'
			})
		).toBe('http://api:3000/api');
	});
});
