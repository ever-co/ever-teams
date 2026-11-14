'use client';

import { useTranslations } from 'next-intl';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { exchangeUrlOf } from '@/core/lib/utils/user-api-tokens';

/** Stands for the API's address when the browser reaches the API through the app's own server and does not know it. */
const API_URL_PLACEHOLDER = 'API_URL';

function exchangeCommandOf(url: string): string {
	return [
		`curl -X POST ${url} \\`,
		'  -H "Content-Type: application/json" \\',
		`  -d '{"token": "YOUR_TOKEN"}'`
	].join('\n');
}

/** How a script uses a token: trade it at the exchange route for an access token, then call the API as usual. */
export function ApiTokenUsageSection() {
	const t = useTranslations();
	const apiOrigin = GAUZY_API_BASE_SERVER_URL.value || API_URL_PLACEHOLDER;
	const command = exchangeCommandOf(exchangeUrlOf(apiOrigin));

	return (
		<SettingsSection id="api-token-usage" title={t('settings.apiTokens.USAGE_TITLE')}>
			<SettingsSurface>
				<div className="flex flex-col gap-2.5 px-4 py-3.5">
					<p className="text-[13px] text-pretty text-foreground">{t('settings.apiTokens.USAGE_EXCHANGE')}</p>
					<pre className="overflow-x-auto rounded-lg bg-foreground/[0.03] px-3 py-2.5 font-mono text-xs leading-5 text-foreground hairline-ring ring-border">
						<code>{command}</code>
					</pre>
					<p className="text-xs text-pretty text-muted-foreground">{t('settings.apiTokens.USAGE_CALL')}</p>
				</div>
			</SettingsSurface>
		</SettingsSection>
	);
}
