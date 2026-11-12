'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Clock, DollarCircle, UserCheck, Users, UsersGroup, Wallet, X } from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import {
	PropertyFilterMenu,
	type PropertyFilterCategory,
	type PropertyFilterOption
} from '@/core/components/tasks/property-filter-menu';
import { PersonFace } from '@/core/components/projects/project-cells';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import type { ProjectsListState } from '@/core/hooks/projects/use-projects-list-state';
import { organizationTeamsState } from '@/core/stores';
import {
	PROJECT_FILTER_FIELDS,
	normalizeStatusName,
	personFromProjectMember,
	type ProjectFilterField,
	type ProjectMember
} from '@/core/lib/utils/project-list';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TOrganizationProject } from '@/core/types/schemas';

function peopleOptionsOf(members: ProjectMember[]): PropertyFilterOption[] {
	const byEmployee = new Map<string, PropertyFilterOption>();
	for (const member of members) {
		const employeeId = member?.employeeId;
		const isKnown = !employeeId || byEmployee.has(employeeId);
		if (isKnown) {
			continue;
		}
		const person = personFromProjectMember(member);
		byEmployee.set(employeeId, { value: employeeId, name: person.name, icon: <PersonFace person={person} /> });
	}
	const options = [...byEmployee.values()];
	options.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
	return options;
}

export function useProjectFilterCategories(projects: TOrganizationProject[]) {
	const t = useTranslations();
	const teams = useAtomValue(organizationTeamsState);
	const { taskStatuses } = useTaskStatusesQuery();

	return useMemo<PropertyFilterCategory<ProjectFilterField>[]>(() => {
		const teamOptions: PropertyFilterOption[] = teams.map((team) => ({
			value: team.id,
			name: team.name,
			icon: (
				<EntityTile
					name={team.name}
					color={team.color}
					imageUrl={team.image?.thumbUrl}
					className="size-4 text-[7px]"
				/>
			)
		}));

		const statusByName = new Map<string, PropertyFilterOption>();
		for (const status of taskStatuses) {
			const label = normalizeStatusName(status.name);
			const isKnown = !label || statusByName.has(label);
			if (isKnown) {
				continue;
			}
			statusByName.set(label, {
				value: status.name,
				name: label,
				icon: (
					<TaskPropertyIcon
						kind="status"
						name={status.name}
						color={status.color}
						icon={status.icon}
						iconUrl={status.fullIconUrl}
					/>
				)
			});
		}

		const allMembers = projects.flatMap((project) => project.members ?? []);
		const managers = allMembers.filter((member) => member?.isManager);
		const contributors = allMembers.filter((member) => !member?.isManager);

		const budgetOptions: PropertyFilterOption[] = [
			{ value: EProjectBudgetType.HOURS, name: t('common.HOURS_BASED'), icon: <Clock /> },
			{ value: EProjectBudgetType.COST, name: t('common.COST_BASED'), icon: <DollarCircle /> }
		];

		return [
			{ field: 'teams', icon: <UsersGroup />, label: t('common.TEAMS'), options: teamOptions },
			{ field: 'status', kind: 'status', label: t('common.STATUS'), options: [...statusByName.values()] },
			{ field: 'managers', icon: <UserCheck />, label: t('common.MANAGERS'), options: peopleOptionsOf(managers) },
			{ field: 'members', icon: <Users />, label: t('common.MEMBERS'), options: peopleOptionsOf(contributors) },
			{ field: 'budgetTypes', icon: <Wallet />, label: t('common.BUDGET_TYPE'), options: budgetOptions }
		];
	}, [projects, t, taskStatuses, teams]);
}

export function ProjectsFilterMenu({
	list,
	categories
}: Readonly<{ list: ProjectsListState; categories: PropertyFilterCategory<ProjectFilterField>[] }>) {
	const clearValues = () => {
		for (const field of PROJECT_FILTER_FIELDS) {
			list.setFilter(field, []);
		}
	};
	return (
		<PropertyFilterMenu
			categories={categories}
			selection={list.filters}
			onChange={list.setFilter}
			onClear={clearValues}
		/>
	);
}

interface AppliedFilter {
	field: ProjectFilterField;
	value: string;
	label: string;
	option: PropertyFilterOption | undefined;
}

function appliedFiltersOf(list: ProjectsListState, categories: PropertyFilterCategory<ProjectFilterField>[]) {
	const applied: AppliedFilter[] = [];
	for (const category of categories) {
		for (const value of list.filters[category.field]) {
			const option = category.options.find((candidate) => candidate.value === value);
			applied.push({ field: category.field, value, label: category.label, option });
		}
	}
	return applied;
}

export function AppliedProjectFilters({
	list,
	categories
}: Readonly<{ list: ProjectsListState; categories: PropertyFilterCategory<ProjectFilterField>[] }>) {
	const t = useTranslations();
	const applied = appliedFiltersOf(list, categories);
	const hasApplied = applied.length > 0;
	const showsClear = hasApplied || list.hasDateRange;
	if (!showsClear) {
		return null;
	}
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5">
			{applied.map((filter) => (
				<span
					key={`${filter.field}:${filter.value}`}
					className="inline-flex h-7 max-w-64 items-center gap-1.5 rounded-full bg-card pr-1 pl-2.5 text-xs hairline-ring ring-foreground/10"
				>
					<span className="shrink-0 text-muted-foreground">{filter.label}:</span>
					{filter.option?.icon && (
						<span className="flex size-4 shrink-0 items-center justify-center">{filter.option.icon}</span>
					)}
					<span className="truncate font-medium capitalize text-foreground">
						{filter.option?.name ?? filter.value}
					</span>
					<button
						type="button"
						aria-label={t('pages.projects.list.REMOVE_FILTER', {
							value: filter.option?.name ?? filter.value
						})}
						onClick={() => list.removeFilterValue(filter.field, filter.value)}
						className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
					>
						<X className="size-3" />
					</button>
				</span>
			))}
			<button
				type="button"
				onClick={list.clearFilters}
				className="h-7 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
			>
				{t('common.CLEAR_FILTERS')}
			</button>
		</div>
	);
}
