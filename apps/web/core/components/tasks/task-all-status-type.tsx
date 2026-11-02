'use client';

import { useCustomEmblaCarousel, useTaskStatusValue } from '@/core/hooks';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { TaskStatus } from './task-status';
import { clsxm } from '@/core/lib/utils';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import { planBadgeContent, planBadgeContPast } from '@/core/lib/helpers/index';
import { Calendar, ChevronLeft, ChevronRight } from '@/core/components/icons';
import { FilterTabs } from '../users/user-profile-plans';
import { useAtomValue } from 'jotai';
import { Nullable } from '@/core/types/generics/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useTaskPrioritiesValue } from '@/core/hooks/tasks/use-task-priorities-value';
import { useTaskSizesValue } from '@/core/hooks/tasks/use-task-sizes-value';
import { useTaskLabelsValue } from '@/core/hooks/tasks/use-task-labels-value';
import { dailyPlanListState } from '@/core/stores';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { TOrganizationProject } from '@/core/types/schemas';
import { dataColorChipStyle, isPaintableColor } from './task-data-color';
import { TaskPropertyIcon } from './task-property-icon';

const ASSIGNED_CHIP_RECIPE = 'chip-3d flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium';

function planBadgeToneClassName(isOverdue: boolean) {
	if (isOverdue) {
		return '[--chip:hsl(var(--destructive))]';
	}
	return '[--chip:hsl(var(--success))]';
}

function projectChipStyle(project: TOrganizationProject) {
	if (!isPaintableColor(project.color)) {
		return undefined;
	}
	return dataColorChipStyle(project.color);
}

/**
 * The arrows of the label strip sit inside its bounds (a cell or a card clips anything outside), as small key caps
 * over a fade, so the labels slide under them instead of being cut.
 */
const STRIP_SCROLL_BUTTON =
	'keycap-3d absolute top-1/2 z-10 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3';

const FADE_BOTH_SIDES =
	'[mask-image:linear-gradient(to_right,transparent,black_28px,black_calc(100%-28px),transparent)]';
const FADE_END = '[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]';
const FADE_START = '[mask-image:linear-gradient(to_right,transparent,black_28px)]';

function stripFadeClassName(canScrollBack: boolean, canScrollForward: boolean) {
	if (canScrollBack && canScrollForward) {
		return FADE_BOTH_SIDES;
	}
	if (canScrollForward) {
		return FADE_END;
	}
	if (canScrollBack) {
		return FADE_START;
	}
	return '';
}

export function TaskAllStatusTypes({
	task,
	showStatus = false,
	toBlockCard = false,
	className,
	tab,
	dayPlanTab
}: {
	tab?: 'default' | 'unassign' | 'dailyplan';
	dayPlanTab?: FilterTabs;
	task?: Nullable<TTask>;
	showStatus?: boolean;
	toBlockCard?: boolean;
	className?: string;
}) {
	const t = useTranslations();
	const taskPriorities = useTaskPrioritiesValue();
	const taskSizes = useTaskSizesValue();
	const taskLabels = useTaskLabelsValue();
	const taskStatus = useTaskStatusValue();
	const { organizationProjects: projects } = useOrganizationProjectsQuery();
	const taskProject = useMemo(
		() => (task ? projects.find((project) => project.tasks?.some((el: TTask) => el.id === task.id)) : null),
		[projects, task]
	);
	const dailyPlan = useAtomValue(dailyPlanListState);

	const { viewportRef, nextBtnEnabled, scrollNext, prevBtnEnabled, scrollPrev, emblaApi } = useCustomEmblaCarousel(
		0,
		{
			dragFree: true,
			containScroll: 'trimSnaps'
		}
	);

	const emblaApiRef = useSyncRef(emblaApi);

	useEffect(() => {
		emblaApiRef.current?.reInit();
	}, [task, emblaApiRef]);

	const tags = useMemo(() => {
		return (
			task?.tags
				?.map((tag) => {
					return taskLabels[tag.name];
				})
				?.filter(Boolean) || []
		);
	}, [taskLabels, task?.tags]);

	const taskId = task ? planBadgeContPast(dailyPlan.items, task.id) : '';
	const isPastPlanTab = dayPlanTab === 'Past Tasks';
	const isOverduePlan = isPastPlanTab || Boolean(taskId);

	return (
		<div className="flex relative flex-col justify-center w-full h-full">
			<div
				ref={viewportRef}
				className={clsxm(
					'overflow-hidden relative -my-1 w-full py-1',
					stripFadeClassName(prevBtnEnabled, nextBtnEnabled)
				)}
			>
				<div className={clsxm('flex justify-start items-center space-x-1.5 h-6', className)}>
					{showStatus && task?.status && taskStatus[task?.status] && (
						<TaskStatus
							{...taskStatus[task?.status]}
							active={!!task?.status}
							name={task?.status?.split('-').join(' ') || 'Status'}
						/>
					)}
					{task?.priority && (
						<TaskStatus
							{...taskPriorities[task?.priority || 'Low']}
							active={!!task?.priority}
							name={task?.priority?.split('-').join(' ') || 'Priority'}
						/>
					)}
					{task?.size && !toBlockCard && (
						<TaskStatus
							{...taskSizes[task?.size || 'Medium']}
							active={!!task?.size}
							name={task?.size?.split('-').join(' ') || 'Size'}
						/>
					)}
					{taskProject && (
						<div
							style={projectChipStyle(taskProject)}
							className={clsxm(
								ASSIGNED_CHIP_RECIPE,
								'justify-center [--chip:hsl(var(--muted-foreground))]'
							)}
						>
							<TaskPropertyIcon kind="project" color={taskProject.color} className="size-3.5" />
							<span className="truncate">{taskProject.name}</span>
						</div>
					)}
					{planBadgeContent(dailyPlan.items, task?.id ?? '', tab) && (
						<div className={clsxm(ASSIGNED_CHIP_RECIPE, planBadgeToneClassName(isOverduePlan))}>
							<Calendar className="size-3.5 shrink-0" />
							<span className="text-nowrap whitespace-nowrap">
								{planBadgeContent(dailyPlan.items, task?.id ?? '', tab)}
							</span>
						</div>
					)}
					{tags.map((tag, i) => {
						return <TaskStatus key={i} {...tag} active={true} name={tag.name?.split('-').join(' ')} />;
					})}
				</div>
			</div>

			{nextBtnEnabled && (
				<button
					type="button"
					onClick={scrollNext}
					aria-label={t('common.NEXT')}
					className={clsxm(STRIP_SCROLL_BUTTON, 'right-0')}
				>
					<ChevronRight />
				</button>
			)}

			{prevBtnEnabled && (
				<button
					type="button"
					onClick={scrollPrev}
					aria-label={t('common.PREV')}
					className={clsxm(STRIP_SCROLL_BUTTON, 'left-0')}
				>
					<ChevronLeft />
				</button>
			)}
		</div>
	);
}
