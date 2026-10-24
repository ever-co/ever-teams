/**
 * The switches of the optional Ever Platform features are strict: only the exact strings 'true' and
 * 'false' count, anything else means the default and is logged once.
 */
import { isEverConnectFlagOn, isEverStatsEnabled, parseBoolEnv } from './env';

const ORIGINAL_ENV = process.env;

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	delete (globalThis as { __everTeamsConfigWarnings?: Set<string> }).__everTeamsConfigWarnings;
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

describe('parseBoolEnv', () => {
	it.each([
		['true', false, true],
		['false', true, false],
		[undefined, true, true],
		[undefined, false, false],
		['', true, true],
		['   ', false, false]
	])('%p with default %p gives %p without a warning', (value, fallback, expected) => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		expect(parseBoolEnv('X_SWITCH', fallback, { X_SWITCH: value })).toBe(expected);
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it.each(['TRUE', '1', 'yes', 'on', 'False', ' true'])('%p gives the default and one warning per process', (value) => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		expect(parseBoolEnv('X_SWITCH', true, { X_SWITCH: value })).toBe(true);
		expect(parseBoolEnv('X_SWITCH', false, { X_SWITCH: value })).toBe(false);
		expect(parseBoolEnv('X_SWITCH', false, { X_SWITCH: value })).toBe(false);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0][0])).toContain('X_SWITCH');
		// The value itself is never repeated in the log.
		if (value.trim()) expect(String(warn.mock.calls[0][0])).not.toContain(`"${value}"`);
		warn.mockRestore();
	});
});

describe('EVER_STATS_ENABLED', () => {
	it('is on unless exactly "false"', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		expect(isEverStatsEnabled({})).toBe(true);
		expect(isEverStatsEnabled({ EVER_STATS_ENABLED: 'false' })).toBe(false);
		expect(isEverStatsEnabled({ EVER_STATS_ENABLED: 'true' })).toBe(true);
		expect(isEverStatsEnabled({ EVER_STATS_ENABLED: '0' })).toBe(true);
		warn.mockRestore();
	});
});

describe('NEXT_PUBLIC_EVER_CONNECT_ENABLED', () => {
	it('is off unless exactly "true"', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		delete process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED;
		expect(isEverConnectFlagOn()).toBe(false);
		process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED = 'TRUE';
		expect(isEverConnectFlagOn()).toBe(false);
		process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED = '1';
		expect(isEverConnectFlagOn()).toBe(false);
		process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED = 'true';
		expect(isEverConnectFlagOn()).toBe(true);
		warn.mockRestore();
	});
});
