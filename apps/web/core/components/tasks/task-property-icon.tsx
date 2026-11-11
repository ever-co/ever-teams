import type { CSSProperties } from 'react';
import { Square4OutlineIcon } from 'assets/svg';
import { Cube, Tag, UsersGroup } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { EIssueType } from '@/core/types/generics/enums/task';
import { isCustomIcon } from '@/core/lib/utils/property-icon-value';
import { PropertyIconImage } from '@/core/components/settings/pages/task-properties/property-icon-image';
import { dataColorGemStyle, dataColorHue, isPaintableColor } from './task-data-color';

export type TaskPropertyKind =
	| 'status'
	| 'priority'
	| 'size'
	| 'label'
	| 'version'
	| 'epic'
	| 'issueType'
	| 'team'
	| 'project';

export const ISSUE_TYPE_COLORS: Record<EIssueType, string> = {
	[EIssueType.BUG]: '#923535',
	[EIssueType.TASK]: '#5483BA',
	[EIssueType.STORY]: '#66BB97',
	[EIssueType.EPIC]: '#8154BA'
};

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

function normalizePropertyName(name: string | null | undefined) {
	const lowerCased = (name ?? '').toLowerCase();
	const spaced = lowerCased.replace(/[-_]+/g, ' ');
	const collapsed = spaced.replace(/\s+/g, ' ');
	return collapsed.trim();
}

function glyphColorStyle(color: string | null | undefined): CSSProperties | undefined {
	if (!isPaintableColor(color)) {
		return undefined;
	}
	return { color: dataColorHue(color) };
}

function issueGlyphColor(kind: TaskPropertyKind, name: string, color: string | null | undefined) {
	if (isPaintableColor(color)) {
		return color;
	}
	if (kind === 'epic') {
		return ISSUE_TYPE_COLORS[EIssueType.EPIC];
	}
	const matchingType = Object.values(EIssueType).find((issueType) => issueType.toLowerCase() === name);
	if (!matchingType) {
		return ISSUE_TYPE_COLORS[EIssueType.TASK];
	}
	return ISSUE_TYPE_COLORS[matchingType];
}

function TaskTypeShape() {
	return (
		<path
			d="M3.4 7.3 5.9 9.8 10.6 4.5"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	);
}

const BUG_SPLIT_STYLE: CSSProperties = { stroke: 'var(--gem)' };

function BugTypeShape() {
	return (
		<>
			<circle cx="7" cy="3.4" r="1.9" fill="currentColor" />
			<rect x="3.75" y="4.25" width="6.5" height="8.75" rx="3.25" fill="currentColor" />
			<path d="M7 6.5v5" style={BUG_SPLIT_STYLE} strokeWidth="1.1" strokeLinecap="round" />
			<path
				d="M1.5 6.25h2M10.5 6.25h2M1.5 9.25h2M10.5 9.25h2"
				stroke="currentColor"
				strokeWidth="1.3"
				strokeLinecap="round"
			/>
		</>
	);
}

function StoryTypeShape() {
	return <path d="M3 2.6A1.6 1.6 0 0 1 4.6 1h4.8A1.6 1.6 0 0 1 11 2.6V13L7 10.2 3 13Z" fill="currentColor" />;
}

function EpicTypeShape() {
	return <path d="M8.3 1 2.75 8.1h3.8L5.7 13l5.55-7.1h-3.8Z" fill="currentColor" />;
}

function IssueTypeShape({ kind, name }: Readonly<{ kind: TaskPropertyKind; name: string }>) {
	const isEpic = kind === 'epic' || name === 'epic';
	if (isEpic) {
		return <EpicTypeShape />;
	}
	if (name === 'bug') {
		return <BugTypeShape />;
	}
	if (name === 'story') {
		return <StoryTypeShape />;
	}
	return <TaskTypeShape />;
}

function IssueTypeGlyph({ kind, name }: Readonly<{ kind: TaskPropertyKind; name: string }>) {
	return (
		<svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="size-[68%]">
			<IssueTypeShape kind={kind} name={name} />
		</svg>
	);
}

