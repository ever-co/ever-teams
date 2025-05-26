'use client';

import { useCustomEmblaCarousel, useDailyPlan, useSyncRef, useTaskStatusValue } from '@/core/hooks';
import { ITask } from '@/core/types/interfaces/task/ITask';
import { RoundedButton } from '@/core/components';
import { useEffect, useMemo } from 'react';
import { TaskStatus, useTaskLabelsValue, useTaskPrioritiesValue, useTaskSizesValue } from './task-status';
import { clsxm } from '@/core/lib/utils';
import { planBadgeContent, planBadgeContPast } from '@/core/lib/helpers/index';
import { CalendarIcon } from '@radix-ui/react-icons';
import { FilterTabs } from '../users/user-profile-plans';
import ProjectIcon from '@/core/components/svgs/project-icon';
import { useAtomValue } from 'jotai';
import { organizationProjectsState } from '@/core/stores/projects/organization-projects';
import { Nullable } from '@/core/types/generics/utils';

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
	task?: Nullable<ITask>;
	showStatus?: boolean;
	toBlockCard?: boolean;
	className?: string;
}) {
	const taskPriorities = useTaskPrioritiesValue();
	const taskSizes = useTaskSizesValue();
	const taskLabels = useTaskLabelsValue();
	const taskStatus = useTaskStatusValue();
	const projects = useAtomValue(organizationProjectsState);
	const taskProject = useMemo(
		() => (task ? projects.find((project) => project.tasks?.some((el: ITask) => el.id === task.id)) : null),
		[projects, task]
	);

	const { dailyPlan } = useDailyPlan();

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

	return (
		<div className="relative flex flex-col justify-center w-full h-full">
			<div ref={viewportRef} className="relative w-full overflow-hidden">
				<div className={clsxm('flex space-x-2 h-6 justify-start items-center', className)}>
					{showStatus && task?.status && taskStatus[task?.status] && (
						<TaskStatus
							{...taskStatus[task?.status]}
							className="!rounded-[0.625rem]"
							active={!!task?.status}
							name={task?.status?.split('-').join(' ') || 'Status'}
							titleClassName={'text-[0.625rem] font-[500]'}
						/>
					)}
					{task?.priority && (
						<TaskStatus
							{...taskPriorities[task?.priority || 'Low']}
							className="rounded-[0.625rem]"
							active={!!task?.priority}
							name={task?.priority?.split('-').join(' ') || 'Priority'}
							titleClassName={'text-[0.625rem] font-[500]'}
						/>
					)}
					{task?.size && !toBlockCard && (
						<TaskStatus
							{...taskSizes[task?.size || 'Medium']}
							className="rounded-[0.625rem]"
							active={!!task?.size}
							name={task?.size?.split('-').join(' ') || 'Size'}
							titleClassName={'text-[0.625rem] font-[500]'}
						/>
					)}
					{taskProject && (
						<div className="flex items-center justify-center h-full gap-1 px-2 bg-slate-200">
							<ProjectIcon /> <span className="text-xs truncate ">{taskProject.name}</span>
						</div>
					)}
					{planBadgeContent(dailyPlan.items, task?.id ?? '', tab) && (
						<div
							className={clsxm(
								dayPlanTab === 'Past Tasks'
									? 'bg-red-600 text-white'
									: taskId
										? 'bg-[#e32929] text-[#f9fbff]'
										: 'bg-[#D9EBD7] text-[#4D6194]',
								'px-4 !py-4 rounded-lg flex items-center gap-2 font-medium'
							)}
						>
							<CalendarIcon />
							<span className="text-[10px] text-nowrap whitespace-nowrap">
								{planBadgeContent(dailyPlan.items, task?.id ?? '', tab)}
							</span>
						</div>
					)}
					{tags.map((tag, i) => {
						return (
							<TaskStatus
								key={i}
								{...tag}
								className="rounded-[0.625rem]"
								active={true}
								name={tag.name?.split('-').join(' ')}
								titleClassName={'text-[0.625rem] font-[500]'}
							/>
						);
					})}
				</div>
			</div>

			{nextBtnEnabled && (
				<RoundedButton onClick={scrollNext} className={'absolute w-6 h-6 -right-3'}>
					{'>'}
				</RoundedButton>
			)}

			{prevBtnEnabled && (
				<RoundedButton onClick={scrollPrev} className={'absolute w-6 h-6 -left-3'}>
					{'<'}
				</RoundedButton>
			)}
		</div>
	);
}
