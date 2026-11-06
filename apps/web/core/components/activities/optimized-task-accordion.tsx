import { memo, useCallback, useMemo, useState } from 'react';
import {
	DAY_GROUP_CONTENT_CLASS_NAME,
	DAY_GROUP_SURFACE_CLASS_NAME,
	DAY_GROUP_TRIGGER_CLASS_NAME,
	DayGroupHeading
} from '@/core/components/tasks/daily-plan/day-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../common/accordion';
import { VirtualizedList } from '../common/virtualized-list';
import { useTranslations } from 'next-intl';
import { ITEMS_LENGTH_TO_VIRTUALIZED } from '@/core/constants/config/constants';
import { useAccordionState } from '@/core/hooks/activities/use-optimized-task-cache';

/** Task rows inside a section card are flat and split by hairlines, never cards inside a card. */
const TASK_ROWS = 'hairline-divide-y divide-border';

interface OptimizedTaskAccordionProps {
	firstFiveTasks: any[];
	remainingTasks: any[];
	totalCount: number;
	profile: any;
	canSeeActivity: boolean;
	useVirtualization?: boolean;
	renderTaskItem: (task: any) => React.ReactNode;
	scrollingIndicator?: React.ReactNode;
}

/**
 * Optimized Task Accordion Component
 * Displays first 5 tasks directly, then remaining tasks in an accordion
 * Uses intelligent caching and virtualization for performance
 */
export const OptimizedTaskAccordion = memo<OptimizedTaskAccordionProps>(
	({
		firstFiveTasks,
		remainingTasks,
		totalCount,
		profile,
		canSeeActivity,
		useVirtualization = false,
		renderTaskItem,
		scrollingIndicator
	}) => {
		const t = useTranslations();
		const { getAccordionState, setAccordionState } = useAccordionState();

		// Determine if virtualization should be used for remaining tasks
		const shouldUseVirtualization = useVirtualization && remainingTasks.length > ITEMS_LENGTH_TO_VIRTUALIZED;

		// Memoized accordion value for first 5 tasks (always open)
		const firstTasksAccordionValue = 'first-tasks';

		// Memoized accordion value for remaining tasks
		const remainingTasksAccordionValue = 'remaining-tasks';

		// Handle accordion state changes
		const handleAccordionChange = useCallback(
			(values: string[]) => {
				setAccordionState(remainingTasksAccordionValue, values.includes(remainingTasksAccordionValue));
			},
			[setAccordionState, remainingTasksAccordionValue]
		);

		// Read once: an uncontrolled accordion must keep the default it started with (getAccordionState changes identity)
		const [initialAccordionValues] = useState(() => {
			const values = [firstTasksAccordionValue];
			const remainingWasOpen = getAccordionState(remainingTasksAccordionValue, false) === true;
			if (remainingWasOpen) {
				values.push(remainingTasksAccordionValue);
			}
			return values;
		});

		// Render first 5 tasks directly
		const renderFirstFiveTasks = useMemo(
			() => (
				<ul className={TASK_ROWS}>
					{firstFiveTasks.map((task, index) => (
						<li key={`first-${task.id}-${index}`}>{renderTaskItem(task)}</li>
					))}
				</ul>
			),
			[firstFiveTasks, renderTaskItem]
		);

		// Render remaining tasks with virtualization if needed
		const renderRemainingTasks = useMemo(() => {
			if (remainingTasks.length === 0) return null;

			return shouldUseVirtualization ? (
				<VirtualizedList
					items={remainingTasks}
					itemHeight={120}
					containerHeight={400}
					useVirtualization={true}
					useSmoothVirtualization={false} // Keep this disabled to prevent issues
					renderItem={renderTaskItem}
					className="w-full"
					listClassName={TASK_ROWS}
					itemClassName=""
					listTag="ul"
					itemTag="li"
					scrollingIndicator={scrollingIndicator}
				/>
			) : (
				<ul className={TASK_ROWS}>
					{remainingTasks.map((task, index) => (
						<li key={`remaining-${task.id}-${index}`}>{renderTaskItem(task)}</li>
					))}
				</ul>
			);
		}, [remainingTasks, shouldUseVirtualization, renderTaskItem, scrollingIndicator]);

		if (!canSeeActivity || totalCount === 0) {
			return null;
		}

		return (
			<div className="flex flex-col gap-2">
				{/* Accordion for organized task display */}
				<Accordion
					type="multiple"
					className="flex flex-col gap-3 text-sm"
					defaultValue={initialAccordionValues}
					onValueChange={handleAccordionChange}
				>
					{/* First 5 tasks - Always visible and open */}
					{firstFiveTasks.length > 0 && (
						<AccordionItem value={firstTasksAccordionValue} className={DAY_GROUP_SURFACE_CLASS_NAME}>
							<AccordionTrigger className={DAY_GROUP_TRIGGER_CLASS_NAME}>
								<DayGroupHeading
									date={
										<span className="flex items-baseline gap-2">
											{t('common.RECENT_TASKS')}
											<span className="text-xs font-normal text-muted-foreground">
												{t('common.LAST_24_HOURS')}
											</span>
										</span>
									}
									count={firstFiveTasks.length}
								/>
							</AccordionTrigger>
							<AccordionContent className={DAY_GROUP_CONTENT_CLASS_NAME}>
								{renderFirstFiveTasks}
							</AccordionContent>
						</AccordionItem>
					)}

					{/* Remaining tasks - Collapsible */}
					{remainingTasks.length > 0 && (
						<AccordionItem value={remainingTasksAccordionValue} className={DAY_GROUP_SURFACE_CLASS_NAME}>
							<AccordionTrigger className={DAY_GROUP_TRIGGER_CLASS_NAME}>
								<DayGroupHeading date={t('common.OLDER_TASKS')} count={remainingTasks.length} />
							</AccordionTrigger>
							<AccordionContent className={DAY_GROUP_CONTENT_CLASS_NAME}>
								{renderRemainingTasks}
							</AccordionContent>
						</AccordionItem>
					)}
				</Accordion>
			</div>
		);
	}
);

OptimizedTaskAccordion.displayName = 'OptimizedTaskAccordion';
