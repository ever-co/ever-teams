import type { useTranslations } from 'next-intl';
import { dataColorHue } from '@/core/components/tasks/task-data-color';
import type { MemberSeries, ProjectSeries, SeriesPaint } from '@/core/lib/utils/dashboards/team';

const RAMP_TONES = [
	'hsl(var(--primary))',
	'hsl(var(--primary) / 0.7)',
	'hsl(var(--primary) / 0.48)',
	'hsl(var(--primary) / 0.32)',
	'hsl(var(--primary) / 0.2)'
];

const NO_PROJECT_TONE = 'hsl(var(--foreground) / 0.34)';

const OTHER_TONE = 'hsl(var(--foreground) / 0.14)';

function rampToneOf(step: number) {
	const lastTone = RAMP_TONES[RAMP_TONES.length - 1];
	return RAMP_TONES[step] ?? lastTone;
}

/** Applied through `style`: an SVG presentation attribute resolves neither CSS variables nor relative colours. */
export function seriesToneOf(paint: SeriesPaint) {
	switch (paint.kind) {
		case 'project':
			return dataColorHue(paint.color);
		case 'ramp':
			return rampToneOf(paint.step);
		case 'noProject':
			return NO_PROJECT_TONE;
		default:
			return OTHER_TONE;
	}
}

export function seriesTonesOf(series: ReadonlyArray<ProjectSeries>) {
	const tones = new Map<string, string>();
	for (const entry of series) {
		tones.set(entry.key, seriesToneOf(entry.paint));
	}
	return tones;
}

export function toneOfKey(tones: ReadonlyMap<string, string>, key: string) {
	return tones.get(key) ?? OTHER_TONE;
}

type Translate = ReturnType<typeof useTranslations>;

export function seriesNameOf(entry: ProjectSeries, t: Translate) {
	if (entry.isOther) {
		return t('dashboard.team.projects.OTHER', { count: entry.otherCount });
	}
	const item = entry.item;
	if (!item || item.isNoProject) {
		return t('dashboard.team.projects.NONE');
	}
	return item.name || t('dashboard.team.projects.NONE');
}

/** One hue per member, derived from their id, so a member keeps their colour in every block of the page. */
/** A curated ring of hues around the brand indigo, so no member lands on a muddy colour. */
const MEMBER_BASE_COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#f97316'];

function stableIndexOf(value: string, size: number) {
	let hash = 0;
	for (const character of value) {
		const code = character.codePointAt(0) ?? 0;
		hash = (hash * 31 + code) % 2147483647;
	}
	return hash % size;
}

export function memberToneOf(employeeId: string) {
	const index = stableIndexOf(employeeId, MEMBER_BASE_COLORS.length);
	const baseColor = MEMBER_BASE_COLORS[index] ?? MEMBER_BASE_COLORS[0];
	return dataColorHue(baseColor);
}

/** The same ring by rank, for a short ranked list (the leading apps of a day) that needs one distinct hue each. */
export function rankedToneOf(rank: number) {
	const index = rank % MEMBER_BASE_COLORS.length;
	const baseColor = MEMBER_BASE_COLORS[index] ?? MEMBER_BASE_COLORS[0];
	return dataColorHue(baseColor);
}

export function memberSeriesToneOf(entry: MemberSeries) {
	if (entry.isOther) {
		return OTHER_TONE;
	}
	return memberToneOf(entry.key);
}

export function memberSeriesNameOf(entry: MemberSeries, t: Translate) {
	if (entry.isOther) {
		return t('dashboard.team.period.OTHER_MEMBERS', { count: entry.otherCount });
	}
	return entry.name || t('dashboard.team.UNNAMED_MEMBER');
}
