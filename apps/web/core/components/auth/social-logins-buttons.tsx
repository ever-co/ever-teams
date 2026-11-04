'use client';

import { IconsBrandGoogleSolid, IconsFacebook, IconsGithubFilled, IconsTwitterFilled } from '@/core/components/icons';
import { useRuntimeEnvValue } from '@/core/components/providers/runtime-env-provider';
import { signInFunction } from '../../lib/helpers/social-logins';
import { IS_DEMO_MODE } from '@/core/constants/config/constants';
import { Button } from '../common/button';
import { EverIdLoginButton } from './ever-id-login-button';
import { useTranslations } from 'next-intl';

/** The next-auth provider id of Ever ID (the server-only config module is not imported here, see below). */
const EVER_ID = 'ever-id';

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
	// Ever ID has a button of its own: "Login with Ever ID", as wide as the form's primary button, above the others.
	const everId = configuredProviderIds.has(EVER_ID) ? { id: EVER_ID, name: 'Ever ID' } : null;

	if ((availableProviders.length === 0 && !everId) || IS_DEMO_MODE) {
		return null;
	}

	return (
		<div className="space-y-6">
			{/* Divider */}
			<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
				<div className="h-px bg-border" />
				<div className="text-xs text-center text-muted-foreground">{t('pages.auth.OR_CONTINUE_WITH')}</div>
				<div className="h-px bg-border" />
			</div>

			<div className="space-y-3">
				{everId && (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							void signInFunction(everId);
						}}
					>
						<EverIdLoginButton />
					</form>
				)}

				{/* Social buttons in 2x2 grid */}
				{availableProviders.length > 0 && (
					<div className="grid grid-cols-2 gap-3">
						{availableProviders.map((provider) => {
							const providerInfo = providerIcons[provider.id];

							return (
								<form
									key={provider.id}
									onSubmit={(e) => {
										e.preventDefault();
										void signInFunction(provider);
									}}
								>
									<Button type="submit" variant="outline" className="w-full">
										{providerInfo.icon}
										{providerInfo.label}
									</Button>
								</form>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
