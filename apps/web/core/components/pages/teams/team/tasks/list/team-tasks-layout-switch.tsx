'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { availableTeamTasksLayouts, shownTeamTasksLayout } from '@/core/lib/utils/team-tasks-layouts';
import type { TeamTasksLayout } from '@/core/lib/utils/team-tasks-view';
import type { TeamTasksViewState } from '@/core/hooks/tasks/use-team-tasks-view';
import { TEAM_TASKS_LAYOUT_OPTIONS } from './team-tasks-layout-options';

/**
 * The page's view switch: the same tasks as a list, a Kanban board, a calendar, a table or a timeline, one click
 * apart. Each option carries its name from `xl` (its glyph alone below, the name kept for screen readers) and a
 * tooltip that says what the view shows.
 */
export function TeamTasksLayoutSwitch({ view }: Readonly<{ view: TeamTasksViewState }>) {
	const t = useTranslations();
	const layouts = availableTeamTasksLayouts();
	const shownLayout = shownTeamTasksLayout(view.settings);

	const hints = useMemo(() => {
		const byLayout = new Map<string, string>();
		for (const layout of layouts) {
			byLayout.set(layout, t(TEAM_TASKS_LAYOUT_OPTIONS[layout].hintKey));
		}
		return byLayout;
	}, [layouts, t]);

	const items = useMemo<SegmentedControlItem<TeamTasksLayout>[]>(
		() =>
			layouts.map((layout) => {
				const { Icon, labelKey } = TEAM_TASKS_LAYOUT_OPTIONS[layout];
				const name = t(labelKey);
				return {
					value: layout,
					icon: <Icon />,
					label: <span className="max-xl:sr-only">{name}</span>
				};
			}),
		[layouts, t]
	);

	return (
		<SegmentedControl
			items={items}
			value={shownLayout}
			onValueChange={view.setLayout}
			ariaLabel={t('pages.teamTasks.LAYOUT')}
			renderItem={(item, button) => (
				<Tooltip
					label={hints.get(item.value) ?? ''}
					placement="bottom"
					className="z-20"
					labelContainerClassName="w-fit! max-w-64"
				>
					{button}
				</Tooltip>
			)}
		/>
	);
}
