import { IDateRangePickerProps } from '@ever-teams/toolkit-types';
import { useTeamsContext } from 'src/lib/context/teams-context';
import { TeamsDateRangePicker } from '../teams-date-range-picker';

export interface ITeamsReportDatesRangePickerProps extends Omit<IDateRangePickerProps, 'date' | 'setDate'> {
	/**
	 * Optional className for custom styling
	 */
	className?: string;

	/**
	 * Optional containerClassName for custom styling
	 */
	containerClassName?: string;
	/**
	 * Optional label to display above the date range picker
	 */
	label?: string;
	/**
	 * Whether the date range picker is disabled
	 */
	disabled?: boolean;
	/**
	 * Minimum selectable date
	 */
	minDate?: Date;
	/**
	 * Maximum selectable date
	 */
	maxDate?: Date;
	/**
	 * Size variant of the date range picker button
	 */
	size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const TeamsReportDatesRangePicker = ({
	className,
	containerClassName,
	label,
	disabled,
	minDate,
	maxDate,
	size
}: ITeamsReportDatesRangePickerProps) => {
	const { reportDates, setReportDates } = useTeamsContext();
	return (
		<TeamsDateRangePicker
			date={reportDates}
			setDate={setReportDates}
			className={className}
			containerClassName={containerClassName}
			label={label}
			disabled={disabled}
			minDate={minDate}
			maxDate={maxDate}
			size={size}
		/>
	);
};
