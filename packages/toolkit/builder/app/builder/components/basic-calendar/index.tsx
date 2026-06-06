import React from 'react';
import { Calendar } from '@ever-teams/toolkit-ui';
import { CalendarProps } from '@ever-teams/toolkit-types';

export function BasicCalendar({ ...props }: CalendarProps) {
	return <Calendar {...props} />;
}