function ringDashArray(dashed: boolean) {
	if (!dashed) {
		return undefined;
	}
	return '1.5 1.51';
}

function Ring({ dashed = false }: Readonly<{ dashed?: boolean }>) {
	const dashArray = ringDashArray(dashed);
	return <circle cx="7" cy="7" r="5.75" stroke="currentColor" strokeWidth="1.5" strokeDasharray={dashArray} />;
}

function StatusShape({ glyph }: Readonly<{ glyph: StatusGlyph }>) {
	if (glyph === 'backlog') {
		return <Ring dashed />;
	}
	if (glyph === 'started') {
		return (
			<>
				<Ring />
				<path d="M7 4a3 3 0 0 1 0 6Z" fill="currentColor" />
			</>
		);
	}
	if (glyph === 'review') {
		return (
			<>
				<Ring />
				<path d="M7 7V4a3 3 0 1 1-3 3Z" fill="currentColor" />
			</>
		);
	}
	if (glyph === 'blocked') {
		return (
			<>
				<Ring />
				<path d="M4.5 7h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
			</>
		);
	}
	if (glyph === 'done') {
		return (
			<>
				<circle cx="7" cy="7" r="6.5" fill="currentColor" />
				<path
					d="m4.4 7.1 1.75 1.75L9.6 5.4"
					className="stroke-card"
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
				<circle cx="7" cy="7" r="6.5" fill="currentColor" />
				<path d="m5 5 4 4m0-4-4 4" className="stroke-card" strokeWidth="1.5" strokeLinecap="round" />
			</>
		);
	}
	return <Ring />;
}

function priorityBarOpacity(index: number, level: number) {
	const isFilled = index < level;
	if (isFilled) {
		return 1;
	}
	return 0.3;
}

function NoPriorityShape() {
	return <path d="M2 7h2M6 7h2M10 7h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />;
}

function SizeFrame() {
	return (
		<rect
			x="1.25"
			y="1.25"
			width="11.5"
			height="11.5"
			rx="3"
			stroke="currentColor"
			strokeOpacity="0.35"
			strokeWidth="1.5"
		/>
	);
}

function PriorityShape({ name }: Readonly<{ name: string }>) {
	const glyph = PRIORITY_GLYPH_BY_NAME[name];
	if (glyph === 'none') {
		return <NoPriorityShape />;
	}
	if (glyph === 'urgent') {
		return (
			<>
				<rect x="1" y="1" width="12" height="12" rx="3" fill="currentColor" />
				<path d="M7 3.75v4" className="stroke-card" strokeWidth="1.6" strokeLinecap="round" />
				<circle cx="7" cy="10.1" r="0.95" className="fill-card" />
			</>
		);
	}
	if (glyph === 'bars') {
		const level = PRIORITY_LEVEL_BY_NAME[name];
		return (
			<>
				{PRIORITY_BARS.map((bar, index) => {
					const opacity = priorityBarOpacity(index, level);
					return (
						<rect
							key={bar.x}
							x={bar.x}
							y={bar.y}
							width="3"
							height={bar.height}
							rx="1"
							fill="currentColor"
							fillOpacity={opacity}
						/>
					);
				})}
			</>
		);
	}
	return <circle cx="7" cy="7" r="3.5" fill="currentColor" />;
}

function SizeShape({ name }: Readonly<{ name: string }>) {
	const level = SIZE_LEVEL_BY_NAME[name];
	if (!level) {
		return <circle cx="7" cy="7" r="3.5" fill="currentColor" />;
	}
	const side = SIZE_SQUARE_SIDES[level - 1];
	const top = 10.5 - side;
	return (
		<>
			<SizeFrame />
			<rect x="3.5" y={top} width={side} height={side} rx="1" fill="currentColor" />
		</>
	);
}

function DrawnGlyph({ kind, name }: Readonly<{ kind: TaskPropertyKind; name: string }>) {
	const statusGlyph = STATUS_GLYPH_BY_NAME[name] ?? 'todo';
	return (
		<svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="size-full">
			{kind === 'status' && <StatusShape glyph={statusGlyph} />}
			{kind === 'priority' && <PriorityShape name={name} />}
			{kind === 'size' && <SizeShape name={name} />}
			{kind === 'label' && <circle cx="7" cy="7" r="3.5" fill="currentColor" />}
		</svg>
	);
}

