'use client';

import { useEffect, useLayoutEffect, useMemo, ReactNode } from 'react';

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
import { OnTimerChange, TimerStatusProvider } from '@lib/context/teams-timer-status-context';
import { ChartData } from '@ever-teams/toolkit-types';
import { useSelectedOrganization } from '@hooks/useSelectedOrganization';
import { KitOptionsProvider, KitRoot } from './kit-root';
import { KitColorScheme, setKitPreferences } from '@lib/stores/kit-preferences';
import { withoutGlobalStyles } from '../../themes/kit-theme-config';
import { TokenFailureWarning, useHostToken } from '@hooks/useHostToken';
import { usePageApiUrl } from '@hooks/usePageApiUrl';
import { GetKitToken } from '@lib/session/host-token';
import { HostSignInContext } from '@lib/session/host-session';
import { KitSiteSignIn } from '@lib/session/site-popup';
import { SiteSignInContext } from '@lib/session/site-sign-in-context';
import { siteSignInWarning, useSiteSession, useSiteSignInControls } from '@hooks/useSiteSignIn';
import { useKitOptions } from './kit-options';
import { apiUrlOf } from '@lib/utils/api-url';
import { warnOnce } from '@lib/utils/warn-once';

export const defaultData: ChartData[] = [
	{ day: 'Monday', cedric: 5, salva: 7, josh: 2, ndeko: 7 },
	{ day: 'Tuesday', cedric: 8, salva: 4, josh: 7, ndeko: 2 },
	{ day: 'Wednesday', cedric: 8, salva: 10, josh: 2, ndeko: 3 },
	{ day: 'Thursday', cedric: 5, salva: 11, josh: 9, ndeko: 1 },
	{ day: 'Friday', cedric: 13, salva: 5, josh: 13, ndeko: 8 },
	{ day: 'Saturday', cedric: 4, salva: 7, josh: 5, ndeko: 3 },
	{ day: 'Sunday', cedric: 4, salva: 7, josh: 6, ndeko: 7 }
];

// The API address, and the way people sign in: getToken from the host's own backend, or signIn 'ever-teams'.
export type TeamsProviderConfig = Partial<IApiTeamsConfig> & {
	// Returns a short-lived token for the person signed in to the host product, which the host's server gets by
	// exchanging its embed credential. The kit calls it at start, shortly before the token expires and once after the
	// API refuses it; it keeps the token in memory only and asks for no password or token in the page.
	getToken?: GetKitToken;
	// 'ever-teams': a "Sign in with Ever Teams" button opens the web app in a popup, where the person allows this site
	// (an administrator turns that on for the site in Settings > Embeds). The kit keeps the timer token in memory and
	// the renewal token in the browser, for this API address. Ignored when getToken is given.
	signIn?: 'ever-teams';
	// The Ever Teams web app the popup opens, for signIn 'ever-teams'. Default: https://app.ever.team.
	appUrl?: string;
	// The organization the site signs people in to, for signIn 'ever-teams'.
	organizationId?: string;
};

const DEFAULT_APP_URL = 'https://app.ever.team';

// The sign-in with Ever Teams of a config, or null when it uses another way to sign in.
function siteSignInOf(config: TeamsProviderConfig | undefined): KitSiteSignIn | null {
	const wantsSiteSignIn = config?.signIn === 'ever-teams';
	if (!wantsSiteSignIn || config.getToken) {
		return null;
	}
	return { appUrl: config.appUrl || DEFAULT_APP_URL, organizationId: config.organizationId ?? '' };
}

// The config the API client keeps: its address and version, without the provider's own sign-in options.
function apiClientConfigOf(config: TeamsProviderConfig): Partial<IApiTeamsConfig> {
	const api: TeamsProviderConfig = { ...config };
	delete api.getToken;
	delete api.signIn;
	delete api.appUrl;
	delete api.organizationId;
	return api;
}

/** The sign-in with Ever Teams of the provider's config, the same object while its values stay the same. */
function useSiteSignInConfig(config: TeamsProviderConfig | undefined): KitSiteSignIn | null {
	const signIn = siteSignInOf(config);
	const appUrl = signIn?.appUrl;
	const organizationId = signIn?.organizationId;
	const isOn = signIn !== null;
	useEffect(() => {
		if (isOn && !organizationId) {
			warnOnce('site-sign-in-organization', "config.signIn 'ever-teams' needs config.organizationId.");
		}
	}, [isOn, organizationId]);
	return useMemo(() => {
		if (!isOn) {
			return null;
		}
		return { appUrl: appUrl ?? DEFAULT_APP_URL, organizationId: organizationId ?? '' };
	}, [isOn, appUrl, organizationId]);
}

