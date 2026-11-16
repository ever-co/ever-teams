import classNames from 'classnames';
import React, { useEffect, useState, type ChangeEvent, type FC } from 'react';

import { estimateFieldOf, MAX_ESTIMATE_HOURS, MAX_ESTIMATE_MINUTES, paddedEstimateField } from '~lib/estimate';
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
		onEstimateChange?.(hoursEst, minutesEst);
	}, [hoursEst, minutesEst]);

	// Whole hours up to 999 and minutes up to 59, the rule the estimate is read with: anything else typed is not taken
	const onHoursChange = (event: ChangeEvent<HTMLInputElement>) => {
		const accepted = estimateFieldOf(event.target.value, MAX_ESTIMATE_HOURS);
		if (accepted !== null) {
			setHoursEstimate(accepted);
		}
	};

	const onMinuteChange = (event: ChangeEvent<HTMLInputElement>) => {
		const accepted = estimateFieldOf(event.target.value, MAX_ESTIMATE_MINUTES);
		if (accepted !== null) {
			setMinutesEstimate(accepted);
		}
	};

	// Left, a field shows its number on two digits at least, without extra leading zeros: "005" shows "05"
	const onHoursEstimateBlur = () => setHoursEstimate(paddedEstimateField);
	const onMinutesEstimateBlur = () => setMinutesEstimate(paddedEstimateField);

	return (
		<>
			<span className="mr-2 text-xs text-zinc-500 dark:text-zinc-400">{t('tasksEstimated')}</span>
			<input
				className={classNames(underlineInput, 'w-8')}
				aria-label={t('tasksEstimateHours')}
				type="text"
				inputMode="numeric"
				autoComplete="off"
				maxLength={String(MAX_ESTIMATE_HOURS).length}
				placeholder="00"
				value={hoursEst}
				onChange={onHoursChange}
				onBlur={onHoursEstimateBlur}
			/>
			<span className="mx-1 text-xs text-zinc-500 dark:text-zinc-400">{t('tasksHoursShort')}</span>
			<input
				className={classNames(underlineInput, 'w-6')}
				aria-label={t('tasksEstimateMinutes')}
				type="text"
				inputMode="numeric"
				autoComplete="off"
				maxLength={String(MAX_ESTIMATE_MINUTES).length}
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
