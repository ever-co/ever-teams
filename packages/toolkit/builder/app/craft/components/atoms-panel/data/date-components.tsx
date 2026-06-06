import React from 'react';
import { BasicCalendar } from '../../drag-components/date/calendar';
import { BasicDatePicker, BasicDateRanger, BasicDatePickerProps, BasicDateRangeProps } from '../../drag-components';
import { calendarDefaultProps } from '../../drag-components/_constants/form';

export const dateComponents = [
	{
		label: 'Calendar',
		id: 'Calendar',
		component: <BasicCalendar {...calendarDefaultProps} />,
		imageSrc: '/components/calendar.png'
	},
	{
		label: 'Date Picker',
		id: 'DatePicker',
		component: <BasicDatePicker {...BasicDatePickerProps} />,
		imageSrc: '/components/date-picker.png'
	},
	{
		label: 'Date Range Picker',
		id: 'DateRangePicker',
		component: <BasicDateRanger {...BasicDateRangeProps} />,
		imageSrc: '/components/date-range-picker.png'
	}
];
