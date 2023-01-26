import { I_TMCardTaskEditHook, useCustomEmblaCarousel } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { RoundedButton, Text } from 'lib/components';
import { TaskInput, taskStatus, TaskStatus } from 'lib/features';

type Props = IClassName & {
	edition: I_TMCardTaskEditHook;
};

export function TaskInfo({ className, edition }: Props) {
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

	const task = edition.task;

	return (
		<div
			className={clsxm(
				'h-full flex flex-col items-start justify-center',
				className
			)}
		>
			{/* task */}
			<div
				className={clsxm(
					'w-full h-[40px]',
					edition.editMode
						? ['mb-2']
						: ['overflow-hidden flex justify-center items-center']
				)}
			>
				{/* Task value */}
				{!edition.editMode && (
					<Text
						className="text-sm text-ellipsis text-center cursor-default"
						onDoubleClick={() => edition.setEditMode(true)}
					>
						{task?.title}
					</Text>
				)}

				{/* Show task input combobox when in edit mode */}
				{edition.editMode && task && (
					<TaskInput
						task={task}
						initEditMode={true}
						onCloseCombobox={() => edition.setEditMode(false)}
						onEnterKey={(e, task) => {
							console.log(e, task);
						}}
						onTaskClick={(e) => {
							console.log(e);
						}}
					/>
				)}
			</div>

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
