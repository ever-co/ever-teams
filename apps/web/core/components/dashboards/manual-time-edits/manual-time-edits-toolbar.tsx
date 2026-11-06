'use client';

import { useMemo } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { TOOLBAR_SEPARATOR } from '@/core/components/dashboards/kit/recipes';
import { DollarCircle, Folder, Users, X } from '@/core/components/icons';
import {
	PropertyFilterMenu,
	type PropertyFilterCategory,
	type PropertyFilterOption
} from '@/core/components/tasks/property-filter-menu';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { imgTitle } from '@/core/lib/helpers/index';
import { cn } from '@/core/lib/helpers';
import { NO_PROJECT_VALUE } from '@/core/lib/utils/dashboards/timesheets';
import type {
	BillableValue,
	ChangeAction,
	EditsFigures,
	EditsFilterField,
	EditsFilters,
	EditsGrouping,
	EditsMember
} from '@/core/lib/utils/dashboards/manual-time-edits';

type Translate = ReturnType<typeof useTranslations>;

interface ProjectOptionSource {
	id: string;
	name?: string | null;
	color?: string | null;
}

function PersonFace({ name, imageUrl }: Readonly<{ name: string; imageUrl: string | null }>) {
	return (
		<Avatar className="size-4">
			<AvatarImage src={imageUrl ?? undefined} alt="" loading="lazy" />
			<AvatarFallback className="text-[7px]">{imgTitle(name)}</AvatarFallback>
		</Avatar>
	);
}

function ProjectDot({ color }: Readonly<{ color: string | null | undefined }>) {
	const hasColor = Boolean(color);
	return (
		<span className="flex size-4 items-center justify-center">
			<span
				className={cn('size-2 rounded-full', !hasColor && 'bg-foreground/25')}
				style={{ backgroundColor: color ?? undefined }}
			/>
		</span>
	);
}

function memberOptionsOf(members: ReadonlyArray<EditsMember>): PropertyFilterOption[] {
	return members.map((member) => ({
		value: member.employeeId,
		name: member.name,
		icon: <PersonFace name={member.name} imageUrl={member.imageUrl} />
	}));
}

function byOptionName(first: PropertyFilterOption, second: PropertyFilterOption) {
	const firstName = first.name ?? '';
	const secondName = second.name ?? '';
	return firstName.localeCompare(secondName);
}

/** "No project" leads the list: time added by hand is often logged without one. */
function projectOptionsOf(projects: ReadonlyArray<ProjectOptionSource>, noProjectLabel: string) {
	const options: PropertyFilterOption[] = [];
	for (const project of projects) {
		const name = project.name ?? project.id;
		options.push({ value: project.id, name, icon: <ProjectDot color={project.color} /> });
	}
	options.sort(byOptionName);
	const noProject: PropertyFilterOption = { value: NO_PROJECT_VALUE, name: noProjectLabel, icon: <Folder /> };
	return [noProject, ...options];
}

const BILLABLE_LABEL_KEYS: Record<BillableValue, DottedLanguageObjectStringPaths> = {
	billable: 'dashboard.manualTimeEdits.BILLABLE',
	'non-billable': 'dashboard.manualTimeEdits.NOT_BILLABLE'
};

function billableOptionsOf(t: Translate): PropertyFilterOption[] {
	return [
		{ value: 'billable', name: t(BILLABLE_LABEL_KEYS.billable), icon: <DollarCircle /> },
		{ value: 'non-billable', name: t(BILLABLE_LABEL_KEYS['non-billable']), icon: <DollarCircle /> }
	];
}

export function useEditsFilterCategories(members: ReadonlyArray<EditsMember>) {
	const t = useTranslations();
	const { organizationProjects } = useOrganizationProjectsQuery();
	return useMemo<PropertyFilterCategory<EditsFilterField>[]>(
		() => [
			{
				field: 'members',
				keepsCase: true,
				icon: <Users />,
				label: t('common.MEMBERS'),
				options: memberOptionsOf(members)
			},
			{
				field: 'projects',
				keepsCase: true,
				icon: <Folder />,
				label: t('dashboard.timesheets.PROJECTS'),
				options: projectOptionsOf(organizationProjects, t('dashboard.timesheets.NO_PROJECT'))
			},
			{
				field: 'billable',
				keepsCase: true,
				icon: <DollarCircle />,
				label: t('dashboard.timesheets.BILLABLE'),
				options: billableOptionsOf(t)
			}
		],
		[members, organizationProjects, t]
	);
}

