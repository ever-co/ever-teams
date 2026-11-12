'use client';

import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { DisplayRow, PropertyToggle } from '@/core/components/common/display-menu-parts';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowUp, GridView, ListView, SlidersHorizontal } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { ProjectsListState } from '@/core/hooks/projects/use-projects-list-state';
import {
	PROJECT_COLUMNS,
	type ProjectColumn,
	type ProjectGrouping,
	type ProjectOrderField,
	type ProjectsView
} from '@/core/lib/utils/project-list';

const ORDER_FIELDS: ProjectOrderField[] = [
	'name',
	'status',
	'startDate',
	'endDate',
	'createdAt',
	'timeSpent',
	'budgetUsed'
];

const ORDER_LABEL_KEYS: Record<ProjectOrderField, DottedLanguageObjectStringPaths> = {
	name: 'pages.projects.list.ORDER_NAME',
	status: 'common.STATUS',
	startDate: 'common.START_DATE',
	endDate: 'common.END_DATE',
	createdAt: 'pages.projects.list.ORDER_CREATED',
	timeSpent: 'common.TIME_SPENT',
	budgetUsed: 'pages.projects.consumption.ORDER_BUDGET_USED'
};

export const COLUMN_LABEL_KEYS: Record<ProjectColumn, DottedLanguageObjectStringPaths> = {
	status: 'common.STATUS',
	progress: 'common.PROGRESS',
	managers: 'common.MANAGERS',
	members: 'common.MEMBERS',
	teams: 'common.TEAMS',
	dates: 'pages.projects.list.COLUMN_DATES',
	timeSpent: 'common.TIME_SPENT',
	budget: 'pages.projects.list.COLUMN_BUDGET'
};

function directionLabelKey(isDescending: boolean): DottedLanguageObjectStringPaths {
	if (isDescending) {
		return 'pages.projects.list.DESCENDING';
	}
	return 'pages.projects.list.ASCENDING';
}

function isOrderField(value: string): value is ProjectOrderField {
	return ORDER_FIELDS.includes(value as ProjectOrderField);
}

export function ProjectsDisplayMenu({ list }: Readonly<{ list: ProjectsListState }>) {
	const t = useTranslations();
	const isList = list.view === 'LIST';
	const isDescending = list.ordering.desc;
	const directionLabel = t(directionLabelKey(isDescending));
	const offeredOrderFields = ORDER_FIELDS.filter((field) => list.isOrderFieldOffered(field));
	const offeredColumns = PROJECT_COLUMNS.filter((column) => list.isColumnOffered(column));

	const handleOrderField = (value: string) => {
		if (!isOrderField(value)) {
			return;
		}
		list.setOrdering({ id: value, desc: list.ordering.desc });
	};

	const toggleDirection = () => {
		list.setOrdering({ id: list.ordering.id, desc: !list.ordering.desc });
	};

	return (
		<Popover>
			<PopoverTrigger
				render={<Button variant="outline" size="default" aria-label={t('pages.projects.list.DISPLAY')} />}
			>
				<SlidersHorizontal />
				<span className="max-sm:hidden">{t('pages.projects.list.DISPLAY')}</span>
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className="w-80 p-0">
				<div className="p-2">
					<SegmentedControl<ProjectsView>
						items={[
							{ value: 'LIST', label: t('pages.projects.list.VIEW_LIST'), icon: <ListView /> },
							{ value: 'GRID', label: t('pages.projects.list.VIEW_GRID'), icon: <GridView /> }
						]}
						value={list.view}
						onValueChange={list.setView}
						ariaLabel={t('common.VIEW')}
						className="w-full [&>button]:flex-1"
					/>
				</div>
				<div className="hairline-t border-border py-1.5">
					<DisplayRow label={t('pages.projects.list.GROUPING')}>
						<SegmentedControl<ProjectGrouping>
							items={[
								{ value: 'none', label: t('pages.projects.list.GROUP_NONE') },
								{ value: 'status', label: t('common.STATUS') }
							]}
							value={list.grouping}
							onValueChange={list.setGrouping}
							ariaLabel={t('pages.projects.list.GROUPING')}
						/>
					</DisplayRow>
					<DisplayRow label={t('pages.projects.list.ORDERING')}>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={toggleDirection}
								aria-label={directionLabel}
								title={directionLabel}
								className="text-muted-foreground"
							>
								<ArrowUp className={cn('transition-transform', isDescending && 'rotate-180')} />
							</Button>
							<Select value={list.ordering.id} onValueChange={handleOrderField}>
								<SelectTrigger className="h-7 w-36 text-[13px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{offeredOrderFields.map((field) => (
										<SelectItem key={field} value={field}>
											{t(ORDER_LABEL_KEYS[field])}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</DisplayRow>
				</div>
				{isList && (
					<div className="hairline-t border-border px-3 pt-2.5 pb-3">
						<p className="pb-2 text-xs font-medium text-muted-foreground">
							{t('pages.projects.list.DISPLAY_PROPERTIES')}
						</p>
						<div className="flex flex-wrap gap-1.5">
							{offeredColumns.map((column) => (
								<PropertyToggle
									key={column}
									label={t(COLUMN_LABEL_KEYS[column])}
									isOn={list.isColumnVisible(column)}
									onToggle={() => list.toggleColumn(column)}
								/>
							))}
						</div>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
