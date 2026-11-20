import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useWebTheme } from '../../app/theme';
import { dataColorHueOf } from '../theme/data-color';

/**
 * The glyphs the web draws for a task's status, priority, size and label (apps/web/core/components/tasks/
 * task-property-icon.tsx): the same shapes on the same 14 grid, chosen by the value's name, in the hue of its color.
 */
export type TaskPropertyKind = 'status' | 'priority' | 'size' | 'label';

type StatusGlyph = 'backlog' | 'todo' | 'started' | 'review' | 'blocked' | 'done' | 'canceled';
type PriorityGlyph = 'none' | 'urgent' | 'bars';

const STATUS_GLYPH_BY_NAME: Record<string, StatusGlyph> = {
	backlog: 'backlog',
	open: 'todo',
	todo: 'todo',
	'to do': 'todo',
	ready: 'todo',
	'in progress': 'started',
	'ready for review': 'review',
	'in review': 'review',
	'for testing': 'review',
	testing: 'review',
	blocked: 'blocked',
	done: 'done',
	completed: 'done',
	closed: 'canceled',
	cancelled: 'canceled',
	canceled: 'canceled'
};
const PRIORITY_GLYPH_BY_NAME: Record<string, PriorityGlyph> = {
	none: 'none',
	'no priority': 'none',
	urgent: 'urgent',
	highest: 'urgent',
	critical: 'urgent',
	high: 'bars',
	medium: 'bars',
	normal: 'bars',
	low: 'bars',
	lowest: 'bars'
};
const PRIORITY_LEVEL_BY_NAME: Record<string, number> = {
	high: 3,
	medium: 2,
	normal: 2,
	low: 1,
	lowest: 1
};
const SIZE_LEVEL_BY_NAME: Record<string, number> = {
	tiny: 1,
	'extra small': 1,
	xs: 1,
	small: 2,
	medium: 3,
	large: 4,
	'x large': 5,
	'extra large': 5,
	xl: 5
};
const SIZE_SQUARE_SIDES = [2.5, 3.75, 5, 6, 7];
const PRIORITY_BARS = [
	{ x: 1.5, y: 8, height: 4.5 },
	{ x: 5.5, y: 5, height: 7.5 },
	{ x: 9.5, y: 2, height: 10.5 }
];

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
	const glyph = PRIORITY_GLYPH_BY_NAME[name];
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
		const level = PRIORITY_LEVEL_BY_NAME[name];
		return (
			<>
				{PRIORITY_BARS.map((bar, index) => (
					<Rect
						key={bar.x}
						x={bar.x}
						y={bar.y}
						width="3"
						height={bar.height}
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
	const level = SIZE_LEVEL_BY_NAME[name];
	if (!level) {
		return <Circle cx="7" cy="7" r="3.5" fill={color} />;
	}
	const side = SIZE_SQUARE_SIDES[level - 1];
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
	const normalized = normalizePropertyName(name);
	const statusGlyph = STATUS_GLYPH_BY_NAME[normalized] ?? 'todo';
	return (
		<Svg testID={`property-icon-${kind}`} width={size} height={size} viewBox="0 0 14 14" fill="none">
			{kind === 'status' && <StatusShape glyph={statusGlyph} color={glyphColor} card={card} />}
			{kind === 'priority' && <PriorityShape name={normalized} color={glyphColor} card={card} />}
			{kind === 'size' && <SizeShape name={normalized} color={glyphColor} />}
			{kind === 'label' && <Circle cx="7" cy="7" r="3.5" fill={glyphColor} />}
		</Svg>
	);
}
