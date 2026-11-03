import type { CSSProperties } from 'react';
import type { DottedLanguageObjectStringPaths } from 'next-intl';
import { ChevronDown } from '@/core/components/icons';
import { SpinnerLoader } from '@/core/components/common/loader';
import { cn } from '@/core/lib/helpers';
import { dataColorDotStyle, isPaintableColor } from './task-data-color';
import { TaskPropertyKind, TaskPropertyPlaceholderIcon } from './task-property-icon';

const FIELD_LABEL_KEYS: Record<TaskPropertyKind, DottedLanguageObjectStringPaths> = {
	status: 'taskMenus.fields.status',
	priority: 'taskMenus.fields.priority',
	size: 'taskMenus.fields.size',
	label: 'taskMenus.fields.label',
	version: 'taskMenus.fields.version',
	epic: 'taskMenus.fields.epic',
	issueType: 'taskMenus.fields.issueType',
	team: 'taskMenus.fields.team',
	project: 'taskMenus.fields.project'
};

const SEARCH_PLACEHOLDER_KEYS: Record<TaskPropertyKind, DottedLanguageObjectStringPaths> = {
	status: 'taskMenus.search.status',
	priority: 'taskMenus.search.priority',
	size: 'taskMenus.search.size',
	label: 'taskMenus.search.label',
	version: 'taskMenus.search.version',
	epic: 'taskMenus.search.epic',
	issueType: 'taskMenus.search.issueType',
	team: 'taskMenus.search.team',
	project: 'taskMenus.search.project'
};

const KIND_BY_FIELD: Partial<Record<string, TaskPropertyKind>> = {
	status: 'status',
	'status type': 'status',
	priority: 'priority',
	size: 'size',
	label: 'label',
	tags: 'label',
	version: 'version',
	epic: 'epic',
	issueType: 'issueType',
	team: 'team',
	project: 'project'
};

const MAX_SUMMARY_DOTS = 3;

export const TASK_PROPERTY_PILL_RECIPE =
	'inline-flex h-7 w-fit min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-card px-2.5 text-[13px] font-normal hairline-ring ring-border shadow-[0_1px_1px_rgb(0_0_0/0.04)]';

export function taskPropertyFieldKey(kind: TaskPropertyKind) {
	return FIELD_LABEL_KEYS[kind];
}

export function taskPropertySearchKey(kind: TaskPropertyKind) {
	return SEARCH_PLACEHOLDER_KEYS[kind];
}

export function taskPropertyKindFromField(field: string | undefined, fallback: TaskPropertyKind): TaskPropertyKind {
	if (!field) {
		return fallback;
	}
	return KIND_BY_FIELD[field] ?? fallback;
}

export function taskPropertyTriggerWidthStyle(largerWidth: boolean): CSSProperties | undefined {
	if (!largerWidth) {
		return undefined;
	}
	return { width: '160px' };
}

export function TaskPropertyTriggerEnd({
	isLoading = false,
	showsChevron = true
}: {
	isLoading?: boolean;
	showsChevron?: boolean;
}) {
	if (isLoading) {
		return <SpinnerLoader size={12} variant="dark-white" />;
	}
	if (!showsChevron) {
		return null;
	}
	return <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />;
}

interface TaskPropertyPillProps {
	kind: TaskPropertyKind;
	label: string;
	isLoading?: boolean;
	showsChevron?: boolean;
	className?: string;
}

export function TaskPropertyPill({ kind, label, isLoading, showsChevron, className }: TaskPropertyPillProps) {
	return (
		<span className={cn(TASK_PROPERTY_PILL_RECIPE, 'text-muted-foreground', className)}>
			<TaskPropertyPlaceholderIcon kind={kind} className="size-3.5" />
			<span className="min-w-0 truncate">{label}</span>
			<TaskPropertyTriggerEnd isLoading={isLoading} showsChevron={showsChevron} />
		</span>
	);
}

interface TaskPropertyCountChipProps {
	label: string;
	colors: (string | null | undefined)[];
	isLoading?: boolean;
	showsChevron?: boolean;
	className?: string;
}

export function TaskPropertyCountChip({
	label,
	colors,
	isLoading,
	showsChevron,
	className
}: TaskPropertyCountChipProps) {
	const paintableColors = colors.filter(isPaintableColor);
	const shownColors = paintableColors.slice(0, MAX_SUMMARY_DOTS);
	return (
		<span
			className={cn(
				'chip-3d inline-flex h-7 w-fit min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium [--chip:hsl(var(--muted-foreground))]',
				className
			)}
		>
			{shownColors.length > 0 && (
				<span className="flex shrink-0 -space-x-0.5">
					{shownColors.map((color, index) => (
						<span
							key={`${color}-${index}`}
							className="size-2 rounded-full hairline-ring ring-card"
							style={dataColorDotStyle(color)}
						/>
					))}
				</span>
			)}
			<span className="min-w-0 truncate">{label}</span>
			<TaskPropertyTriggerEnd isLoading={isLoading} showsChevron={showsChevron} />
		</span>
	);
}
