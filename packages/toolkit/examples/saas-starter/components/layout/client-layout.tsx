'use client';

import { TeamsProvider, theme5 } from '@ever-teams/atoms';
import { ReactElement, ReactNode, useMemo } from 'react';

const ClientLayout = ({
	apiUrl,
	children,
	lang
}: {
	apiUrl?: string;
	children: ReactNode;
	lang?: string;
}): ReactElement => {
	// The API URL arrives as a prop, read per request from the container env by the server root layout
	// (lib/runtime-env.ts). Never read process.env.NEXT_PUBLIC_* here: Next would inline the value of
	// whoever built the image.
	const teamsConfig = useMemo(() => ({ apiUrl }), [apiUrl]);

	return (
		<TeamsProvider config={teamsConfig} lang={lang} theme={theme5}>
			{children}
		</TeamsProvider>
	);
};

export default ClientLayout;
