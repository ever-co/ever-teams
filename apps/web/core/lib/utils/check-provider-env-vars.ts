import Apple from 'next-auth/providers/apple';
import Discord from 'next-auth/providers/discord';
import Facebook from 'next-auth/providers/facebook';
import Google from 'next-auth/providers/google';
import Github from 'next-auth/providers/github';
import Linkedin from 'next-auth/providers/linkedin';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import Slack from 'next-auth/providers/slack';
import Twitter from 'next-auth/providers/twitter';
import type { Provider } from 'next-auth/providers';
import {
	APPLE_CLIENT_ID,
	APPLE_CLIENT_SECRET,
	DISCORD_CLIENT_ID,
	DISCORD_CLIENT_SECRET,
	FACEBOOK_CLIENT_ID,
	FACEBOOK_CLIENT_SECRET,
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	LINKEDIN_CLIENT_ID,
	LINKEDIN_CLIENT_SECRET,
	MICROSOFT_CLIENT_ID,
	MICROSOFT_CLIENT_SECRET,
	MICROSOFT_TENANT_ID,
	SLACK_CLIENT_ID,
	SLACK_CLIENT_SECRET,
	TWITTER_CLIENT_ID,
	TWITTER_CLIENT_SECRET
} from '@/core/constants/config/constants';
import { readRuntimeEnv } from '@/env-config';

type ProviderNames = {
	[key: string]: string | undefined;
};

/**
 * Display names of the social providers, keyed by the next-auth PROVIDER ID, read from the RUNTIME
 * (container) env first so a published Docker image can advertise its own providers; the literal is
 * the build-time fallback.
 *
 * The key is the provider id, never the display name: the id is what next-auth serves
 * (/api/auth/callback/<id>), what runtime-env.ts publishes as EVER_TEAMS_AUTH_PROVIDERS and what the
 * buttons match on. Keying on a hand-written name is what made Microsoft impossible to enable - the
 * entry was 'microsoftEntraId' here and an all-lowercase variant below, while the provider answers to
 * the id 'microsoft-entra-id' and the name 'Microsoft Entra ID', so no lookup could ever hit it.
 *
 * `??`, not `||`: a provider counts as advertised when its NEXT_PUBLIC_<X>_APP_NAME is SET, even to
 * an empty string (see filteredProviders), so a runtime '' must not fall through to a build-time value.
 */
export const providerNames: ProviderNames = {
	apple: readRuntimeEnv('NEXT_PUBLIC_APPLE_APP_NAME') ?? process.env.NEXT_PUBLIC_APPLE_APP_NAME,
	discord: readRuntimeEnv('NEXT_PUBLIC_DISCORD_APP_NAME') ?? process.env.NEXT_PUBLIC_DISCORD_APP_NAME,
	facebook: readRuntimeEnv('NEXT_PUBLIC_FACEBOOK_APP_NAME') ?? process.env.NEXT_PUBLIC_FACEBOOK_APP_NAME,
	google: readRuntimeEnv('NEXT_PUBLIC_GOOGLE_APP_NAME') ?? process.env.NEXT_PUBLIC_GOOGLE_APP_NAME,
	github: readRuntimeEnv('NEXT_PUBLIC_GITHUB_APP_NAME') ?? process.env.NEXT_PUBLIC_GITHUB_APP_NAME,
	linkedin: readRuntimeEnv('NEXT_PUBLIC_LINKEDIN_APP_NAME') ?? process.env.NEXT_PUBLIC_LINKEDIN_APP_NAME,
	'microsoft-entra-id':
		readRuntimeEnv('NEXT_PUBLIC_MICROSOFT_APP_NAME') ?? process.env.NEXT_PUBLIC_MICROSOFT_APP_NAME,
	slack: readRuntimeEnv('NEXT_PUBLIC_SLACK_APP_NAME') ?? process.env.NEXT_PUBLIC_SLACK_APP_NAME,
	twitter: readRuntimeEnv('NEXT_PUBLIC_TWITTER_APP_NAME') ?? process.env.NEXT_PUBLIC_TWITTER_APP_NAME
};

