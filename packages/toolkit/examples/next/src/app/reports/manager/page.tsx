'use client';
import { TeamsBasicReport } from '@ever-teams/atoms';
import { NextPage } from 'next';

// Manager Stats Page
const ManagerStats: NextPage = () => {
	return (
		<>
			<TeamsBasicReport />
			<TeamsBasicReport type="line" />
			<TeamsBasicReport type="radial" />
			<TeamsBasicReport type="tooltip" />
		</>
	);
};

export default ManagerStats;
