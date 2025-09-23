'use client';

import { useCallbackRef } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { EditPenBoxIcon, CheckCircleTickIcon as TickSaveIcon, LoadingIcon } from 'assets/svg';
import { RefObject, useEffect, useRef } from 'react';
import { TimeInputField } from '../duplicated-components/_input';
import { TTaskEstimation } from '@/core/types/schemas/task/task.schema';
import { useTaskMemberEstimation } from '@/core/hooks/tasks/use-task-member-estimation';

type Props = {
	taskEstimation: TTaskEstimation;
	onCloseEdition?: () => void;
	onOpenEdition?: () => void;
	className?: string;
	loadingRef?: RefObject<boolean>;
	closeable_fc?: () => void;
	wrapperClassName?: string;
	showEditAndSaveButton?: boolean;
};

export function TaskMemberEstimate({
	taskEstimation,
	onCloseEdition,
	onOpenEdition,
	className,
	loadingRef,
	closeable_fc,
	wrapperClassName,
	showEditAndSaveButton = true
}: Props) {
	const {
		targetEl,
		value,
		onChange,
		handleSubmit,
		handleFocus,
		task,
		handleBlur,
		handleFocusMinutes,
		handleBlurMinutes,
		editTaskEstimationLoading,
		editableMode,
		setEditableMode
	} = useTaskMemberEstimation(taskEstimation);
	const onCloseEditionRef = useCallbackRef(onCloseEdition);
	const onOpenEditionRef = useCallbackRef(onOpenEdition);
	const closeable_fcRef = useCallbackRef(closeable_fc);
	const hourRef = useRef<HTMLInputElement | null>(null);
	const minRef = useRef<HTMLInputElement | null>(null);

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
		if (loadingRef?.current && !editTaskEstimationLoading) {
			closeable_fcRef.current && closeable_fcRef.current();
		}

		if (loadingRef) {
			loadingRef.current = editTaskEstimationLoading;
		}
	}, [editTaskEstimationLoading, loadingRef, closeable_fcRef]);

	return (
		<div className={clsxm('flex items-center space-x-1', className)} ref={targetEl}>
			<TimeInputField
				ref={hourRef}
				value={value['hours']}
				onChange={onChange('hours')}
				onKeyUp={(e) => {
					e.key === 'Enter' && handleSubmit();
				}}
				disabled={task ? false : true}
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
				disabled={task ? false : true}
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
					{!editTaskEstimationLoading ? (
						editableMode ? (
							<button
								onClick={(e) => {
									e.stopPropagation();
									handleSubmit();
									setEditableMode(false);
								}}
							>
								<TickSaveIcon className={clsxm('lg:h-4 lg:w-4 w-2 h-2 mx-2')} />
							</button>
						) : (
							<button
								onClick={(e) => {
									e.stopPropagation();
									setEditableMode(true);
								}}
							>
								<EditPenBoxIcon className={clsxm('lg:h-4 lg:w-4 w-2 h-2 mx-2')} />
							</button>
						)
					) : (
						<LoadingIcon className={clsxm('lg:h-4 lg:w-4 w-2 h-2 mx-2 animate-spin')} />
					)}
				</div>
			)}
		</div>
	);
}