interface TeamsProviderProps {
	children?: ReactNode;
	theme?: Theme<{}>;
	/**
	 * @deprecated Not read: sign people in with `config.getToken` (your backend), `config.signIn: 'ever-teams'` or the
	 * kit's sign-in dialog. Passing it logs a warning once (#5635).
	 */
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
	// Hears the person's timer: the first read of its status (initial: true), then each start, stop or other running
	// entry a later read shows, once, wherever it was made. The kit reads the status while one of its timer widgets is
	// on the page: on load, every minute while the page is visible, on focus and when the network comes back.
	onTimerChange?: OnTimerChange;
}

type TeamsDataProviderProps = Omit<
	TeamsProviderProps,
	'scopedStyles' | 'colorScheme' | 'loadGoogleFonts' | 'onSignOut' | 'branding'
> & {
	scoped: boolean;
};

const TeamsDataProvider = ({
	children,
	config: apiConfig,
	theme,
	lang = 'en',
	scoped,
	onTimerChange
}: TeamsDataProviderProps) => {
	// Jotai Atoms
	const [appliedTheme, setAppliedTheme] = useAtom(appliedThemeAtom);

	// Custom hooks
	useProviderLanguage(lang);

	const { fontOptions, selectedFont, setSelectedFont } = useFontSelector();

	const { api } = useKitOptions();
	const siteSignIn = useSiteSignInConfig(apiConfig);
	const site = useSiteSession(siteSignIn, apiUrlOf(api));
	// The host's getToken, or the sign-in with Ever Teams: the same token life (in memory, renewed before expiry).
	let getToken = apiConfig?.getToken;
	let warningOf: TokenFailureWarning | undefined;
	if (site) {
		getToken = site.getToken;
		warningOf = siteSignInWarning;
	}
	const askHostForToken = useHostToken(getToken, warningOf);
	const siteControls = useSiteSignInControls(site, siteSignIn, askHostForToken);

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
			// The sign-in options are the provider's; the API client keeps the address and the version only.
			apiConfigManager.setConfig(apiClientConfigOf(apiConfig));
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
			<SiteSignInContext.Provider value={siteControls}>
				<ThemeUIProvider theme={withoutGlobalStyles(appliedTheme)}>{children}</ThemeUIProvider>
			</SiteSignInContext.Provider>
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
			<TrackingProvider config={{ baseUrl: apiConfig?.apiUrl }}>
				<I18nextProvider i18n={i18n}>
					<TimerStatusProvider onTimerChange={onTimerChange}>{themed}</TimerStatusProvider>
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

	const hasTokenProp = props.token !== undefined;
	useEffect(() => {
		if (hasTokenProp) {
			warnOnce(
				'provider-token',
				"TeamsProvider does not read token: sign people in with config.getToken, config.signIn 'ever-teams' or the kit's sign-in dialog."
			);
		}
	}, [hasTokenProp]);

	const siteSignIn = siteSignInOf(props.config) !== null;
	// Signed in by the host's getToken or with Ever Teams: a token in memory for one member's timer, no password.
	const hostSignIn = Boolean(props.config?.getToken) || siteSignIn;
	const apiUrl = props.config?.apiUrl;
	// Without an apiUrl the provider talks to the page's address, which the host's setConfig() or another provider can
	// change: it is read again then, so the provider's requests and state follow it (below).
	const pageApiUrl = usePageApiUrl(apiUrl === undefined);
	let server = apiUrl;
	if (server === undefined) {
		server = pageApiUrl;
	}
	// One object per address: a host that passes a new config object at each render does not read everything again. A
	// request still running once the address changed (a stop that then records its time slot) goes on to the server
	// its state came from.
	const api = useMemo(() => ({ apiUrl: server }), [server]);
	// Turning getToken on or off starts the kit's state afresh: a token or an organization list read in one mode never
	// reaches the other (a host token would otherwise be saved to localStorage by the stored-session mode).
	let signInMode = 'page';
	if (hostSignIn) {
		signInMode = 'host';
	}
	if (siteSignIn) {
		signInMode = 'site';
	}
	// So does another address, its own apiUrl (an element's api-url changes) or, without one, the page's: the token
	// held for one server is never sent to the next, nor saved as its session. With Ever Teams, so does another
	// organization: the token of the sign-in allowed for one never runs the timer set up for the next.
	let scope = '';
	if (siteSignIn) {
		scope = props.config?.organizationId ?? '';
	}
	const stateKey = JSON.stringify([signInMode, server, scope]);
	const content = (
		<KitOptionsProvider value={{ scoped: scopedStyles, onSignOut, hostSignIn, siteSignIn, branding, api }}>
			<JotaiProvider key={stateKey}>
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
