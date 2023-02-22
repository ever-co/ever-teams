import { useCustomEmblaCarousel, useSyncRef } from '@app/hooks';
import { ITeamTask, Nullable } from '@app/interfaces';
import { RoundedButton } from 'lib/components';
import { useEffect } from 'react';
import {
	taskLabels,
	taskSizes,
	taskStatus,
	TaskStatus,
	taskPriorities,
} from './task-status';

export function TaskAllStatusTypes({ task }: { task?: Nullable<ITeamTask> }) {
	const {
		viewportRef,
		nextBtnEnabled,
		scrollNext,
		prevBtnEnabled,
		scrollPrev,
		emblaApi,
	} = useCustomEmblaCarousel(0, {
		dragFree: true,
		containScroll: 'trimSnaps',
	});

	const emblaApiRef = useSyncRef(emblaApi);

	useEffect(() => {
		emblaApiRef.current?.reInit();
	}, [task, emblaApiRef]);

	return (
		<div className="relative w-full h-full flex flex-col justify-center">
			<div ref={viewportRef} className="overflow-hidden w-full relative">
				<div className="flex space-x-2 mt-2">
					<TaskStatus
						{...taskStatus[task?.status || 'Closed']}
						className="text-xs"
						active={!!task?.status}
						name={task?.status || 'Status'}
					/>

					<TaskStatus
						{...taskPriorities[task?.priority || 'Low']}
						className="text-xs"
						active={!!task?.priority}
						name={task?.priority || 'Priority'}
					/>

					<TaskStatus
						{...taskSizes[task?.size || 'Medium']}
						className="text-xs"
						active={!!task?.size}
						name={task?.size || 'Size'}
					/>

					<TaskStatus
						{...taskLabels[task?.label || 'WEB']}
						className="text-xs"
						active={!!task?.label}
						name={task?.label || 'Label'}
					/>
				</div>
			</div>

			{nextBtnEnabled && (
				<RoundedButton
					onClick={scrollNext}
					className={'absolute w-6 h-6 -right-3 -mb-2'}
				>
					{'>'}
				</RoundedButton>
			)}

			{prevBtnEnabled && (
				<RoundedButton
					onClick={scrollPrev}
					className={'absolute w-6 h-6 -left-3  -mb-2'}
				>
					{'<'}
				</RoundedButton>
			)}
		</div>
	);
}
