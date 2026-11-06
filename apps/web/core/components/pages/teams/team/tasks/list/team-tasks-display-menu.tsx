'use client';

import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { DisplayRow, DisplaySwitchRow, PropertyToggle } from '@/core/components/common/display-menu-parts';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowUp, RotateLeft, SlidersHorizontal } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	TEAM_TASK_PROPERTIES,
	type TeamTaskProperty,
	type TeamTasksGrouping,
	type TeamTasksOrdering
} from '@/core/lib/utils/team-tasks-view';
import type { TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';

const GROUPINGS: TeamTasksGrouping[] = ['status', 'priority', 'assignee', 'project', 'issueType', 'none'];

const ORDERINGS: TeamTasksOrdering[] = ['priority', 'updated', 'created', 'dueDate', 'number', 'title'];

const GROUPING_LABEL_KEYS: Record<TeamTasksGrouping, DottedLanguageObjectStringPaths> = {
	status: 'taskMenus.fields.status',
	priority: 'taskMenus.fields.priority',
	assignee: 'common.ASSIGNEE',
	project: 'taskMenus.fields.project',
	issueType: 'taskMenus.fields.issueType',
	none: 'pages.teamTasks.GROUP_NONE'
};

const ORDERING_LABEL_KEYS: Record<TeamTasksOrdering, DottedLanguageObjectStringPaths> = {
	priority: 'taskMenus.fields.priority',
	updated: 'pages.teamTasks.ORDER_UPDATED',
	created: 'pages.taskDetails.CREATED',
	dueDate: 'pages.taskDetails.DUE_DATE',
	number: 'pages.teamTasks.COLUMN_NUMBER',
	title: 'common.TITLE'
};

const PROPERTY_LABEL_KEYS: Record<TeamTaskProperty, DottedLanguageObjectStringPaths> = {
	number: 'pages.teamTasks.COLUMN_NUMBER',
	issueType: 'pages.teamTasks.PROPERTY_TYPE',
	priority: 'taskMenus.fields.priority',
	status: 'taskMenus.fields.status',
	parent: 'pages.teamTasks.PROPERTY_PARENT',
	labels: 'taskMenus.fields.label',
	size: 'taskMenus.fields.size',
	project: 'taskMenus.fields.project',
	progress: 'pages.teamTasks.COLUMN_TIME',
	dueDate: 'pages.taskDetails.DUE_DATE',
	created: 'pages.taskDetails.CREATED',
	assignees: 'pages.taskDetails.ASSIGNEES'
};

function directionLabelKey(isDescending: boolean): DottedLanguageObjectStringPaths {
	if (isDescending) {
		return 'pages.projects.list.DESCENDING';
	}
	return 'pages.projects.list.ASCENDING';
}

function isGrouping(value: string): value is TeamTasksGrouping {
	return GROUPINGS.includes(value as TeamTasksGrouping);
}

function isOrdering(value: string): value is TeamTasksOrdering {
	return ORDERINGS.includes(value as TeamTasksOrdering);
}

/**
 * The list's Display popover (Linear's, circle's display options): grouping, ordering, sub-tasks, empty groups,
 * the properties each row shows, and a reset. A dot on the trigger says the view differs from the default.
 */
export function TeamTasksDisplayMenu({ view }: Readonly<{ view: TeamTasksViewState }>) {
	const t = useTranslations();
	const { settings } = view;
	const directionLabel = t(directionLabelKey(settings.isDescending));
	const isCustomised = !view.isDefaultView;

	const handleGrouping = (value: string | null) => {
		if (!value) {
			return;
		}
		if (!isGrouping(value)) {
			return;
		}
		view.setGrouping(value);
	};
	const handleOrdering = (value: string | null) => {
		if (!value) {
			return;
		}
		if (!isOrdering(value)) {
			return;
		}
		view.setOrdering(value);
	};

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						size="default"
						className="relative"
						aria-label={t('pages.teamTasks.DISPLAY')}
					/>
				}
			>
				<SlidersHorizontal />
				<span className="max-sm:hidden">{t('pages.teamTasks.DISPLAY')}</span>
				{isCustomised && (
					<span
						aria-hidden="true"
						className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-background"
					/>
				)}
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className="w-80 p-0">
				<div className="py-1.5">
					<DisplayRow label={t('pages.teamTasks.GROUPING')}>
						<Select value={settings.grouping} onValueChange={handleGrouping}>
							<SelectTrigger className="h-7 w-40 text-[13px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{GROUPINGS.map((grouping) => (
									<SelectItem key={grouping} value={grouping}>
										{t(GROUPING_LABEL_KEYS[grouping])}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</DisplayRow>
					<DisplayRow label={t('pages.teamTasks.ORDERING')}>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={view.toggleDirection}
								aria-label={directionLabel}
								title={directionLabel}
								className="text-muted-foreground"
							>
								<ArrowUp
									className={cn('transition-transform', settings.isDescending && 'rotate-180')}
								/>
							</Button>
							<Select value={settings.ordering} onValueChange={handleOrdering}>
								<SelectTrigger className="h-7 w-32 text-[13px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ORDERINGS.map((ordering) => (
										<SelectItem key={ordering} value={ordering}>
											{t(ORDERING_LABEL_KEYS[ordering])}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</DisplayRow>
				</div>
				<div className="hairline-t border-border py-1.5">
					<DisplaySwitchRow
						label={t('pages.teamTasks.SHOW_SUB_TASKS')}
						isOn={settings.showsSubTasks}
						onChange={view.setShowsSubTasks}
					/>
					<DisplaySwitchRow
						label={t('pages.teamTasks.SHOW_EMPTY_GROUPS')}
						isOn={settings.showsEmptyGroups}
						onChange={view.setShowsEmptyGroups}
					/>
				</div>
				<div className="hairline-t border-border px-3 pt-2.5 pb-3">
					<p className="pb-2 text-xs font-medium text-muted-foreground">
						{t('pages.teamTasks.DISPLAY_PROPERTIES')}
					</p>
					<div className="flex flex-wrap gap-1.5">
						{TEAM_TASK_PROPERTIES.map((property) => (
							<PropertyToggle
								key={property}
								label={t(PROPERTY_LABEL_KEYS[property])}
								isOn={settings.properties[property]}
								onToggle={() => view.toggleProperty(property)}
							/>
						))}
					</div>
				</div>
				{isCustomised && (
					<div className="flex justify-end hairline-t border-border p-1.5">
						<Button variant="ghost" size="sm" onClick={view.resetView}>
							<RotateLeft />
							{t('pages.teamTasks.RESET_VIEW')}
						</Button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
