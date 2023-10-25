import classNames from 'classnames';
import React, { FC, useEffect, useState } from 'react';

import { underlineInput } from '~misc/tailwindClasses';
import type { ITask } from '~typescript/types/Tasks';

interface ITasksEstimatedInputs {
	task: ITask;
	onEstimateChange?: (hoursEstimate: string, minutesEstimate: string) => void;
}

const TasksEstimatedInputs: FC<ITasksEstimatedInputs> = ({ task, onEstimateChange }) => {
	const [hoursEst, setHoursEstimate] = useState<string>('');
	const [minutesEst, setMinutesEstimate] = useState<string>('');

	useEffect(() => {
		const hours = task?.estimated.split(':')[0] || '';
		const minutes = task?.estimated.split(':')[1] || '';
		setHoursEstimate(hours);
		setMinutesEstimate(minutes);
	}, [task]);

	useEffect(() => {
		onEstimateChange(hoursEst, minutesEst);
	}, [hoursEst, minutesEst]);

	const onHoursChange = (event) => {
		const value = event.target.value;
		if (value > 999 || value.split('').length > 3 || +value < 0) {
			return setHoursEstimate('');
		}

		setHoursEstimate(value);
	};

	const onMinuteChange = (event) => {
		const value = event.target.value;
		if (value > 60 || value.split('').length > 2 || +value < 0) {
			return setMinutesEstimate('');
		}

		setMinutesEstimate(value);
	};

	const onHoursEstimateBlur = (event) => {
		if (!event.target.value) return;

		if (+hoursEst < 10 && hoursEst[0] !== '0') {
			const hours = hoursEst ? hoursEst : '0';
			const format = '0' + hours;
			setHoursEstimate(format);
		}
	};

	const onMinutesEstimateBlur = (event) => {
		if (!event.target.value) return;

		if (+minutesEst < 10 && minutesEst[0] !== '0') {
			const mins = minutesEst ? minutesEst : '0';
			const format = '0' + mins;
			setMinutesEstimate(format);
		}
	};

	return (
		<>
			<span className="w-24">Estimated: </span>
			<input
				className={classNames(underlineInput, 'w-8')}
				type="number"
				placeholder="00"
				value={hoursEst}
				onChange={onHoursChange}
				onBlur={onHoursEstimateBlur}
			/>
			<span className="mx-2">hh</span>
			<input
				className={classNames(underlineInput, 'w-6')}
				type="number"
				placeholder="00"
				value={minutesEst}
				onChange={onMinuteChange}
				onBlur={onMinutesEstimateBlur}
			/>
			<span className="mx-2">mm</span>
		</>
	);
};

export default TasksEstimatedInputs;
