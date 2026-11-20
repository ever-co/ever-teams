import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useWebTheme } from '../../app/theme';
import { dataColorHueOf } from '../theme/data-color';
import { Tag } from './icons';

/**
 * The glyphs the web draws for a task's status, priority, size and label (apps/web/core/components/tasks/
 * task-property-icon.tsx): the same shapes on the same 14 grid, chosen by the value's name, in the hue of its color.
 */
export type TaskPropertyKind = 'status' | 'priority' | 'size' | 'label' | 'version';

type StatusGlyph = 'backlog' | 'todo' | 'started' | 'review' | 'blocked' | 'done' | 'canceled';

interface PriorityLook {
	glyph: 'none' | 'urgent' | 'bars';
	/** How many of the three bars are filled. */
	level: number;
}

type NamedGroup<T> = readonly [T, readonly string[]];

/** Each value, with the names the web draws it for. */
function lookupOf<T>(groups: ReadonlyArray<NamedGroup<T>>): ReadonlyMap<string, T> {
	const lookup = new Map<string, T>();
	for (const [value, names] of groups) {
		for (const name of names) {
			lookup.set(name, value);
		}
	}
	return lookup;
}

const STATUS_GLYPH_BY_NAME = lookupOf<StatusGlyph>([
	['backlog', ['backlog']],
	['todo', ['open', 'todo', 'to do', 'ready']],
	['started', ['in progress']],
	['review', ['ready for review', 'in review', 'for testing', 'testing']],
	['blocked', ['blocked']],
	['done', ['done', 'completed']],
	['canceled', ['closed', 'cancelled', 'canceled']]
]);
const PRIORITY_BY_NAME = lookupOf<PriorityLook>([
	[{ glyph: 'none', level: 0 }, ['none', 'no priority']],
	[{ glyph: 'urgent', level: 0 }, ['urgent', 'highest', 'critical']],
	[{ glyph: 'bars', level: 3 }, ['high']],
	[{ glyph: 'bars', level: 2 }, ['medium', 'normal']],
	[{ glyph: 'bars', level: 1 }, ['low', 'lowest']]
]);
/** The side of the square a size fills inside its frame, from tiny to extra large. */
const SIZE_SQUARE_SIDE_BY_NAME = lookupOf<number>([
	[2.5, ['tiny', 'extra small', 'xs']],
	[3.75, ['small']],
	[5, ['medium']],
	[6, ['large']],
	[7, ['x large', 'extra large', 'xl']]
]);
/** The three priority bars stand on the same baseline, 4 apart, each taller than the last. */
const PRIORITY_BAR_HEIGHTS = [4.5, 7.5, 10.5];
const PRIORITY_BAR_BASELINE = 12.5;
const PRIORITY_BAR_STEP = 4;
const PRIORITY_BAR_FIRST_X = 1.5;

/** A value's name as the glyph tables read it: lower case, hyphens and underscores as spaces. */
export function normalizePropertyName(name: string | null | undefined): string {
	const lowerCased = (name ?? '').toLowerCase();
	const spaced = lowerCased.replace(/[-_]+/g, ' ');
	const collapsed = spaced.replace(/\s+/g, ' ');
	return collapsed.trim();
}

function ringDashArray(dashed: boolean) {
	if (!dashed) {
		return undefined;
	}
	return '1.5 1.51';
}

function Ring({ color, dashed = false }: Readonly<{ color: string; dashed?: boolean }>) {
	return <Circle cx="7" cy="7" r="5.75" stroke={color} strokeWidth="1.5" strokeDasharray={ringDashArray(dashed)} />;
}

