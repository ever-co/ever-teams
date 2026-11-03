'use client';

import { type ReactNode, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { ExportMenu, type ExportOption } from '@/core/components/dashboards/kit/export-menu';
import { PeriodPicker } from '@/core/components/dashboards/kit/period-picker';
import { TOOLBAR_SEPARATOR } from '@/core/components/dashboards/kit/recipes';
import { ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { EntityTile } from '@/core/components/common/entity-tile';
import {
	PropertyFilterMenu,
	type PropertyFilterCategory,
	type PropertyFilterOption
} from '@/core/components/tasks/property-filter-menu';
import { Users, UsersGroup, X } from '@/core/components/icons';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import { TEAM_WEEK_STARTS_ON, type TeamFilterField, type TeamPerson } from '@/core/lib/utils/dashboards/team';
import type { TOrganizationTeam } from '@/core/types/schemas';
import { MemberFace } from './team-marks';
import { TEAM_FILTER_PILL_WIDTH } from './team-dashboard-page-skeleton';

function teamOptionOf(team: TOrganizationTeam): PropertyFilterOption {
	return {
		value: team.id ?? '',
		name: team.name ?? '',
		icon: (
			<EntityTile
				name={team.name}
				color={team.color}
				imageUrl={team.image?.thumbUrl}
				className="size-4 text-[7px]"
			/>
		)
	};
}

function memberOptionOf(person: TeamPerson, unnamedLabel: string): PropertyFilterOption {
	const name = person.name || unnamedLabel;
	return {
		value: person.employeeId,
		name,
		icon: <MemberFace name={name} imageUrl={person.imageUrl} />
	};
}

function useTeamFilterCategories(dashboard: TeamDashboardState) {
	const t = useTranslations();
	const { teamOptions, memberOptions, canManage } = dashboard;
	return useMemo(() => {
		const categories: PropertyFilterCategory<TeamFilterField>[] = [];
		const teams = teamOptions.filter((team) => Boolean(team.id));
		const hasTeams = teams.length > 0;
		if (hasTeams) {
			const options = teams.map(teamOptionOf);
			categories.push({
				field: 'teams',
				icon: <UsersGroup />,
				label: t('common.TEAMS'),
				options,
				keepsCase: true
			});
		}
		if (canManage) {
			const unnamedLabel = t('dashboard.team.UNNAMED_MEMBER');
			const options = memberOptions.map((person) => memberOptionOf(person, unnamedLabel));
			categories.push({
				field: 'members',
				icon: <Users />,
				label: t('common.MEMBERS'),
				options,
				keepsCase: true
			});
		}
		return categories;
	}, [canManage, memberOptions, t, teamOptions]);
}

interface AppliedFilter {
	field: TeamFilterField;
	value: string;
	label: string;
	option: PropertyFilterOption | undefined;
}

function appliedFiltersOf(
	categories: ReadonlyArray<PropertyFilterCategory<TeamFilterField>>,
	filters: TeamDashboardState['filters']
) {
	const applied: AppliedFilter[] = [];
	for (const category of categories) {
		for (const value of filters[category.field]) {
			const option = category.options.find((candidate) => candidate.value === value);
			applied.push({ field: category.field, value, label: category.label, option });
		}
	}
	return applied;
}

const CHIP =
	'inline-flex h-7 max-w-64 items-center gap-1.5 rounded-full bg-card pr-1 pl-2.5 text-xs hairline-ring ring-foreground/10';

const CHIP_REMOVE =
	'flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

const CLEAR_BUTTON =
	'h-7 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

function AppliedTeamFilters({
	applied,
	onRemove,
	onClear
}: Readonly<{
	applied: ReadonlyArray<AppliedFilter>;
	onRemove: (field: TeamFilterField, value: string) => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	if (applied.length === 0) {
		return null;
	}
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5 pb-3">
			{applied.map((filter) => {
				const valueName = filter.option?.name ?? filter.value;
				return (
					<span key={`${filter.field}:${filter.value}`} className={CHIP}>
						<span className="shrink-0 text-muted-foreground">{filter.label}:</span>
						{filter.option?.icon && (
							<span className="flex size-4 shrink-0 items-center justify-center">
								{filter.option.icon}
							</span>
						)}
						<span className="truncate font-medium text-foreground">{valueName}</span>
						<button
							type="button"
							aria-label={t('dashboard.team.filters.REMOVE', { value: valueName })}
							onClick={() => onRemove(filter.field, filter.value)}
							className={CHIP_REMOVE}
						>
							<X className="size-3" />
						</button>
					</span>
				);
			})}
			<button type="button" onClick={onClear} className={CLEAR_BUTTON}>
				{t('common.CLEAR_FILTERS')}
			</button>
		</div>
	);
}

function ToolbarMeta({ periodText, memberCount }: Readonly<{ periodText: string; memberCount: number | null }>) {
	const t = useTranslations();
	const hasMemberCount = memberCount !== null;
	return (
		<span className="inline-flex items-center gap-1.5">
			<span>{periodText}</span>
			{hasMemberCount && (
				<>
					<span aria-hidden="true">·</span>
					<span>{t('dashboard.team.META_MEMBERS', { count: memberCount })}</span>
				</>
			)}
		</span>
	);
}

function memberCountOf(employeesCount: number | undefined) {
	if (typeof employeesCount !== 'number') {
		return null;
	}
	return employeesCount;
}

export function TeamToolbar({
	dashboard,
	exportOptions
}: Readonly<{ dashboard: TeamDashboardState; exportOptions: ReadonlyArray<ExportOption> }>) {
	const t = useTranslations();
	const locale = useLocale();
	const categories = useTeamFilterCategories(dashboard);
	const applied = appliedFiltersOf(categories, dashboard.filters);
	const hasCategories = categories.length > 0;
	const periodText = formatPeriod(dashboard.period, locale);
	const memberCount = memberCountOf(dashboard.counts?.employeesCount);
	const hasRows = dashboard.rows.length > 0;

	const isFilterPending = !dashboard.areTeamsSettled;
	const showsFilterSlot = hasCategories || isFilterPending;
	let filterMenu: ReactNode = null;
	if (isFilterPending) {
		filterMenu = <ToolbarPills widths={[TEAM_FILTER_PILL_WIDTH]} />;
	}
	if (hasCategories) {
		filterMenu = (
			<PropertyFilterMenu
				categories={categories}
				selection={dashboard.filters}
				onChange={dashboard.setFilter}
				onClear={dashboard.clearFilters}
			/>
		);
	}

	return (
		<DashboardToolbar
			title={t('dashboard.TEAM_DASHBOARD')}
			meta={<ToolbarMeta periodText={periodText} memberCount={memberCount} />}
			isUpdating={dashboard.isUpdating}
			updatingLabel={t('dashboard.team.UPDATING')}
			actions={<ExportMenu options={exportOptions} isDisabled={!hasRows} />}
			controls={
				<>
					<PeriodPicker
						value={dashboard.period}
						onChange={dashboard.setPeriod}
						weekStartsOn={TEAM_WEEK_STARTS_ON}
					/>
					{showsFilterSlot && <span aria-hidden="true" className={TOOLBAR_SEPARATOR} />}
					{filterMenu}
				</>
			}
			belowControls={
				<AppliedTeamFilters
					applied={applied}
					onRemove={dashboard.removeFilterValue}
					onClear={dashboard.clearFilters}
				/>
			}
		/>
	);
}
