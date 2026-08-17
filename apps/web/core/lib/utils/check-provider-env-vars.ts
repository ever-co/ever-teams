import Apple from 'next-auth/providers/apple';
import Discord from 'next-auth/providers/discord';
import Facebook from 'next-auth/providers/facebook';
import Google from 'next-auth/providers/google';
import Github from 'next-auth/providers/github';
import Linkedin from 'next-auth/providers/linkedin';
import MicrosoftEntraID from 'next-auth/providers/azure-ad';
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
	SLACK_CLIENT_ID,
	SLACK_CLIENT_SECRET,
	TWITTER_CLIENT_ID,
	TWITTER_CLIENT_SECRET
} from '@/core/constants/config/constants';

type ProviderNames = {
	[key: string]: string | undefined;
};

export const providerNames: ProviderNames = {
	apple: process.env.NEXT_PUBLIC_APPLE_APP_NAME,
	discord: process.env.NEXT_PUBLIC_DISCORD_APP_NAME,
	facebook: process.env.NEXT_PUBLIC_FACEBOOK_APP_NAME,
	google: process.env.NEXT_PUBLIC_GOOGLE_APP_NAME,
	github: process.env.NEXT_PUBLIC_GITHUB_APP_NAME,
	linkedin: process.env.NEXT_PUBLIC_LINKEDIN_APP_NAME,
	microsoftEntraId: process.env.NEXT_PUBLIC_MICROSOFTENTRAID_APP_NAME,
	slack: process.env.NEXT_PUBLIC_SLACK_APP_NAME,
	twitter: process.env.NEXT_PUBLIC_TWITTER_APP_NAME
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
		clientSecret: MICROSOFT_CLIENT_SECRET
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
 * actually configured (a non-empty client id).
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
	microsoftentraid: MICROSOFT_CLIENT_ID,
	slack: SLACK_CLIENT_ID,
	twitter: TWITTER_CLIENT_ID
};

export const filteredProviders = providers.filter((provider) => {
	const providerName = provider.name.toLowerCase();
	const providerId = typeof provider === 'function' ? provider().id : provider.id;
	const advertised = providerNames[providerName] !== undefined || providerNames[providerId] !== undefined;
	const configured = !!(providerClientIds[providerId] || providerClientIds[providerName])?.trim();
	return advertised && configured;
});

export const mappedProviders = filteredProviders.map((provider) => {
	if (typeof provider === 'function') {
		const providerData = provider();
		return { id: providerData.id, name: providerData.name };
	} else return { id: provider.id, name: provider.name };
});
