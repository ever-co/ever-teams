import React from 'react';
import { TeamsDateRangePicker } from '@ever-teams/atoms';
import { IDateRangePickerProps } from '@ever-teams/toolkit-types';

export function BasicDateRanger({ ...props }: IDateRangePickerProps) {
	return <TeamsDateRangePicker {...props} />;
}
