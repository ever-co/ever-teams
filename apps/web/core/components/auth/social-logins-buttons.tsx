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

function providerCellClassOf(spansRow: boolean) {
	if (spansRow) {
		return 'col-span-2';
	}
	return undefined;
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

	const hasProviders = availableProviders.length > 0;
	const lastIndex = availableProviders.length - 1;
	const hasOddCount = availableProviders.length % 2 === 1;

	return (
		<div className="flex flex-col gap-5">
			<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
				<span aria-hidden="true" className="h-px bg-border" />
				<span className="text-xs text-muted-foreground">{t('pages.auth.OR_CONTINUE_WITH')}</span>
				<span aria-hidden="true" className="h-px bg-border" />
			</div>

			<div className="flex flex-col gap-2.5">
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

				{hasProviders && (
					<div className="grid grid-cols-2 gap-2.5">
						{availableProviders.map((provider, index) => {
							const providerInfo = providerIcons[provider.id];
							const isLast = index === lastIndex;
							const spansRow = isLast && hasOddCount;

							return (
								<form
									key={provider.id}
									className={providerCellClassOf(spansRow)}
									onSubmit={(e) => {
										e.preventDefault();
										void signInFunction(provider);
									}}
								>
									<Button type="submit" variant="outline" className="w-full max-sm:h-11">
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
