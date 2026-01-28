'use client';

import { pad, secondsToTime } from '@/core/lib/helpers/index';
import { Nullable } from '@/core/types/generics/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useOutsideClick } from '../common';
import { useCurrentActiveTask } from '../organizations/teams/use-current-active-task';
import { useCurrentTeam } from '../organizations/teams/use-current-team';
import { useUpdateTaskMutation } from '../organizations/teams/use-update-task.mutation';
import { useSetActiveTask } from '../organizations/teams/use-set-active-task';

export function useTaskEstimation(task?: Nullable<TTask>, useActiveTeamTaskByDefault = true) {
	const { task: activeTeamTask } = useCurrentActiveTask();
	const activeTeam = useCurrentTeam();
	const { mutateAsync: updateTask, isPending: updateLoading } = useUpdateTaskMutation();
	const { setActiveTask } = useSetActiveTask();
	const [editableMode, setEditableMode] = useState(false);
	const [value, setValue] = useState({ hours: '', minutes: '' });
	const editMode = useRef(false);

	const $task = useActiveTeamTaskByDefault ? task || activeTeamTask : task;

	useEffect(() => {
		const { hours: h, minutes: m } = secondsToTime($task?.estimate || 0);
		setValue({
			hours: h ? h.toString() : '',
			minutes: m ? pad(m).toString() : ''
		});
	}, [$task?.estimate]);

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
	}, [$task, activeTeam?.id]);

	const handleSubmit = useCallback(async () => {
		if (!$task) return;

		const hours = +value['hours'];
		const minutes = +value['minutes'];
		if (isNaN(hours) || isNaN(minutes)) {
			return;
		}

		const { hours: estimateHours, minutes: estimateMinutes } = secondsToTime($task.estimate || 0);

		if (hours === estimateHours && minutes === estimateMinutes) {
			return;
		}

		await updateTask({
			taskId: $task?.id,
			taskData: {
				...$task,
				estimateHours: hours,
				estimateMinutes: minutes,
				estimate: hours * 60 * 60 + minutes * 60 // time seconds
			}
		}).then((task) => setActiveTask(task));

		setEditableMode(false);
	}, [$task, updateTask, value]);

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
		updateLoading
	};
}