function StatusShape({ glyph, color, card }: Readonly<{ glyph: StatusGlyph; color: string; card: string }>) {
	if (glyph === 'backlog') {
		return <Ring color={color} dashed />;
	}
	if (glyph === 'started') {
		return (
			<>
				<Ring color={color} />
				<Path d="M7 4a3 3 0 0 1 0 6Z" fill={color} />
			</>
		);
	}
	if (glyph === 'review') {
		return (
			<>
				<Ring color={color} />
				<Path d="M7 7V4a3 3 0 1 1-3 3Z" fill={color} />
			</>
		);
	}
	if (glyph === 'blocked') {
		return (
			<>
				<Ring color={color} />
				<Path d="M4.5 7h5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
			</>
		);
	}
	if (glyph === 'done') {
		return (
			<>
				<Circle cx="7" cy="7" r="6.5" fill={color} />
				<Path
					d="m4.4 7.1 1.75 1.75L9.6 5.4"
					stroke={card}
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</>
		);
	}
	if (glyph === 'canceled') {
		return (
			<>
				<Circle cx="7" cy="7" r="6.5" fill={color} />
				<Path d="m5 5 4 4m0-4-4 4" stroke={card} strokeWidth="1.5" strokeLinecap="round" />
			</>
		);
	}
	return <Ring color={color} />;
}

function priorityBarOpacity(index: number, level: number) {
	const isFilled = index < level;
	if (isFilled) {
		return 1;
	}
	return 0.3;
}

function PriorityShape({ name, color, card }: Readonly<{ name: string; color: string; card: string }>) {
	const priority = PRIORITY_BY_NAME.get(name);
	const glyph = priority?.glyph;
	if (glyph === 'none') {
		return <Path d="M2 7h2M6 7h2M10 7h2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />;
	}
	if (glyph === 'urgent') {
		return (
			<>
				<Rect x="1" y="1" width="12" height="12" rx="3" fill={color} />
				<Path d="M7 3.75v4" stroke={card} strokeWidth="1.6" strokeLinecap="round" />
				<Circle cx="7" cy="10.1" r="0.95" fill={card} />
			</>
		);
	}
	if (glyph === 'bars') {
		const level = priority?.level ?? 0;
		return (
			<>
				{PRIORITY_BAR_HEIGHTS.map((height, index) => (
					<Rect
						key={height}
						x={PRIORITY_BAR_FIRST_X + index * PRIORITY_BAR_STEP}
						y={PRIORITY_BAR_BASELINE - height}
						width="3"
						height={height}
						rx="1"
						fill={color}
						fillOpacity={priorityBarOpacity(index, level)}
					/>
				))}
			</>
		);
	}
	return <Circle cx="7" cy="7" r="3.5" fill={color} />;
}

function SizeShape({ name, color }: Readonly<{ name: string; color: string }>) {
	const side = SIZE_SQUARE_SIDE_BY_NAME.get(name);
	if (side === undefined) {
		return <Circle cx="7" cy="7" r="3.5" fill={color} />;
	}
	return (
		<>
			<Rect
				x="1.25"
				y="1.25"
				width="11.5"
				height="11.5"
				rx="3"
				stroke={color}
				strokeOpacity="0.35"
				strokeWidth="1.5"
			/>
			<Rect x="3.5" y={10.5 - side} width={side} height={side} rx="1" fill={color} />
		</>
	);
}

interface ITaskPropertyIcon {
	kind: TaskPropertyKind;
	name?: string | null;
	/** The value's API color; the glyph takes its hue, or muted-foreground without one. */
	color?: string | null;
	size?: number;
}

/** A status, priority, size or label drawn as the web draws it, by name, in the hue of its color. */
export function TaskPropertyIcon({ kind, name, color, size = 16 }: Readonly<ITaskPropertyIcon>) {
	const theme = useWebTheme();
	const glyphColor = dataColorHueOf(color) ?? theme.colors['muted-foreground'];
	const card = theme.colors.card;
	if (kind === 'version') {
		return <Tag testID="property-icon-version" size={size} color={glyphColor} />;
	}
	const normalized = normalizePropertyName(name);
	const statusGlyph = STATUS_GLYPH_BY_NAME.get(normalized) ?? 'todo';
	return (
		<Svg testID={`property-icon-${kind}`} width={size} height={size} viewBox="0 0 14 14" fill="none">
			{kind === 'status' && <StatusShape glyph={statusGlyph} color={glyphColor} card={card} />}
			{kind === 'priority' && <PriorityShape name={normalized} color={glyphColor} card={card} />}
			{kind === 'size' && <SizeShape name={normalized} color={glyphColor} />}
			{kind === 'label' && <Circle cx="7" cy="7" r="3.5" fill={glyphColor} />}
		</Svg>
	);
}
