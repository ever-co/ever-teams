import React from 'react';
import { TeamsDatePicker } from '@ever-teams/atoms';
import { IDatePickerProps } from '@ever-teams/toolkit-types';

export function BasicDatePicker({ ...props }: IDatePickerProps) {
	return <TeamsDatePicker {...props} />;
}
