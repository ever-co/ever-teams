'use client';

import { useTranslations } from 'next-intl';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { publicApiOriginOrPlaceholder } from '@/core/lib/utils/public-api-origin';
import { exchangeUrlOf } from '@/core/lib/utils/user-api-tokens';

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
	const command = exchangeCommandOf(exchangeUrlOf(publicApiOriginOrPlaceholder()));

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
