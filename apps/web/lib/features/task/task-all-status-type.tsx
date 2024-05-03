'use client';

import { useCustomEmblaCarousel, useDailyPlan, useSyncRef } from '@app/hooks';
import { ITeamTask, Nullable } from '@app/interfaces';
import { RoundedButton } from 'lib/components';
import { useEffect, useMemo } from 'react';
import {
	TaskStatus,
	useTaskLabelsValue,
	useTaskPrioritiesValue,
	useTaskSizesValue,
	useTaskStatusValue
} from './task-status';
import { clsxm } from '@app/utils';
import { planBadgeContent } from '@app/helpers';
import { CalendarIcon } from '@radix-ui/react-icons';

export function TaskAllStatusTypes({
	task,
	showStatus = false,
	toBlockCard = false,
	className
}: {
	task?: Nullable<ITeamTask>;
	showStatus?: boolean;
	toBlockCard?: boolean;
	className?: string;
}) {
	const taskPriorities = useTaskPrioritiesValue();
	const taskSizes = useTaskSizesValue();
	const taskLabels = useTaskLabelsValue();
	const taskStatus = useTaskStatusValue();

	const { dailyPlan, getAllDayPlans } = useDailyPlan();

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

	useEffect(() => {
		getAllDayPlans();
	}, [getAllDayPlans]);

	const tags = useMemo(() => {
		return (
			task?.tags
				?.map((tag) => {
					return taskLabels[tag.name];
				})
				?.filter(Boolean) || []
		);
	}, [taskLabels, task?.tags]);

	return (
		<div className="relative w-full h-full flex flex-col justify-center">
			<div ref={viewportRef} className="overflow-hidden w-full relative">
				<div className={clsxm('flex space-x-2 h-6 justify-start items-center', className)}>
					{showStatus && task?.status && taskStatus[task?.status] && (
						<TaskStatus
							{...taskStatus[task?.status]}
							className="rounded-[0.625rem]"
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
					{planBadgeContent(dailyPlan.items, task?.id ?? '') && (
						<div className="rounded-md pr-5 pl-4 !py-10 flex items-center gap-2 bg-[#D9EBD7] text-[#4D6194] font-medium">
							<CalendarIcon />
							<span className="text-[10px]">{planBadgeContent(dailyPlan.items, task?.id ?? '')}</span>
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
