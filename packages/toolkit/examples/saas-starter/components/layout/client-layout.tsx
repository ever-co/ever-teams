'use client';

import { TeamsProvider, theme5 } from '@ever-teams/atoms';
import { ReactElement, ReactNode } from 'react';

const teamsConfig = {
	apiUrl: process.env.NEXT_PUBLIC_TEAMS_API_URL
};

const ClientLayout = ({ children, lang }: { children: ReactNode; lang?: string }): ReactElement => {
	return (
		<TeamsProvider config={teamsConfig} lang={lang} theme={theme5}>
			{children}
		</TeamsProvider>
	);
};

export default ClientLayout;