function PropertyGlyph({ kind, name }: Readonly<{ kind: TaskPropertyKind; name: string }>) {
	if (kind === 'version') {
		return <Tag className="size-full" aria-hidden="true" />;
	}
	if (kind === 'team') {
		return <UsersGroup className="size-full" aria-hidden="true" />;
	}
	if (kind === 'project') {
		return <Cube className="size-full" aria-hidden="true" />;
	}
	return <DrawnGlyph kind={kind} name={name} />;
}

function PlaceholderGlyph({ kind }: Readonly<{ kind: TaskPropertyKind }>) {
	const isTagKind = kind === 'label' || kind === 'version';
	const isIssueKind = kind === 'epic' || kind === 'issueType';
	if (isTagKind) {
		return <Tag className="size-full" aria-hidden="true" />;
	}
	if (isIssueKind) {
		return <Square4OutlineIcon className="size-full" aria-hidden="true" />;
	}
	if (kind === 'team') {
		return <UsersGroup className="size-full" aria-hidden="true" />;
	}
	if (kind === 'project') {
		return <Cube className="size-full" aria-hidden="true" />;
	}
	return (
		<svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="size-full">
			{kind === 'status' && <Ring dashed />}
			{kind === 'priority' && <NoPriorityShape />}
			{kind === 'size' && <SizeFrame />}
		</svg>
	);
}

export function TaskPropertyPlaceholderIcon({
	kind,
	className
}: Readonly<{ kind: TaskPropertyKind; className?: string }>) {
	return (
		<span
			data-slot="task-property-icon"
			aria-hidden="true"
			className={cn('inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground', className)}
		>
			<PlaceholderGlyph kind={kind} />
		</span>
	);
}

interface TaskPropertyIconProps {
	kind: TaskPropertyKind;
	name?: string | null;
	color?: string | null;
	className?: string;
	/**
	 * The property's stored icon. A custom one, from the icon library or a file of the user's own, is drawn in place
	 * of the glyph, in the property's color; the glyph stays for a classic icon, a missing one, or a file that fails.
	 */
	icon?: string | null;
}

export function TaskPropertyIcon({ kind, name, color, className, icon }: Readonly<TaskPropertyIconProps>) {
	const glyph = <TaskPropertyGlyph kind={kind} name={name} color={color} className={className} />;
	// A label is shown by its color: label icons are not part of the design (#5024)
	if (kind === 'label' || !icon || !isCustomIcon(icon)) {
		return glyph;
	}
	return (
		<span
			data-slot="task-property-icon"
			aria-hidden="true"
			className={cn('inline-flex size-4 shrink-0 items-center justify-center', className)}
			style={glyphColorStyle(color)}
		>
			<PropertyIconImage value={icon} className="size-full" fallback={glyph} />
		</span>
	);
}

function TaskPropertyGlyph({ kind, name, color, className }: Readonly<Omit<TaskPropertyIconProps, 'icon'>>) {
	const normalizedName = normalizePropertyName(name);
	const isIssueKind = kind === 'epic' || kind === 'issueType';

	if (isIssueKind) {
		const glyphColor = issueGlyphColor(kind, normalizedName, color);
		return (
			<span
				data-slot="task-property-icon"
				aria-hidden="true"
				className={cn(
					'gem-plate inline-flex size-4 shrink-0 items-center justify-center rounded-[28%]',
					className
				)}
				style={dataColorGemStyle(glyphColor)}
			>
				<IssueTypeGlyph kind={kind} name={normalizedName} />
			</span>
		);
	}

	const style = glyphColorStyle(color);
	const isMuted = !style;
	return (
		<span
			data-slot="task-property-icon"
			aria-hidden="true"
			className={cn(
				'inline-flex size-4 shrink-0 items-center justify-center',
				isMuted && 'text-muted-foreground',
				className
			)}
			style={style}
		>
			<PropertyGlyph kind={kind} name={normalizedName} />
		</span>
	);
}
