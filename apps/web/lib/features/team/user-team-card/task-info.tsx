import { useCustomEmblaCarousel } from '@app/hooks';
import { IClassName, ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { RoundedButton, Text } from 'lib/components';
import { taskStatus, TaskStatus } from 'lib/features';

type Props = IClassName & {
	task: ITeamTask | undefined | null;
};

export function TaskInfo({ className, task }: Props) {
	const {
		viewportRef,
		nextBtnEnabled,
		scrollNext,
		prevBtnEnabled,
		scrollPrev,
	} = useCustomEmblaCarousel(0, {
		dragFree: true,
		containScroll: 'trimSnaps',
	});

	return (
		<div
			className={clsxm(
				'h-full flex flex-col items-start justify-center',
				className
			)}
		>
			{/* task */}
			<div className="max-h-[40px] overflow-hidden w-full">
				<Text className="text-sm text-ellipsis text-center">{task?.title}</Text>
			</div>

			<div className="relative w-full h-full flex flex-col justify-center">
				<div ref={viewportRef} className="overflow-hidden w-full relative">
					<div className="flex space-x-2 mt-2">
						<TaskStatus
							{...taskStatus[task?.status || 'Todo']}
							className="text-xs"
							name={task?.status}
						/>
						<TaskStatus
							{...taskStatus['Blocked']}
							className="text-xs"
							name="Blocked"
						/>
						<TaskStatus
							{...taskStatus['Completed']}
							className="text-xs"
							name="Completed"
						/>
						<TaskStatus
							{...taskStatus['Todo']}
							className="text-xs"
							name="Todo"
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
		</div>
	);
}
