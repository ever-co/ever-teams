'use client';

import { useCallbackRef } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { EditPenBoxIcon, CheckCircleTickIcon as TickSaveIcon, LoadingIcon } from 'assets/svg';
import { MouseEvent, RefObject, useCallback, useEffect, useRef } from 'react';
import { TimeInputField } from '../duplicated-components/_input';
import { useTaskMemberEstimation } from '@/core/hooks/tasks/use-task-member-estimation';
import { TrashIcon } from 'lucide-react';
import { TCreateTaskEstimation, TTaskEstimation } from '@/core/types/schemas/task/task-estimation.schema';

type Props = {
	taskEstimation: TTaskEstimation | TCreateTaskEstimation;
	onCloseEdition?: () => void;
	onOpenEdition?: () => void;
	className?: string;
	loadingRef?: RefObject<boolean>;
	closeable_fc?: () => void;
	wrapperClassName?: string;
	showEditAndSaveButton?: boolean;
	onSuccess?: () => void;
};

export function TaskMemberEstimate({
	taskEstimation,
	onCloseEdition,
	onOpenEdition,
	className,
	loadingRef,
	closeable_fc,
	wrapperClassName,
	showEditAndSaveButton = true,
	onSuccess
}: Props) {
	const {
		value,
		onChange,
		handleSubmit,
		handleFocus,
		taskEstimation: estimation,
		handleBlur,
		handleFocusMinutes,
		handleBlurMinutes,
		editTaskEstimationLoading,
		addTaskEstimationLoading,
		editableMode,
		setEditableMode,
		deleteTaskEstimationLoading,
		deleteTaskEstimationMutation
	} = useTaskMemberEstimation(taskEstimation);
	const onCloseEditionRef = useCallbackRef(onCloseEdition);
	const onOpenEditionRef = useCallbackRef(onOpenEdition);
	const closeable_fcRef = useCallbackRef(closeable_fc);
	const hourRef = useRef<HTMLInputElement | null>(null);
	const minRef = useRef<HTMLInputElement | null>(null);
	const existingEstimation = 'id' in taskEstimation;

	useEffect(() => {
		!editableMode && onCloseEditionRef.current && onCloseEditionRef.current();

		if (editableMode) {
			onOpenEditionRef.current && onOpenEditionRef.current();
			if (value['hours']) {
				hourRef.current?.focus();
			} else if (value['minutes']) {
				minRef.current?.focus();
			} else {
				hourRef.current?.focus();
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editableMode, onCloseEditionRef]);

	useEffect(() => {
		if (loadingRef?.current && !editTaskEstimationLoading && !addTaskEstimationLoading) {
			closeable_fcRef.current && closeable_fcRef.current();
		}

		if (loadingRef) {
			loadingRef.current = editTaskEstimationLoading || addTaskEstimationLoading;
		}
	}, [editTaskEstimationLoading, addTaskEstimationLoading, loadingRef, closeable_fcRef]);

	const handleSave = useCallback(
		async (e: MouseEvent<HTMLButtonElement>) => {
			e.stopPropagation();
			await handleSubmit();
			setEditableMode(false);
			onSuccess && onSuccess();
		},
		[handleSubmit, onSuccess]
	);

	const handleEditMode = useCallback((e: MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		setEditableMode(true);
	}, []);
	return (
		<div className={clsxm('flex items-center space-x-1', className)}>
			<TimeInputField
				ref={hourRef}
				value={value['hours']}
				onChange={onChange('hours')}
				onKeyUp={(e) => {
					e.key === 'Enter' && handleSubmit();
				}}
				disabled={estimation ? false : true}
				onFocus={handleFocus}
				onBlur={handleBlur}
				label={
					editableMode ? 'h' : parseInt(value['hours']) > 0 ? 'h' : parseInt(value['minutes']) > 0 ? '' : 'h'
				}
				dash={
					editableMode ? '__' : parseInt(value['hours']) > 0 ? '' : parseInt(value['minutes']) > 0 ? '' : '__'
				}
				wrapperClassName={clsxm(
					wrapperClassName,
					`${editableMode ? 'block' : parseInt(value['hours']) > 0 ? 'block' : parseInt(value['minutes']) > 0 ? 'hidden' : 'block'}`
				)}
			/>
			{editableMode ? (
				<>
					<span>:</span>
				</>
			) : parseInt(value['hours']) > 0 ? (
				parseInt(value['minutes']) > 0 ? (
					<>
						<span>:</span>
					</>
				) : null
			) : null}
			<TimeInputField
				ref={minRef}
				value={value['minutes']}
				onChange={onChange('minutes')}
				onKeyUp={(e) => {
					e.key === 'Enter' && handleSubmit();
				}}
				disabled={estimation ? false : true}
				onFocus={handleFocusMinutes}
				onBlur={handleBlurMinutes}
				label={
					editableMode ? 'm' : parseInt(value['minutes']) > 0 ? 'm' : parseInt(value['hours']) > 0 ? '' : 'm'
				}
				dash={
					editableMode ? '__' : parseInt(value['minutes']) > 0 ? '' : parseInt(value['hours']) > 0 ? '' : '__'
				}
				wrapperClassName={clsxm(
					wrapperClassName,
					`${editableMode ? 'block' : parseInt(value['minutes']) > 0 ? 'block' : parseInt(value['hours']) > 0 ? 'hidden' : 'block'}`
				)}
			/>
			{showEditAndSaveButton && (
				<div className="h-full flex items-center justify-center">
					{!editTaskEstimationLoading && !addTaskEstimationLoading ? (
						editableMode ? (
							<button onClick={handleSave}>
								<TickSaveIcon className={clsxm('lg:h-4 lg:w-4 w-2 h-2 mx-2')} />
							</button>
						) : (
							<button onClick={handleEditMode}>
								<EditPenBoxIcon className={clsxm('lg:h-4 lg:w-4 w-2 h-2 mx-2')} />
							</button>
						)
					) : (
						<LoadingIcon className={clsxm('lg:h-4 lg:w-4 w-2 h-2 mx-2 animate-spin')} />
					)}
				</div>
			)}
			{existingEstimation ? (
				<div className="h-full flex items-center justify-center">
					{!deleteTaskEstimationLoading ? (
						<button
							onClick={async (e) => {
								e.stopPropagation();
								await deleteTaskEstimationMutation.mutateAsync({
									estimationId: taskEstimation.id,
									taskId: taskEstimation.taskId
								});
							}}
						>
							<TrashIcon className="w-4 h-4 text-red-600" />
						</button>
					) : (
						<LoadingIcon className={clsxm('lg:h-4 lg:w-4 w-2 h-2 mx-2 animate-spin')} />
					)}
				</div>
			) : null}
		</div>
	);
}
