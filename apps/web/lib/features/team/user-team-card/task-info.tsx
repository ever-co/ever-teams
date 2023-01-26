import { I_TMCardTaskEditHook, useCustomEmblaCarousel } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { RoundedButton, Tooltip } from 'lib/components';
import {
	taskDevices,
	TaskInput,
	taskProperties,
	taskSizes,
	taskStatus,
	TaskStatus,
} from 'lib/features';
import { useEffect } from 'react';

type Props = IClassName & {
	edition: I_TMCardTaskEditHook;
};

export function TaskInfo({ className, edition }: Props) {
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
					edition.editMode ? ['mb-2'] : ['overflow-hidden']
				)}
			>
				<TaskDetailAndEdition edition={edition} />
			</div>

			<TaskStatusInfo edition={edition} />
		</div>
	);
}

function TaskDetailAndEdition({ edition }: { edition: I_TMCardTaskEditHook }) {
	const task = edition.task;
	const canEdit = edition.editMode && !!task;

	edition.taskEditIgnoreElement.onOutsideClick(() => {
		edition.setEditMode(false);
	});

	return (
		<>
			{/* Task value */}
			<div
				ref={edition.taskEditIgnoreElement.targetEl}
				className={clsxm(
					'text-sm text-ellipsis text-center cursor-default overflow-hidden',
					edition.editMode && ['hidden']
				)}
				onDoubleClick={() => edition.setEditMode(true)}
			>
				<Tooltip
					label={task?.title || ''}
					placement="top"
					enabled={(task?.title && task?.title.length > 60) || false}
				>
					{task?.title}
				</Tooltip>
			</div>

			{/* Show task input combobox when in edit mode */}
			<div
				ref={edition.taskEditIgnoreElement.ignoreElementRef}
				className={clsxm(!canEdit && ['hidden'])}
			>
				{canEdit && (
					<TaskInput
						task={task}
						initEditMode={true}
						keepOpen={true}
						onTaskClick={(e) => {
							console.log(e);
						}}
					/>
				)}
			</div>
		</>
	);
}

function TaskStatusInfo({ edition }: { edition: I_TMCardTaskEditHook }) {
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

	const task = edition.task;

	useEffect(() => {
		emblaApi?.reInit();
	}, [task]);

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
