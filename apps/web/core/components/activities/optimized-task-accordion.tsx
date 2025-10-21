import { memo, useCallback, useMemo } from 'react';
import { Text, Divider } from '@/core/components';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../common/accordion';
import { VirtualizedList } from '../common/virtualized-list';
import { useTranslations } from 'next-intl';
import { ITEMS_LENGTH_TO_VIRTUALIZED } from '@/core/constants/config/constants';
import { useAccordionState } from '@/core/hooks/activities/use-optimized-task-cache';

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

		// Memoized default values for accordion
		const defaultAccordionValues = useMemo(() => {
			const values = [firstTasksAccordionValue]; // First 5 tasks always open by default
			// Remaining tasks are closed by default (false) - only open if user has explicitly opened them
			if (getAccordionState(remainingTasksAccordionValue, false) === true) {
				values.push(remainingTasksAccordionValue);
			}
			return values;
		}, [firstTasksAccordionValue, remainingTasksAccordionValue, getAccordionState]);

		// Render first 5 tasks directly
		const renderFirstFiveTasks = useMemo(
			() => (
				<ul className="flex flex-col gap-6">
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
					listClassName="flex flex-col gap-6"
					itemClassName="px-1 pb-6"
					listTag="ul"
					itemTag="li"
					scrollingIndicator={scrollingIndicator}
				/>
			) : (
				<ul className="flex flex-col gap-6">
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
			<div className="space-y-6">
				{/* Header with total count */}
				<div className="flex items-center space-x-2">
					<Text className="font-normal">
						{t('common.LAST_24_HOURS')} ({totalCount})
					</Text>
					<Divider className="flex-1" />
				</div>

				{/* Accordion for organized task display */}
				<Accordion
					type="multiple"
					className="text-sm space-y-4"
					defaultValue={defaultAccordionValues}
					onValueChange={handleAccordionChange}
				>
					{/* First 5 tasks - Always visible and open */}
					{firstFiveTasks.length > 0 && (
						<AccordionItem
							value={firstTasksAccordionValue}
							className="border border-gray-200 dark:border-gray-700 rounded-lg"
						>
							<AccordionTrigger className="px-4 py-3 hover:no-underline">
								<div className="flex items-center justify-between w-full">
									<Text className="font-medium text-left">
										{t('common.RECENT_TASKS')} ({firstFiveTasks.length})
									</Text>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-4 pb-4">{renderFirstFiveTasks}</AccordionContent>
						</AccordionItem>
					)}

					{/* Remaining tasks - Collapsible */}
					{remainingTasks.length > 0 && (
						<AccordionItem
							value={remainingTasksAccordionValue}
							className="border border-gray-200 dark:border-gray-700 rounded-lg"
						>
							<AccordionTrigger className="px-4 py-3 hover:no-underline">
								<div className="flex items-center justify-between w-full">
									<Text className="font-medium text-left">
										{t('common.OLDER_TASKS')} ({remainingTasks.length})
									</Text>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-4 pb-4">{renderRemainingTasks}</AccordionContent>
						</AccordionItem>
					)}
				</Accordion>
			</div>
		);
	}
);

OptimizedTaskAccordion.displayName = 'OptimizedTaskAccordion';
