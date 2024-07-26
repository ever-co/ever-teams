'use client';

import { useCallbackRef, useTaskEstimation } from '@app/hooks';
import { ITeamTask, Nullable } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { EditPenBoxIcon, CheckCircleTickIcon as TickSaveIcon, LoadingIcon } from 'assets/svg';
import { TimeInputField } from 'lib/components';
import { MutableRefObject, useEffect } from 'react';

type Props = {
	_task?: Nullable<ITeamTask>;
	onCloseEdition?: () => void;
	className?: string;
	loadingRef?: MutableRefObject<boolean>;
	closeable_fc?: () => void;
	wrapperClassName?: string;
};

export function TaskEstimate({ _task, onCloseEdition, className, loadingRef, closeable_fc, wrapperClassName }: Props) {
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
		updateLoading,
		editableMode,
		setEditableMode
	} = useTaskEstimation(_task);
	const onCloseEditionRef = useCallbackRef(onCloseEdition);
	const closeable_fcRef = useCallbackRef(closeable_fc);

	useEffect(() => {
		!editableMode && onCloseEditionRef.current && onCloseEditionRef.current();
	}, [editableMode, onCloseEditionRef]);

	useEffect(() => {
		if (loadingRef?.current && !updateLoading) {
			closeable_fcRef.current && closeable_fcRef.current();
		}

		if (loadingRef) {
			loadingRef.current = updateLoading;
		}
	}, [updateLoading, loadingRef, closeable_fcRef]);

	return (
		<div className={clsxm('flex items-center space-x-1', className)} ref={targetEl}>
			<TimeInputField
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
				wrapperClassName={wrapperClassName}
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
				wrapperClassName={wrapperClassName}
			/>
			<div className="h-full flex items-center justify-center">
				{!updateLoading ? (
					editableMode ? (
						<button
							onClick={() => {
								handleSubmit();
								setEditableMode(false);
							}}
						>
							<TickSaveIcon className={clsxm('lg:h-4 lg:w-4 w-2 h-2 mx-2')} />
						</button>
					) : (
						<button onClick={() => setEditableMode(true)}>
							<EditPenBoxIcon className={clsxm('lg:h-4 lg:w-4 w-2 h-2 mx-2')} />
						</button>
					)
				) : (
					<LoadingIcon className={clsxm('lg:h-4 lg:w-4 w-2 h-2 mx-2 animate-spin')} />
				)}
			</div>
		</div>
	);
}
