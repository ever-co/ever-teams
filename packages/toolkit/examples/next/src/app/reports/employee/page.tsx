'use client';
import { TeamsBasicReport } from '@ever-teams/atoms';
import { NextPage } from 'next';

const EmployeeStats: NextPage = () => {
	return (
		<>
			<TeamsBasicReport />
			<TeamsBasicReport type="line" />
			<TeamsBasicReport type="radial" />
			<TeamsBasicReport type="tooltip" />
		</>
	);
};

export default EmployeeStats;
