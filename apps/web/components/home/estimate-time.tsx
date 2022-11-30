import { secondsToTime } from '@app/helpers/date';
import { pad } from '@app/helpers/number';
import { useTeamTasks } from '@app/hooks/useTeamTasks';
import { TimeInput } from '@components/common/main/time-input';
import { Spinner } from '@components/common/spinner';
import { CheckIcon } from '@heroicons/react/24/outline';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';

export function EstimateTime() {
	const { activeTeamTask, updateTask, updateLoading } = useTeamTasks();
	const [editableMode, setEditableMode] = useState(false);
	const [value, setValue] = useState({ hours: '', minutes: '' });

	useEffect(() => {
		const { h, m } = secondsToTime(activeTeamTask?.estimate || 0);
		setValue({
			hours: h.toString(),
			minutes: pad(m).toString(),
		});
	}, [activeTeamTask]);

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
		setValue((oldVa) => {
			return {
				...oldVa,
				minutes: oldVa.minutes !== '0' ? (+oldVa.minutes).toString() : '',
			};
		});
		setEditableMode(true);
	};

	const handleSubmit = useCallback(() => {
		if (!activeTeamTask) return;

		const hours = +value['hours'];
		const minutes = +value['minutes'];
		if (isNaN(hours) || isNaN(minutes) || (hours === 0 && minutes === 0)) {
			return;
		}

		const { h: estimateHours, m: estimateMinutes } = secondsToTime(
			activeTeamTask.estimate || 0
		);

		if (hours === estimateHours && minutes === estimateMinutes) {
			return;
		}

		updateTask({
			...activeTeamTask,
			estimateHours: hours,
			estimateMinutes: minutes,
			estimate: hours * 60 * 60 + minutes * 60, // time seconds
		});

		setEditableMode(false);
	}, [activeTeamTask, updateTask, value]);

	return (
		<>
			<div className=" flex items-end">
				<span className="text-[16px] flex text-[#9490A0] dark:text-[#616164] items-end">
					Estimate :{' '}
				</span>
				<TimeInput
					type="text"
					value={value['hours']}
					handleChange={onChange('hours')}
					handleEnter={handleSubmit}
					name="hours"
					style="ml-3 w-[30px] bg-transparent pr-1 pt-1 text-end flex pb-0"
					disabled={activeTeamTask ? false : true}
					handleFocus={handleFocus}
					handleBlur={handleBlur}
				/>
				<div className="mr-1 h-[27px] text-[14px] flex items-end border-b-2 dark:border-[#616164] border-dashed ">
					h
				</div>
				:
				<TimeInput
					type="text"
					value={value['minutes']}
					handleChange={onChange('minutes')}
					name="minutes"
					style="ml-1 w-[25px] bg-transparent pr-1 pt-1 text-end flex pb-0"
					handleEnter={handleSubmit}
					disabled={activeTeamTask ? false : true}
					handleFocus={handleFocusMinutes}
					handleBlur={handleBlurMinutes}
				/>
				<div className="mr-1 h-[27px] text-[14px] flex items-end border-b-2 dark:border-[#616164] border-dashed ">
					m
				</div>
				<span className="mr-1 w-6 h-[27px">
					{updateLoading ? (
						<Spinner dark={false} />
					) : editableMode ? (
						<div className="mb-1 cursor-pointer" onClick={handleSubmit}>
							<CheckIcon className="text-[#28D581] w-[16px]" />
						</div>
					) : (
						''
					)}
				</span>{' '}
			</div>{' '}
		</>
	);
}
