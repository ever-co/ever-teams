'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/core/components/duplicated-components/_button';
import { Check, Copy } from '@/core/components/icons';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { getOrganizationIdCookie } from '@/core/lib/helpers/cookies';
import { embedApiUrlOf, embedTimerCodeOf } from '@/core/lib/utils/embed-timer-code';
import { publicApiOriginOrPlaceholder } from '@/core/lib/utils/public-api-origin';

/** How long the button says the code was copied. */
const COPIED_MS = 2_000;

function subscribeToNothing() {
	return () => undefined;
}

function webAppOrigin() {
	return window.location.origin;
}

function noOriginOnTheServer() {
	return '';
}

/**
 * The code an administrator pastes into a site whose people sign in with their own account (#5577): the timer element
 * with this organization, this server's API and this web app, which the page showed nowhere.
 */
export function EmbedTimerCodeSection() {
	const t = useTranslations();
	// The web app's own address is known in the browser only; the server render leaves it empty.
	const appUrl = useSyncExternalStore(subscribeToNothing, webAppOrigin, noOriginOnTheServer);
	const [isCopied, setIsCopied] = useState(false);

	useEffect(() => {
		if (!isCopied) {
			return;
		}
		const timer = window.setTimeout(() => setIsCopied(false), COPIED_MS);
		return () => window.clearTimeout(timer);
	}, [isCopied]);

	const code = embedTimerCodeOf({
		apiUrl: embedApiUrlOf(publicApiOriginOrPlaceholder()),
		organizationId: getOrganizationIdCookie() ?? '',
		appUrl
	});

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setIsCopied(true);
		} catch {
			toast.error(t('settings.embeds.TIMER_CODE_NOT_COPIED'));
		}
	};

	// The button keeps its name; the copy is said in a status region next to it.
	let copyIcon = <Copy aria-hidden="true" />;
	let status = '';
	if (isCopied) {
		copyIcon = <Check aria-hidden="true" />;
		status = t('settings.embeds.TIMER_CODE_COPIED');
	}

	return (
		<SettingsSection
			id="embed-timer-code"
			title={t('settings.embeds.TIMER_CODE_TITLE')}
			description={t('settings.embeds.TIMER_CODE_TEXT')}
		>
			<SettingsSurface>
				<div className="relative px-4 py-3.5">
					{/* Long lines wrap inside the right padding, so the copy button never covers code on a phone. */}
					<pre className="rounded-lg bg-foreground/[0.03] py-2.5 pr-12 pl-3 font-mono text-xs leading-5 whitespace-pre-wrap text-foreground [overflow-wrap:anywhere] hairline-ring ring-border">
						<code>{code}</code>
					</pre>
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={copy}
						aria-label={t('settings.embeds.TIMER_CODE_COPY')}
						title={t('settings.embeds.TIMER_CODE_COPY')}
						className="absolute top-5 right-6 bg-background"
					>
						{copyIcon}
					</Button>
					<span role="status" className="sr-only">
						{status}
					</span>
				</div>
			</SettingsSurface>
		</SettingsSection>
	);
}
