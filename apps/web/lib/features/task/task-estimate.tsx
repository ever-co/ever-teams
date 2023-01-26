import { useTaskEstimation } from '@app/hooks';
import { ITeamTask, Nullable } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { TimeInputField } from 'lib/components';
import { MutableRefObject, useEffect } from 'react';

type Props = {
	_task?: Nullable<ITeamTask>;
	onCloseEdition?: () => void;
	className?: string;
	loadingRef?: MutableRefObject<boolean>;
	closeable_fc?: () => void;
};

export function TaskEstimate({
	_task,
	onCloseEdition,
	className,
	loadingRef,
	closeable_fc,
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
		updateLoading,
		editableMode,
	} = useTaskEstimation(_task);

	useEffect(() => {
		!editableMode && onCloseEdition && onCloseEdition();
	}, [editableMode]);

	useEffect(() => {
		if (loadingRef?.current && !updateLoading) {
			closeable_fc && closeable_fc();
		}

		if (loadingRef) {
			loadingRef.current = updateLoading;
		}
	}, [updateLoading]);

	return (
		<div
			className={clsxm('flex items-center space-x-1', className)}
			ref={targetEl}
		>
			<TimeInputField
				value={value['hours']}
				onChange={onChange('hours')}
				onKeyUp={(e) => {
					e.key === 'Enter' && handleSubmit();
				}}
				disabled={task ? false : true}
				onFocus={handleFocus}
				onBlur={handleBlur}
				label="h"
			/>
			<span>:</span>
			<TimeInputField
				value={value['minutes']}
				onChange={onChange('minutes')}
				onKeyUp={(e) => {
					e.key === 'Enter' && handleSubmit();
				}}
				disabled={task ? false : true}
				onFocus={handleFocusMinutes}
				onBlur={handleBlurMinutes}
				label="m"
				loading={updateLoading}
			/>
		</div>
	);
}
