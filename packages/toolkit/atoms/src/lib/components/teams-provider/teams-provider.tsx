import { useEffect, useState, ReactNode } from 'react';

import { Theme, ThemeUIProvider } from 'theme-ui';

import { Provider as JotaiProvider } from 'jotai';
import { useAtom } from 'jotai';
import { useAccessToken } from '@hooks/useAccessToken';
import { useAuthUser } from '@hooks/useAuthUser';
import { appliedThemeAtom } from '@lib/teams-jotai/atoms/teams-atoms';
import useFontSelector from '@hooks/useFontSelector';
import { Toaster } from '@ever-teams/toolkit-ui';
import { useUserPermission } from '@hooks/useUserPermission';
import { ThemeProvider } from 'next-themes';
import { useUserOrganization } from '@hooks/useUserOrganization';
import { I18nextProvider } from 'react-i18next';
import { changeTeamsLanguage } from '@components/i18n/language-switch';
import { TeamsContext } from '@lib/context/teams-context';
import i18n from '@lib/i18n/init';
import { apiConfigManager, IApiTeamsConfig } from '@ever-teams/api';
import TrackingProvider from '@lib/context/teams-tracking-context';
import { ChartData } from '@ever-teams/toolkit-types';
import { useSelectedOrganization } from '@hooks/useSelectedOrganization';

export const defaultData: ChartData[] = [
	{ day: 'Monday', cedric: 5, salva: 7, josh: 2, ndeko: 7 },
	{ day: 'Tuesday', cedric: 8, salva: 4, josh: 7, ndeko: 2 },
	{ day: 'Wednesday', cedric: 8, salva: 10, josh: 2, ndeko: 3 },
	{ day: 'Thursday', cedric: 5, salva: 11, josh: 9, ndeko: 1 },
	{ day: 'Friday', cedric: 13, salva: 5, josh: 13, ndeko: 8 },
	{ day: 'Saturday', cedric: 4, salva: 7, josh: 5, ndeko: 3 },
	{ day: 'Sunday', cedric: 4, salva: 7, josh: 6, ndeko: 7 }
];

interface TeamsProviderProps {
	children?: ReactNode;
	theme?: Theme<{}>;
	token?: string;
	lang?: string;
	config?: Partial<IApiTeamsConfig>;
}

const TeamsDataProvider = ({ children, config: apiConfig, theme, lang = 'en' }: TeamsProviderProps) => {
	// React States
	const [language, setLanguage] = useState(lang);

	// Jotai Atoms
	const [appliedTheme, setAppliedTheme] = useAtom(appliedThemeAtom);

	// Custom hooks

	const { fontOptions, selectedFont, setSelectedFont } = useFontSelector();

	const { accessToken } = useAccessToken();

	const { data: user } = useAuthUser(accessToken);

	const {} = useUserPermission(user, accessToken);

	const { data: userOrganizations } = useUserOrganization(user, accessToken);

	const {} = useSelectedOrganization(user, userOrganizations);

	// Use Effect

	useEffect(() => {
		theme && setAppliedTheme(theme);
	}, [theme]);

	useEffect(() => {
		const storedLanguage = localStorage.getItem('preferred-language');
		if (storedLanguage) {
			setLanguage(storedLanguage);
		}
	}, [lang]);

	useEffect(() => {
		changeTeamsLanguage(language);
	}, [language]);

	useEffect(() => {
		if (apiConfig) {
			apiConfigManager.setConfig(apiConfig);
		}
	}, [apiConfig]);

	return (
		<TeamsContext.Provider
			value={{

				fontOptions,
				selectedFont,
				setSelectedFont
			}}
		>
			<TrackingProvider config={{ baseUrl: apiConfig?.apiUrl }}>
				<I18nextProvider i18n={i18n}>
					<ThemeProvider attribute="class">
						<ThemeUIProvider theme={appliedTheme}>{children}</ThemeUIProvider>
					</ThemeProvider>
				</I18nextProvider>
			</TrackingProvider>
		</TeamsContext.Provider>
	);
};

const TeamsProvider = ({ children, ...props }: TeamsProviderProps) => {
	return (
		<JotaiProvider>
			<TeamsDataProvider {...props}>{children}</TeamsDataProvider>
			<Toaster />
		</JotaiProvider>
	);
};

TeamsProvider.displayName = 'TeamsProvider';

export { TeamsProvider };
