import React from 'react';
import { TeamsReportDisplayer, IReportDisplayer } from '@ever-teams/atoms';

export function CardTeamsReportDisplayer({ workedTime, icon, label, maxWorkHours }: IReportDisplayer) {
	return <TeamsReportDisplayer workedTime={workedTime} icon={icon} label={label} maxWorkHours={maxWorkHours} />;
}
