import classNames from 'classnames';
import React, { useEffect, useState, type FC } from 'react';

import { t } from '~lib/i18n';
import { underlineInput } from '~misc/tailwindClasses';
import type { ITask } from '~typescript/types/Tasks';

interface ITasksEstimatedInputs {
	task: ITask | null;
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
			<span className="mr-2 text-xs text-zinc-500 dark:text-zinc-400">{t('tasksEstimated')}</span>
			<input
				className={classNames(underlineInput, 'w-8')}
				aria-label={t('tasksEstimateHours')}
				type="number"
				placeholder="00"
				value={hoursEst}
				onChange={onHoursChange}
				onBlur={onHoursEstimateBlur}
			/>
			<span className="mx-1 text-xs text-zinc-500 dark:text-zinc-400">{t('tasksHoursShort')}</span>
			<input
				className={classNames(underlineInput, 'w-6')}
				aria-label={t('tasksEstimateMinutes')}
				type="number"
				placeholder="00"
				value={minutesEst}
				onChange={onMinuteChange}
				onBlur={onMinutesEstimateBlur}
			/>
			<span className="mx-1 text-xs text-zinc-500 dark:text-zinc-400">{t('tasksMinutesShort')}</span>
		</>
	);
};

export default TasksEstimatedInputs;
