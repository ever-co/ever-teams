import { useCustomEmblaCarousel, useSyncRef } from '@app/hooks';
import { ITeamTask, Nullable } from '@app/interfaces';
import { RoundedButton } from 'lib/components';
import { useEffect } from 'react';
import {
	taskDevices,
	taskProperties,
	taskSizes,
	taskStatus,
	TaskStatus,
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
					{task?.status && (
						<TaskStatus
							{...taskStatus[task?.status]}
							className="text-xs"
							name={task?.status || 'Status'}
						/>
					)}

					<TaskStatus
						{...taskProperties['Low']}
						className="text-xs"
						name="Low"
					/>

					<TaskStatus
						{...taskSizes['Extra Large']}
						className="text-xs"
						name="Completed"
					/>

					<TaskStatus
						{...taskDevices['Tablet']}
						className="text-xs"
						name="Tablet"
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