export const providers: Provider[] = [
	Apple({
		clientId: APPLE_CLIENT_ID,
		clientSecret: APPLE_CLIENT_SECRET || ''
	}),
	Discord({
		clientId: DISCORD_CLIENT_ID,
		clientSecret: DISCORD_CLIENT_SECRET
	}),
	Facebook({
		clientId: FACEBOOK_CLIENT_ID,
		clientSecret: FACEBOOK_CLIENT_SECRET
	}),
	Google({
		clientId: GOOGLE_CLIENT_ID,
		clientSecret: GOOGLE_CLIENT_SECRET
	}),
	Github({
		clientId: GITHUB_CLIENT_ID,
		clientSecret: GITHUB_CLIENT_SECRET
	}),
	Linkedin({
		clientId: LINKEDIN_CLIENT_ID,
		clientSecret: LINKEDIN_CLIENT_SECRET
	}),
	MicrosoftEntraID({
		clientId: MICROSOFT_CLIENT_ID,
		clientSecret: MICROSOFT_CLIENT_SECRET,
		// The provider defaults to the 'common' issuer, which only works for a MULTI-tenant app
		// registration; a single-tenant one must authorise against its own tenant (else AADSTS50194).
		// Set through `issuer` rather than the provider's `tenantId`, which @auth/core builds the same
		// URL from but no longer declares in its config type. undefined keeps the provider's default.
		issuer: MICROSOFT_TENANT_ID?.trim()
			? `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID.trim()}/v2.0`
			: undefined
	}),
	Slack({
		clientId: SLACK_CLIENT_ID,
		clientSecret: SLACK_CLIENT_SECRET
	}),
	Twitter({
		clientId: TWITTER_CLIENT_ID,
		clientSecret: TWITTER_CLIENT_SECRET
	})
];

/**
 * A provider is available only when it is BOTH advertised (NEXT_PUBLIC_<X>_APP_NAME set) AND
 * actually configured (a non-blank client id AND client secret: without the secret the OAuth
 * token exchange fails after the user already went through the provider's consent screen).
 *
 * Previously this filtered on the display name alone. On production and stage
 * NEXT_PUBLIC_GITHUB_APP_NAME / NEXT_PUBLIC_TWITTER_APP_NAME were set while
 * GITHUB_CLIENT_ID / TWITTER_CLIENT_ID were EMPTY, so the GitHub and Twitter/X buttons
 * rendered on app.ever.team, and clicking them sent users to the provider with
 * `client_id=` — a dead-end error page. Found by the 2026-08-17 browser sweep on prod.
 *
 * Gate, do not delete: the moment the credentials are supplied the button reappears.
 */
const providerClientIds: Record<string, string | undefined> = {
	apple: APPLE_CLIENT_ID,
	discord: DISCORD_CLIENT_ID,
	facebook: FACEBOOK_CLIENT_ID,
	google: GOOGLE_CLIENT_ID,
	github: GITHUB_CLIENT_ID,
	linkedin: LINKEDIN_CLIENT_ID,
	'microsoft-entra-id': MICROSOFT_CLIENT_ID,
	slack: SLACK_CLIENT_ID,
	twitter: TWITTER_CLIENT_ID
};

const providerClientSecrets: Record<string, string | undefined> = {
	apple: APPLE_CLIENT_SECRET,
	discord: DISCORD_CLIENT_SECRET,
	facebook: FACEBOOK_CLIENT_SECRET,
	google: GOOGLE_CLIENT_SECRET,
	github: GITHUB_CLIENT_SECRET,
	linkedin: LINKEDIN_CLIENT_SECRET,
	'microsoft-entra-id': MICROSOFT_CLIENT_SECRET,
	slack: SLACK_CLIENT_SECRET,
	twitter: TWITTER_CLIENT_SECRET
};

function getProviderId(provider: Provider): string {
	return typeof provider === 'function' ? provider().id : provider.id;
}

export const filteredProviders = providers.filter((provider) => {
	const providerId = getProviderId(provider);
	const advertised = providerNames[providerId] !== undefined;
	const configured = !!providerClientIds[providerId]?.trim() && !!providerClientSecrets[providerId]?.trim();
	return advertised && configured;
});

/**
 * Ids of the social providers next-auth actually serves (auth.ts), in display order.
 *
 * The browser cannot work this out itself: the client ids are server-only env, so a client component
 * computing it always got an empty list and no social-login button ever rendered. The server publishes
 * this list instead (core/services/server/runtime-env.ts) — provider ids only, never a client id or
 * secret. Derived from filteredProviders so the buttons and next-auth can never disagree.
 */
export function getConfiguredAuthProviderIds(): string[] {
	return filteredProviders.map(getProviderId);
}

export const mappedProviders = filteredProviders.map((provider) => {
	if (typeof provider === 'function') {
		const providerData = provider();
		return { id: providerData.id, name: providerData.name };
	} else return { id: provider.id, name: provider.name };
});
