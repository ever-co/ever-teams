import { randomUUID } from 'node:crypto';
import { getWebBuildInfo } from '@/core/lib/build-info';

/**
 * The anonymous usage report of this web app (`ever.stats.v1`, published schema).
 *
 * The web app holds no data of its own: its report says which release runs (`version` + `channel`),
 * how it was installed (`install_source`, as the operator declares it) and the country the operator
 * declares (`ZZ` otherwise). `counts`, `features` and `aggregates` are always empty: the counts of an
 * installation come from its API's own report. No id of a person, an organization, a host or a URL
 * can appear anywhere in it.
 */

/** The version of this statistics module (bumped when what it reports changes). */
export const TEAMS_STATS_MODULE_VERSION = '1.0.0';

export type StatsChannel = 'stable' | 'rc' | 'beta' | 'dev' | 'custom';

export interface TeamsStatsReport {
	schema: 'ever.stats.v1';
	report_id: string;
	instance_id: string;
	sent_at: string;
	module_version: string;
	product: 'teams';
	instance_kind: 'frontend';
	serves: ['teams'];
	version: string;
	channel: StatsChannel;
	install_source: string;
	country: string;
	period: string;
	final: boolean;
	counts: Record<string, never>;
	features: Record<string, never>;
	aggregates: Record<string, never>;
}

const RELEASE = /^v?(\d{1,4})\.(\d{1,4})\.(\d{1,4})(?:[-+](.*))?$/i;

/**
 * `major.minor.patch` without any suffix, and the channel the suffix names: a build string can name a
 * company, so it never leaves this process. `-rc…` → rc, `-beta…` → beta, `-dev…` or 0.0.0 → dev, any
 * other suffix (or a version that is not x.y.z) → custom.
 */
export function versionAndChannel(raw: string | undefined | null): { version: string; channel: StatsChannel } {
	const match = RELEASE.exec((raw ?? '').trim());
	if (!match) return { version: '0.0.0', channel: 'custom' };
	const version = `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`;
	const suffix = (match[4] ?? '').toLowerCase();
	if (version === '0.0.0') return { version, channel: 'dev' };
	if (!suffix) return { version, channel: 'stable' };
	if (/^rc(?:[.-]?\d+)*$/.test(suffix)) return { version, channel: 'rc' };
	if (/^beta(?:[.-]?\d+)*$/.test(suffix)) return { version, channel: 'beta' };
	if (/^dev(?:[.-]?\d+)*$/.test(suffix)) return { version, channel: 'dev' };
	return { version, channel: 'custom' };
}

/** UTC `YYYY-MM-DD`. */
export const utcDate = (at: Date): string => at.toISOString().slice(0, 10);

/** UTC `YYYY-MM`. */
export const utcPeriod = (at: Date): string => at.toISOString().slice(0, 7);

/** The UTC month before the one `at` falls in, as `YYYY-MM`. */
export function previousUtcPeriod(at: Date): string {
	const firstOfMonth = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1);
	return utcPeriod(new Date(firstOfMonth - 1));
}

export interface BuildReportInput {
	now: Date;
	instanceId: string;
	installSource: string;
	country: string;
	/** The closed previous month (`true`), or the running one. */
	final: boolean;
	/** The release this web app was built as (default: the build info). */
	buildVersion?: string;
}

export function buildTeamsReport(input: BuildReportInput): TeamsStatsReport {
	const { version, channel } = versionAndChannel(input.buildVersion ?? getWebBuildInfo().version);
	return {
		schema: 'ever.stats.v1',
		report_id: randomUUID(),
		instance_id: input.instanceId,
		sent_at: utcDate(input.now),
		module_version: TEAMS_STATS_MODULE_VERSION,
		product: 'teams',
		instance_kind: 'frontend',
		serves: ['teams'],
		version,
		channel,
		install_source: input.installSource,
		country: input.country,
		period: input.final ? previousUtcPeriod(input.now) : utcPeriod(input.now),
		final: input.final,
		counts: {},
		features: {},
		aggregates: {}
	};
}
