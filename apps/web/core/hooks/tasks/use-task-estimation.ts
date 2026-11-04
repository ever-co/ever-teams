'use client';

import { pad, secondsToTime } from '@/core/lib/helpers/index';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useUpdateTask, useTeamTasksQuery } from '../organizations';
import { useOutsideClick } from '../common';
import { Nullable } from '@/core/types/generics/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue } from 'jotai';
import { activeTeamTaskState } from '@/core/stores';

/** The fields' text for an estimate: empty rather than zero, minutes on two digits. */
function fieldValuesOf(hours: number, minutes: number) {
	let hoursText = '';
	if (hours) {
		hoursText = String(hours);
	}
	let minutesText = '';
	if (minutes) {
		minutesText = pad(minutes).toString();
	}
	return { hours: hoursText, minutes: minutesText };
}

export function useTaskEstimation(task?: Nullable<TTask>, useActiveTeamTaskByDefault = true) {
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const { updateTask, updateLoading } = useUpdateTask();
	const { activeTeamId } = useTeamTasksQuery();
	const [editableMode, setEditableMode] = useState(false);
	const [value, setValue] = useState({ hours: '', minutes: '' });
	const editMode = useRef(false);

	const $task = useActiveTeamTaskByDefault ? task || activeTeamTask : task;

	const savedValue = useCallback(() => {
		const { hours: h, minutes: m } = secondsToTime($task?.estimate || 0);
		return fieldValuesOf(h, m);
	}, [$task?.estimate]);

	useEffect(() => {
		setValue(savedValue());
	}, [savedValue]);

	/** Escape: the fields go back to the saved estimate and close. */
	const cancelEdition = useCallback(() => {
		setValue(savedValue());
		setEditableMode(false);
	}, [savedValue]);

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
	}, [$task, activeTeamId]);

	/** Saves a given estimate (a preset, Clear) the way the fields save theirs; an unchanged one only closes. */
	const saveEstimate = useCallback(
		(hours: number, minutes: number) => {
			if (!$task) return;
			const { hours: estimateHours, minutes: estimateMinutes } = secondsToTime($task.estimate || 0);
			const isUnchanged = hours === estimateHours && minutes === estimateMinutes;
			if (isUnchanged) {
				setEditableMode(false);
				return;
			}
			setValue(fieldValuesOf(hours, minutes));
			updateTask({
				...$task,
				estimateHours: hours,
				estimateMinutes: minutes,
				estimate: hours * 60 * 60 + minutes * 60 // time seconds
			});
			setEditableMode(false);
		},
		[$task, updateTask]
	);

	const handleSubmit = useCallback(() => {
		const hours = +value['hours'];
		const minutes = +value['minutes'];
		if (isNaN(hours) || isNaN(minutes)) {
			return;
		}
		saveEstimate(hours, minutes);
	}, [saveEstimate, value]);

	const handleOutsideClick = useCallback(() => {
		if (updateLoading || !editableMode) return;
		handleSubmit();
	}, [updateLoading, editableMode, handleSubmit]);

	const { targetEl, ignoreElementRef } = useOutsideClick<HTMLDivElement>(handleOutsideClick);

	return {
		targetEl,
		ignoreElementRef,
		handleFocusMinutes,
		editableMode,
		onChange,
		handleFocus,
		handleBlur,
		handleBlurMinutes,
		value,
		handleSubmit,
		task: $task,
		setEditableMode,
		cancelEdition,
		saveEstimate,
		updateLoading
	};
}
