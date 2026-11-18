'use client';

import { useEffect, useLayoutEffect, ReactNode } from 'react';

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
import { useProviderLanguage } from '@hooks/useProviderLanguage';
import { TeamsContext } from '@lib/context/teams-context';
import i18n from '@lib/i18n/init';
import { apiConfigManager, IApiTeamsConfig } from '@ever-teams/api';
import TrackingProvider from '@lib/context/teams-tracking-context';
import { TimerStatusProvider } from '@lib/context/teams-timer-status-context';
import { ChartData } from '@ever-teams/toolkit-types';
import { useSelectedOrganization } from '@hooks/useSelectedOrganization';
import { KitOptionsProvider, KitRoot } from './kit-root';
import { KitColorScheme, setKitPreferences } from '@lib/stores/kit-preferences';
import { withoutGlobalStyles } from '../../themes/kit-theme-config';
import { useHostToken } from '@hooks/useHostToken';
import { GetKitToken } from '@lib/session/host-token';
import { HostSignInContext } from '@lib/session/host-session';

export const defaultData: ChartData[] = [
	{ day: 'Monday', cedric: 5, salva: 7, josh: 2, ndeko: 7 },
	{ day: 'Tuesday', cedric: 8, salva: 4, josh: 7, ndeko: 2 },
	{ day: 'Wednesday', cedric: 8, salva: 10, josh: 2, ndeko: 3 },
	{ day: 'Thursday', cedric: 5, salva: 11, josh: 9, ndeko: 1 },
	{ day: 'Friday', cedric: 13, salva: 5, josh: 13, ndeko: 8 },
	{ day: 'Saturday', cedric: 4, salva: 7, josh: 5, ndeko: 3 },
	{ day: 'Sunday', cedric: 4, salva: 7, josh: 6, ndeko: 7 }
];

// The API address, and getToken: the host's way to sign the person in from its own backend.
export type TeamsProviderConfig = Partial<IApiTeamsConfig> & {
	// Returns a short-lived token for the person signed in to the host product, which the host's server gets by
	// exchanging its embed credential. The kit calls it at start, shortly before the token expires and once after the
	// API refuses it; it keeps the token in memory only and asks for no password or token in the page.
	getToken?: GetKitToken;
};

interface TeamsProviderProps {
	children?: ReactNode;
	theme?: Theme<{}>;
	token?: string;
	lang?: string;
	config?: TeamsProviderConfig;
	// Renders the kit root that @ever-teams/atoms/styles.css is scoped under: import that file and set this to style
	// the components without the host's Tailwind. Off by default, so hosts that compile the classes see no change.
	scopedStyles?: boolean;
	// The widgets' color scheme inside the kit root (scopedStyles): 'system' (default) follows the system's.
	colorScheme?: KitColorScheme;
	// Lets the font toggle load the font it picks from Google Fonts. Off by default: no request to a third party.
	loadGoogleFonts?: boolean;
	// Called after a person signs out from the kit's user menu, instead of sending the browser to '/'.
	onSignOut?: () => void;
	// Shows "Powered by Ever Teams" under the widgets that have it. On by default; false hides it everywhere.
	branding?: boolean;
}

type TeamsDataProviderProps = Omit<
	TeamsProviderProps,
	'scopedStyles' | 'colorScheme' | 'loadGoogleFonts' | 'onSignOut' | 'branding'
> & {
	scoped: boolean;
};

const TeamsDataProvider = ({ children, config: apiConfig, theme, lang = 'en', scoped }: TeamsDataProviderProps) => {
	// Jotai Atoms
	const [appliedTheme, setAppliedTheme] = useAtom(appliedThemeAtom);

	// Custom hooks
	useProviderLanguage(lang);

	const { fontOptions, selectedFont, setSelectedFont } = useFontSelector();

	const getToken = apiConfig?.getToken;
	const askHostForToken = useHostToken(getToken);

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
		if (apiConfig) {
			// getToken is the provider's; the API client keeps the address and the version only.
			const api: TeamsProviderConfig = { ...apiConfig };
			delete api.getToken;
			apiConfigManager.setConfig(api);
		}
	}, [apiConfig]);

	// With its own root the kit draws its color scheme there. Without one it keeps next-themes, which puts the scheme
	// on <html> as hosts that rely on it (the examples) expect.
	let hostSignIn: (() => Promise<void>) | null = null;
	if (getToken) {
		hostSignIn = askHostForToken;
	}
	let themed = (
		<HostSignInContext.Provider value={hostSignIn}>
			<ThemeUIProvider theme={withoutGlobalStyles(appliedTheme)}>{children}</ThemeUIProvider>
		</HostSignInContext.Provider>
	);
	if (!scoped) {
		themed = <ThemeProvider attribute="class">{themed}</ThemeProvider>;
	}

	return (
		<TeamsContext.Provider
			value={{
				fontOptions,
				selectedFont,
				setSelectedFont
			}}
		>
			<TrackingProvider
				config={{ baseUrl: apiConfig?.apiUrl, defaultBaseUrl: apiConfigManager.getConfig().apiUrl }}
			>
				<I18nextProvider i18n={i18n}>
					<TimerStatusProvider>{themed}</TimerStatusProvider>
				</I18nextProvider>
			</TrackingProvider>
		</TeamsContext.Provider>
	);
};

// Before paint in the browser, so the host's colorScheme shows from the first frame; a plain effect on the server.
let useBeforePaintEffect = useLayoutEffect;
if (typeof window === 'undefined') {
	useBeforePaintEffect = useEffect;
}

const TeamsProvider = ({
	children,
	scopedStyles = false,
	colorScheme = 'system',
	loadGoogleFonts = false,
	onSignOut,
	branding = true,
	...props
}: TeamsProviderProps) => {
	useBeforePaintEffect(() => {
		setKitPreferences({ colorScheme, loadGoogleFonts });
	}, [colorScheme, loadGoogleFonts]);

	const hostSignIn = Boolean(props.config?.getToken);
	// Turning getToken on or off starts the kit's state afresh: a token or an organization list read in one mode never
	// reaches the other (a host token would otherwise be saved to localStorage by the stored-session mode).
	let signInMode = 'page';
	if (hostSignIn) {
		signInMode = 'host';
	}
	const content = (
		<KitOptionsProvider value={{ scoped: scopedStyles, onSignOut, hostSignIn, branding }}>
			<JotaiProvider key={signInMode}>
				<TeamsDataProvider {...props} scoped={scopedStyles}>
					{children}
				</TeamsDataProvider>
				<Toaster />
			</JotaiProvider>
		</KitOptionsProvider>
	);
	if (!scopedStyles) {
		return content;
	}
	return <KitRoot colorScheme={colorScheme}>{content}</KitRoot>;
};

TeamsProvider.displayName = 'TeamsProvider';

export { TeamsProvider };
