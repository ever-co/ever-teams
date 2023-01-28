import { pad, secondsToTime } from '@app/helpers';
import { ITeamTask, Nullable } from '@app/interfaces';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useOutsideClick } from '../useOutsideClick';
import { useTeamTasks } from './useTeamTasks';

export function useTaskEstimation(task?: Nullable<ITeamTask>) {
	const { activeTeamTask, updateTask, updateLoading, activeTeamId } =
		useTeamTasks();
	const [editableMode, setEditableMode] = useState(false);
	const [value, setValue] = useState({ hours: '', minutes: '' });
	const editMode = useRef(false);

	const $task = task || activeTeamTask;

	useEffect(() => {
		const { h, m } = secondsToTime($task?.estimate || 0);
		setValue({
			hours: h.toString(),
			minutes: pad(m).toString(),
		});
	}, [$task]);

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
					[c]: tm,
				};
			});
		};
	}, []);

	const handleFocus = () => {
		editMode.current = true;
		setValue((oldVa) => {
			return {
				...oldVa,
				hours: oldVa.hours !== '0' ? oldVa.hours : '',
			};
		});
		setEditableMode(true);
	};

	const handleBlur = () => {
		setValue((oldVa) => {
			return {
				...oldVa,
				hours: oldVa.hours !== '' ? oldVa.hours : '0',
			};
		});
	};

	const handleBlurMinutes = () => {
		setValue((oldVa) => {
			return {
				...oldVa,
				minutes: oldVa.minutes !== '' ? pad(+oldVa.minutes) : pad(0),
			};
		});
	};

	const handleFocusMinutes = () => {
		editMode.current = true;
		setValue((oldVa) => {
			return {
				...oldVa,
				minutes: oldVa.minutes !== '00' ? oldVa.minutes : '',
			};
		});
		setEditableMode(true);
	};

	useEffect(() => {
		editMode.current = false;
	}, [$task, activeTeamId]);

	const handleSubmit = useCallback(() => {
		if (!$task) return;

		const hours = +value['hours'];
		const minutes = +value['minutes'];
		if (isNaN(hours) || isNaN(minutes)) {
			return;
		}

		const { h: estimateHours, m: estimateMinutes } = secondsToTime(
			$task.estimate || 0
		);

		if (hours === estimateHours && minutes === estimateMinutes) {
			return;
		}

		updateTask({
			...$task,
			estimateHours: hours,
			estimateMinutes: minutes,
			estimate: hours * 60 * 60 + minutes * 60, // time seconds
		});

		setEditableMode(false);
	}, [$task, updateTask, value]);

	const { targetEl, ignoreElementRef } = useOutsideClick<HTMLDivElement>(() => {
		if (updateLoading || !editMode.current) return;
		handleSubmit();
	});

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
		updateLoading,
	};
}
