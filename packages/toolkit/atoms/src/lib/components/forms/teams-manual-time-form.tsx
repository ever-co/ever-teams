import { Checkbox, cn, Textarea, ThemedButton } from '@ever-teams/toolkit-ui';
import { TeamsDatePicker } from '@components/teams-ui-components/teams-date-picker';
import { TeamsTimerForm } from './teams-timer-form';
import { useManualTimeForm } from '@hooks/useManualTimeForm';
import { LoaderCircle, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subMinutes, addMinutes } from 'date-fns';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { TeamsTimeSelect } from '../teams-ui-components/inputs/teams-time-select';

export function TeamsManualTimeForm({ className }: { className?: string }) {
	const {
		date,
		setDate,
		startTime,
		endTime,
		isBillable,
		setIsBillable,
		handleTimeChange,
		description,
		setDescription,
		currentTeamsState,
		setCurrentTeamsState,
		loading,
		errors,
		handleSubmit,
		isManualTimeEnabled,
		isToday,
		nowTimeRounded
	} = useManualTimeForm();

	const { t } = useTranslation(undefined, { keyPrefix: 'MANUAL_TIME_FORM' });

	const maxStartTime = useMemo(() => {
		if (!isToday) return '23:55';
		const [h, m] = nowTimeRounded.split(':').map(Number);
		const now = new Date();
		now.setHours(h, m, 0, 0);
		return format(subMinutes(now, 10), 'HH:mm');
	}, [isToday, nowTimeRounded]);

	const maxEndTime = useMemo(() => {
		return isToday ? nowTimeRounded : '23:55';
	}, [isToday, nowTimeRounded]);

	const minEndTime = useMemo(() => {
		if (!startTime) return undefined;
		const [h, m] = startTime.split(':').map(Number);
		const start = new Date();
		start.setHours(h, m, 0, 0);
		return format(addMinutes(start, 10), 'HH:mm');
	}, [startTime]);

	return (
		<form
			onSubmit={handleSubmit}
			className={cn(
				'w-full rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-black shadow-xs flex flex-col gap-4',
				className
			)}
		>
			<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('title')}</h2>

			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('select_date')}</label>
				<TeamsDatePicker
					date={date}
					setDate={setDate as React.Dispatch<React.SetStateAction<Date | undefined>>}
					toDate={new Date()}
					placeholder={t('select_date')}
					className="w-full"
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-1.5">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('start_time')}</label>
					<TeamsTimeSelect
						value={startTime}
						onValueChange={(val: string) => handleTimeChange('start', val)}
						className="w-full"
						step={300}
						min="00:00"
						max={maxStartTime}
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('end_time')}</label>
					<TeamsTimeSelect
						value={endTime}
						onValueChange={(val: string) => handleTimeChange('end', val)}
						className="w-full"
						step={300}
						min={minEndTime}
						max={maxEndTime}
					/>
				</div>
			</div>

			<div className="flex gap-1.5">
				<Checkbox
					name="is_billable"
					id="is_billable"
					checked={isBillable}
					onCheckedChange={() => setIsBillable(!isBillable)}
				/>
				<label htmlFor="is_billable" className="text-sm font-medium text-gray-700 dark:text-gray-300">
					{t('is_billable')}
				</label>
			</div>

			<TeamsTimerForm currentTeamsState={currentTeamsState} setCurrentTeamsState={setCurrentTeamsState} />

			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('description')}</label>
				<Textarea
					placeholder={t('description_placeholder')}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					className="w-full"
				/>
			</div>

			{errors && errors.length > 0 && <span className="text-red-500 text-xs">{errors[0]}</span>}
			{!isManualTimeEnabled && <span className="text-red-500 text-xs">{t('manual_time_disabled')}</span>}

			<ThemedButton
				disabled={loading || !isManualTimeEnabled}
				type="submit"
				className="mt-2 w-fit flex items-center justify-center gap-2 rounded-md bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 text-sm transition"
			>
				{loading ? (
					<span className="animate-spin ">
						<LoaderCircle size={16} />
					</span>
				) : (
					<Plus size={16} />
				)}{' '}
				{t('add_time')}
			</ThemedButton>
			<TeamsTimerFooter />
		</form>
	);
}
