'use client';

import { IconsBrandGoogleSolid, IconsFacebook, IconsGithubFilled, IconsTwitterFilled } from '@/core/components/icons';
import { useRuntimeEnvValue } from '@/core/components/providers/runtime-env-provider';
import { signInFunction } from '../../lib/helpers/social-logins';
import { IS_DEMO_MODE } from '@/core/constants/config/constants';
import { Button } from '../common/button';
import { useTranslations } from 'next-intl';

const SOCIAL_BUTTON_CLASS =
	'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm shadow-black/10 border border-transparent bg-card ring-1 ring-foreground/10 duration-200 hover:bg-muted/50 dark:ring-foreground/15 dark:hover:bg-muted/50 h-9 px-4 py-2 w-full text-foreground';

/**
 * Which providers are usable is decided on the server (their client ids are server-only config) and
 * published as EVER_TEAMS_AUTH_PROVIDERS, a comma list of next-auth provider ids (see
 * core/services/server/runtime-env.ts). Importing the provider module here instead would ship
 * next-auth's providers to the browser and still find no client id there, so no button ever showed.
 */
function parseProviderIds(value: string | undefined): Set<string> {
	return new Set((value ?? '').split(',').map((id) => id.trim()));
}

export default function SocialLogins() {
	const t = useTranslations();
	const configuredProviderIds = parseProviderIds(useRuntimeEnvValue('EVER_TEAMS_AUTH_PROVIDERS'));
	const providerIcons: Record<string, { icon: React.ReactNode; label: string }> = {
		facebook: {
			icon: <IconsFacebook aria-hidden="true" className="size-4" />,
			label: 'Facebook'
		},
		google: {
			icon: <IconsBrandGoogleSolid aria-hidden="true" className="size-4" />,
			label: 'Google'
		},
		github: {
			icon: <IconsGithubFilled aria-hidden="true" className="size-4" />,
			label: 'GitHub'
		},
		twitter: {
			icon: <IconsTwitterFilled aria-hidden="true" className="size-4" />,
			label: 'Twitter'
		}
	};

	// Buttons keep the order of providerIcons; providers without a button (apple, slack, ...) are skipped.
	const availableProviders = Object.keys(providerIcons)
		.filter((id) => configuredProviderIds.has(id))
		.map((id) => ({ id, name: providerIcons[id].label }));

	if (availableProviders.length === 0 || IS_DEMO_MODE) {
		return null;
	}

	return (
		<div className="space-y-6">
			{/* Divider */}
			<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
				<div className="bg-border border-card h-0.5 border-b" />
				<div className="text-xs text-center uppercase text-muted-foreground">
					{t('pages.auth.OR_CONTINUE_WITH')}
				</div>
				<div className="bg-border border-card h-0.5 border-b" />
			</div>

			{/* Social buttons in 2x2 grid */}
			<div className="grid grid-cols-2 gap-3">
				{availableProviders.map((provider) => {
					const providerInfo = providerIcons[provider.id];

					return (
						<form
							key={provider.id}
							onSubmit={(e) => {
								e.preventDefault();
								signInFunction(provider);
							}}
						>
							<Button type="submit" variant="secondary" className={SOCIAL_BUTTON_CLASS}>
								{providerInfo.icon}
								{providerInfo.label}
							</Button>
						</form>
					);
				})}
			</div>
		</div>
	);
}