export function EditsFilterMenu({
	categories,
	filters,
	onChange,
	onClear
}: Readonly<{
	categories: PropertyFilterCategory<EditsFilterField>[];
	filters: EditsFilters;
	onChange: (field: EditsFilterField, values: string[]) => void;
	onClear: () => void;
}>) {
	return <PropertyFilterMenu categories={categories} selection={filters} onChange={onChange} onClear={onClear} />;
}

interface AppliedFilter {
	field: EditsFilterField;
	value: string;
	fieldLabel: string;
	name: string;
	icon: PropertyFilterOption['icon'];
}

function appliedFiltersOf(
	filters: EditsFilters,
	categories: ReadonlyArray<PropertyFilterCategory<EditsFilterField>>
): AppliedFilter[] {
	const applied: AppliedFilter[] = [];
	for (const category of categories) {
		for (const value of filters[category.field]) {
			const option = category.options.find((candidate) => candidate.value === value);
			const name = option?.name ?? value;
			applied.push({ field: category.field, value, fieldLabel: category.label, name, icon: option?.icon });
		}
	}
	return applied;
}

export function AppliedEditsFilters({
	categories,
	filters,
	onRemove,
	onClear
}: Readonly<{
	categories: ReadonlyArray<PropertyFilterCategory<EditsFilterField>>;
	filters: EditsFilters;
	onRemove: (field: EditsFilterField, value: string) => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const applied = appliedFiltersOf(filters, categories);
	const hasApplied = applied.length > 0;
	if (!hasApplied) {
		return null;
	}
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5 pb-3">
			{applied.map((filter) => (
				<span
					key={`${filter.field}:${filter.value}`}
					className="inline-flex h-7 max-w-64 items-center gap-1.5 rounded-full bg-card pr-1 pl-2.5 text-xs hairline-ring ring-foreground/10"
				>
					<span className="shrink-0 text-muted-foreground">{filter.fieldLabel}:</span>
					{filter.icon && (
						<span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-3.5">
							{filter.icon}
						</span>
					)}
					<span className="truncate font-medium text-foreground">{filter.name}</span>
					<button
						type="button"
						aria-label={t('dashboard.timesheets.REMOVE_FILTER', { value: filter.name })}
						onClick={() => onRemove(filter.field, filter.value)}
						className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						<X className="size-3" />
					</button>
				</span>
			))}
			<button
				type="button"
				onClick={onClear}
				className="h-7 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				{t('common.CLEAR_FILTERS')}
			</button>
		</div>
	);
}

export function EditsActionControl({
	figures,
	action,
	onActionChange
}: Readonly<{
	figures: EditsFigures | null;
	action: ChangeAction;
	onActionChange: (action: ChangeAction) => void;
}>) {
	const t = useTranslations();
	const actionItems = [
		{ value: 'all' as const, label: t('dashboard.manualTimeEdits.ACTION_ALL'), count: figures?.entryCount },
		{ value: 'added' as const, label: t('dashboard.manualTimeEdits.ADDED'), count: figures?.addedCount },
		{ value: 'edited' as const, label: t('dashboard.manualTimeEdits.EDITED'), count: figures?.editedCount }
	];
	return (
		<SegmentedControl<ChangeAction>
			items={actionItems}
			value={action}
			onValueChange={onActionChange}
			ariaLabel={t('dashboard.manualTimeEdits.ACTION_LABEL')}
		/>
	);
}

export function EditsGroupingControl({
	grouping,
	onGroupingChange
}: Readonly<{
	grouping: EditsGrouping;
	onGroupingChange: (grouping: EditsGrouping) => void;
}>) {
	const t = useTranslations();
	const groupingItems = [
		{ value: 'day' as const, label: t('dashboard.manualTimeEdits.GROUPING_DAY') },
		{ value: 'member' as const, label: t('dashboard.manualTimeEdits.GROUPING_MEMBER') }
	];
	return (
		<SegmentedControl<EditsGrouping>
			items={groupingItems}
			value={grouping}
			onValueChange={onGroupingChange}
			ariaLabel={t('dashboard.manualTimeEdits.GROUPING_LABEL')}
		/>
	);
}

export function EditsViewControls({
	figures,
	action,
	onActionChange,
	grouping,
	onGroupingChange
}: Readonly<{
	figures: EditsFigures | null;
	action: ChangeAction;
	onActionChange: (action: ChangeAction) => void;
	grouping: EditsGrouping;
	onGroupingChange: (grouping: EditsGrouping) => void;
}>) {
	return (
		<>
			<EditsActionControl figures={figures} action={action} onActionChange={onActionChange} />
			<span className={TOOLBAR_SEPARATOR} />
			<EditsGroupingControl grouping={grouping} onGroupingChange={onGroupingChange} />
		</>
	);
}
