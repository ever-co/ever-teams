'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { SwitchRow } from '@/core/components/settings/kit/settings-switch';
import { sessionEndsWithBrowser, setSessionEndsWithBrowser } from '@/core/lib/helpers/cookies';

/** The switches showing the choice, told when it changes: the cookie that holds it sends no event of its own. */
const listeners = new Set<() => void>();

/**
 * Told of a change made here, and asked to read the cookie again when the tab comes back: another tab of the browser
 * may have changed the choice meanwhile.
 */
function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	window.addEventListener('focus', listener);
	document.addEventListener('visibilitychange', listener);
	return () => {
		listeners.delete(listener);
		window.removeEventListener('focus', listener);
		document.removeEventListener('visibilitychange', listener);
	};
}

function readChoice(): boolean {
	return sessionEndsWithBrowser();
}

/** The server renders the page without the browser's cookies: the switch shows the default until it is mounted. */
function readChoiceOnServer(): boolean {
	return false;
}

/**
 * Settings > Profile > This browser: the session lasts until its refresh token expires, through browser restarts
 * (#5315), and a shared computer can make this browser forget it each time it closes. The choice is the browser's, as
 * the cookies it governs are: the person's other browsers and apps keep their own sessions.
 */
export function ThisBrowserSection() {
	const t = useTranslations();
	const endsWithBrowser = useSyncExternalStore(subscribe, readChoice, readChoiceOnServer);

	const choose = (checked: boolean) => {
		setSessionEndsWithBrowser(checked);
		listeners.forEach((listener) => listener());
	};

	return (
		<SettingsSection
			id="this-browser"
			title={t('settings.thisBrowser.TITLE')}
			description={t('settings.thisBrowser.DESCRIPTION')}
		>
			<SettingsSurface>
				<SwitchRow
					id="sign-out-when-this-browser-closes"
					label={t('settings.thisBrowser.SIGN_OUT_ON_CLOSE')}
					description={t('settings.thisBrowser.SIGN_OUT_ON_CLOSE_HINT')}
					checked={endsWithBrowser}
					onCheckedChange={choose}
				/>
			</SettingsSurface>
		</SettingsSection>
	);
}
