import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { pad } from '@/core/lib/helpers/number';
import { TimeInput } from '@/core/components/common/time-input';
import { Spinner } from '@/core/components/common/spinner';
import { Check } from '@/core/components/icons';
import { useTranslations } from 'next-intl';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useOutsideClick } from '@/core/hooks/common';
import { useUpdateTask } from '@/core/hooks/organizations';
import { useAtomValue } from 'jotai';
import { activeTeamTaskState } from '@/core/stores';

export function EstimateTime() {
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const { updateTask, updateLoading } = useUpdateTask();
	const [editableMode, setEditableMode] = useState(false);
	const [value, setValue] = useState({ hours: '', minutes: '' });
	const editMode = useRef(false);
	const t = useTranslations();
	useEffect(() => {
		const { hours: h, minutes: m } = secondsToTime(activeTeamTask?.estimate || 0);
		setValue({
			hours: h.toString(),
			minutes: pad(m).toString()
		});
	}, [activeTeamTask]);

	const onChange = useCallback((c: keyof typeof value) => {
		editMode.current = true;
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
		setValue((oldVa) => {
			return {
				...oldVa,
				hours: oldVa.hours !== '0' ? oldVa.hours : ''
			};
		});
		setEditableMode(true);
	};

	const handleBlur = () => {
		setValue((oldVa) => {
			return {
				...oldVa,
				hours: oldVa.hours !== '' ? oldVa.hours : '0'
			};
		});
	};

	const handleBlurMinutes = () => {
		setValue((oldVa) => {
			return {
				...oldVa,
				minutes: oldVa.minutes !== '' ? pad(+oldVa.minutes) : pad(0)
			};
		});
	};

	const handleFocusMinutes = () => {
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
	}, [activeTeamTask]);

	const handleSubmit = useCallback(() => {
		if (!activeTeamTask) return;

		const hours = +value['hours'];
		const minutes = +value['minutes'];
		if (isNaN(hours) || isNaN(minutes)) {
			return;
		}

		const { hours: estimateHours, minutes: estimateMinutes } = secondsToTime(activeTeamTask.estimate || 0);

		if (hours === estimateHours && minutes === estimateMinutes) {
			return;
		}

		updateTask({
			...activeTeamTask,
			estimateHours: hours,
			estimateMinutes: minutes,
			estimate: hours * 60 * 60 + minutes * 60 // time seconds
		});

		setEditableMode(false);
	}, [activeTeamTask, updateTask, value]);

	const { targetEl, ignoreElementRef } = useOutsideClick<HTMLDivElement>(() => {
		if (updateLoading || !editMode.current) return;
		handleSubmit();
	});

	return (
		<>
			<div className="flex items-end">
				<span className="flex items-end text-base text-muted-foreground">
					{t('timer.ESTIMATION.ESTIMATE_LABEL')} :{' '}
				</span>
				<div className="flex" ref={targetEl}>
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
					<div className="mr-1 flex h-[27px] items-end border-b-2 border-dashed border-border text-sm">h</div>
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
					<div className="mr-1 flex h-[27px] items-end border-b-2 border-dashed border-border text-sm">m</div>
				</div>
				<span className="mr-1 h-[27px] w-6" ref={ignoreElementRef}>
					{updateLoading ? (
						<Spinner dark={false} />
					) : editableMode ? (
						<div className="mb-1 cursor-pointer" onClick={handleSubmit}>
							<Check className="size-4 text-success-foreground" />
						</div>
					) : (
						''
					)}
				</span>
			</div>
		</>
	);
}
