/**
 * The web app's report: exactly the keys of the published schema, version-only, with empty counts,
 * features and aggregates, and nothing a person or an organization could be identified by.
 */
import { validateStatsReport, walkStrings } from '@ever-co/connect-sdk';
import golden from '@ever-co/connect-contracts/fixtures/stats/valid/teams.json';
import { buildTeamsReport, previousUtcPeriod, TEAMS_STATS_MODULE_VERSION, versionAndChannel } from './report';

const INSTANCE_ID = '3ddf1821-761d-4247-8f3d-e65e4bc66ac8';
const NOW = new Date('2026-11-02T13:45:12.345Z');

function build(overrides: Partial<Parameters<typeof buildTeamsReport>[0]> = {}) {
	return buildTeamsReport({
		now: NOW,
		instanceId: INSTANCE_ID,
		installSource: 'self-hosted',
		country: 'ZZ',
		final: false,
		buildVersion: '1.4.2',
		...overrides
	});
}

describe('versionAndChannel', () => {
	it.each([
		['1.4.2', '1.4.2', 'stable'],
		['v1.4.2', '1.4.2', 'stable'],
		['1.2.3-rc.1', '1.2.3', 'rc'],
		['1.2.3-beta', '1.2.3', 'beta'],
		['1.2.3-dev', '1.2.3', 'dev'],
		['0.0.0', '0.0.0', 'dev'],
		['1.2.3-acme-corp-prod', '1.2.3', 'custom'],
		['1.2.3+build.42', '1.2.3', 'custom'],
		['release-of-acme', '0.0.0', 'custom'],
		['', '0.0.0', 'custom']
	])('%p is version %p on the %p channel', (raw, version, channel) => {
		expect(versionAndChannel(raw)).toEqual({ version, channel });
	});
});

describe('buildTeamsReport', () => {
	it('matches the published golden report of a Teams frontend, apart from its own ids, date and serves', () => {
		const report = build();
		const { report_id: _r, instance_id: _i, sent_at: _s, serves: _v, ...rest } = report;
		const { report_id: _gr, instance_id: _gi, sent_at: _gs, serves: _gv, ...goldenRest } = golden as Record<string, unknown>;
		expect(Object.keys(report).sort()).toEqual(Object.keys(golden).sort());
		expect(rest).toEqual({ ...goldenRest, module_version: TEAMS_STATS_MODULE_VERSION });
		expect(report.serves).toEqual(['teams']);
		expect(report.sent_at).toBe('2026-11-02');
	});

	it('passes the platform checks (the SDK validator, the published schema)', () => {
		expect(validateStatsReport(build()).ok).toBe(true);
		expect(validateStatsReport(build({ final: true, installSource: 'partner:acme-hosting', country: 'DE' })).ok).toBe(true);
	});

	it('never lets a build suffix reach the report', () => {
		const report = build({ buildVersion: '1.2.3-acme-corp-prod' });
		expect(report.version).toBe('1.2.3');
		expect(report.channel).toBe('custom');
		expect(JSON.stringify(report)).not.toContain('acme');
	});

	it('names only allow-listed strings (string walker)', () => {
		const allowed = new Set([
			'/schema',
			'/report_id',
			'/instance_id',
			'/sent_at',
			'/module_version',
			'/product',
			'/instance_kind',
			'/serves/0',
			'/version',
			'/channel',
			'/install_source',
			'/country',
			'/period'
		]);
		const values = walkStrings(build()).filter((entry) => entry.kind === 'value');
		expect(values.map((entry) => entry.path).filter((path) => !allowed.has(path))).toEqual([]);
	});

	it('reports the closed previous month when final', () => {
		expect(build({ final: true }).period).toBe('2026-10');
		expect(previousUtcPeriod(new Date('2026-01-02T00:00:00Z'))).toBe('2025-12');
		expect(build().period).toBe('2026-11');
	});

	it('mints a new report id for every report', () => {
		expect(build().report_id).not.toBe(build().report_id);
	});
});
