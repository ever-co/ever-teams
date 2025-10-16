'use client';

import { pad, secondsToTime } from '@/core/lib/helpers/index';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTaskEstimations } from './use-task-estimations';
import { TCreateTaskEstimation, TTaskEstimation } from '@/core/types/schemas/task/task-estimation.schema';

export function useTaskMemberEstimation(taskEstimation: TTaskEstimation | TCreateTaskEstimation) {
	const {
		editTaskEstimationLoading,
		addTaskEstimationLoading,
		editTaskEstimationMutation,
		addTaskEstimationMutation,
		deleteTaskEstimationMutation,
		deleteTaskEstimationLoading
	} = useTaskEstimations();
	const [editableMode, setEditableMode] = useState(false);
	const [value, setValue] = useState({ hours: '', minutes: '' });
	const editMode = useRef(false);

	useEffect(() => {
		const { hours: h, minutes: m } = secondsToTime(taskEstimation.estimate || 0);
		setValue({
			hours: h ? h.toString() : '',
			minutes: m ? pad(m).toString() : ''
		});
	}, [taskEstimation?.estimate]);

	const onChange = useCallback((c: keyof typeof value) => {
		return (e: ChangeEvent<HTMLInputElement>) => {
			const tm = +e.currentTarget.value.trim();
			const isInteger = !isNaN(tm) && Number.isInteger(tm);

			switch (c) {
				case 'hours':
					if (!isInteger || tm < 0 || tm > 999) {
						return;
					}
					break;
				case 'minutes':
					if (!isInteger || tm < 0 || tm > 59) {
						return;
					}
					break;
				default:
					return;
			}

			setValue((vls) => {
				return {
					...vls,
					[c]: tm
				};
			});
		};
	}, []);

	const handleFocus = () => {
		editMode.current = true;
		setValue((oldVa) => {
			return {
				...oldVa,
				hours: oldVa.hours ? oldVa.hours : ''
			};
		});
		setEditableMode(true);
	};

	const handleBlur = () => {
		setValue((oldVa) => {
			return {
				...oldVa,
				hours: oldVa.hours ? oldVa.hours : ''
			};
		});
	};

	const handleBlurMinutes = () => {
		setValue((oldVa) => {
			return {
				...oldVa,
				minutes: oldVa.minutes ? pad(+oldVa.minutes) : ''
			};
		});
	};

	const handleFocusMinutes = () => {
		editMode.current = true;
		setValue((oldVa) => {
			return {
				...oldVa,
				minutes: oldVa.minutes !== '00' ? oldVa.minutes : ''
			};
		});
		setEditableMode(true);
	};

	useEffect(() => {
		editMode.current = false;
	}, [taskEstimation]);

	const handleSubmit = useCallback(async () => {
		if (!taskEstimation) return;

		const hours = +value['hours'];
		const minutes = +value['minutes'];
		if (isNaN(hours) || isNaN(minutes)) {
			return;
		}

		const { hours: estimateHours, minutes: estimateMinutes } = secondsToTime(taskEstimation.estimate || 0);

		if (hours === estimateHours && minutes === estimateMinutes) {
			return;
		}

		if ('id' in taskEstimation) {
			// existing estimation
			await editTaskEstimationMutation.mutateAsync({
				...taskEstimation,
				estimate: hours * 60 * 60 + minutes * 60 // time seconds
			});
		} else {
			// new estimation
			await addTaskEstimationMutation.mutateAsync({
				...taskEstimation,
				estimate: hours * 60 * 60 + minutes * 60 // time seconds
			});
		}

		setEditableMode(false);
	}, [taskEstimation, editTaskEstimationMutation, addTaskEstimationMutation, value]);

	return {
		handleFocusMinutes,
		editableMode,
		onChange,
		handleFocus,
		handleBlur,
		handleBlurMinutes,
		value,
		handleSubmit,
		taskEstimation,
		setEditableMode,
		editTaskEstimationLoading,
		addTaskEstimationLoading,
		deleteTaskEstimationLoading,
		deleteTaskEstimationMutation
	};
}
