'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronRight } from '@/core/components/icons';
import { useTaskSettingsAccess } from '@/core/hooks/tasks/use-task-settings-access';
import { cn } from '@/core/lib/helpers';
import type { KanbanLane } from '@/core/lib/utils/kanban-board';
import { useKanbanBoardContext } from './kanban-board-context';
import { isCardData, laneBodyData } from './kanban-dnd';
import { KanbanStatusTile, statusLabelOf } from './kanban-lane';

function HiddenLaneRow({ lane }: Readonly<{ lane: KanbanLane }>) {
	const t = useTranslations();
	const { setLaneCollapsed } = useKanbanBoardContext();
	const { canWriteRow, readOnlyHint } = useTaskSettingsAccess();
	const isStatusReadOnly = !canWriteRow(lane.status);
	let expandHint: string | undefined;
	if (isStatusReadOnly) {
		expandHint = readOnlyHint;
	}
	const ref = useRef<HTMLLIElement>(null);
	const [isCardOver, setIsCardOver] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}
		return dropTargetForElements({
			element,
			canDrop: ({ source }) => isCardData(source.data),
			getData: () => laneBodyData(lane.status.id),
			onDragEnter: () => setIsCardOver(true),
			onDragLeave: () => setIsCardOver(false),
			onDrop: () => setIsCardOver(false)
		});
	}, [lane.status.id]);

	return (
		<li
			ref={ref}
			className={cn(
				'flex h-9 items-center gap-2 rounded-lg bg-card pr-1 pl-2.5 hairline-ring ring-border transition-[box-shadow,background-color]',
				isCardOver && 'bg-primary/[0.05] ring-primary/40'
			)}
		>
			<KanbanStatusTile status={lane.status} />
			<span className="min-w-0 flex-1 truncate text-[13px] font-medium capitalize text-foreground">
				{statusLabelOf(lane.status)}
			</span>
			<span className="text-xs tabular-nums text-muted-foreground">{lane.tasks.length}</span>
			<Button
				variant="ghost"
				size="icon-sm"
				className="size-6 text-muted-foreground"
				aria-label={t('common.EXPAND_COLUMN')}
				title={expandHint}
				disabled={isStatusReadOnly}
				onClick={() => setLaneCollapsed(lane.status, false)}
			>
				<ChevronRight className="size-4" />
			</Button>
		</li>
	);
}

/**
 * Collapsed statuses, gathered in one narrow column at the end of the board (Linear's "Hidden columns"): each row
 * keeps its count, still takes a dropped card, and expands back in place.
 */
export function KanbanHiddenLanes({ lanes }: Readonly<{ lanes: KanbanLane[] }>) {
	const t = useTranslations();
	return (
		<section aria-label={t('pages.kanban.HIDDEN_COLUMNS')} className="flex w-60 shrink-0 flex-col gap-2 pt-3">
			<h2 className="px-1 text-xs font-medium text-muted-foreground">{t('pages.kanban.HIDDEN_COLUMNS')}</h2>
			<ul className="flex flex-col gap-1.5">
				{lanes.map((lane) => (
					<HiddenLaneRow key={lane.status.id} lane={lane} />
				))}
			</ul>
		</section>
	);
}
