import { useCustomEmblaCarousel } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { RoundedButton, Text } from 'lib/components';
import { taskStatus, TaskStatus } from 'lib/features';

export function TaskInfo({ className }: IClassName) {
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
			<Text className="text-sm">
				Working on UI Design & making prototype for user testing tomorrow
			</Text>

			<div className="relative w-full h-full flex flex-col justify-center">
				<div ref={viewportRef} className="overflow-hidden w-full relative">
					<div className="flex space-x-2 mt-2">
						<TaskStatus {...taskStatus['In Review']} name="In Review" />
						<TaskStatus {...taskStatus['Blocked']} name="Blocked" />
						<TaskStatus {...taskStatus['Completed']} name="Completed" />
						<TaskStatus {...taskStatus['Todo']} name="Todo" />
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
