import Apple from '@auth/core/providers/apple';
import Discord from '@auth/core/providers/discord';
import Facebook from '@auth/core/providers/facebook';
import Google from '@auth/core/providers/google';
import Github from '@auth/core/providers/github';
import Linkedin from '@auth/core/providers/linkedin';
import MicrosoftEntraID from '@auth/core/providers/microsoft-entra-id';
import Slack from '@auth/core/providers/slack';
import Twitter from '@auth/core/providers/twitter';
import type { Provider } from '@auth/core/providers';

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
	Apple,
	Discord,
	Facebook,
	Google,
	Github,
	Linkedin,
	MicrosoftEntraID,
	Slack,
	Twitter
];

export const filteredProviders = providers.filter((provider) => {
	const providerName = provider.name.toLowerCase();
	return providerNames[providerName] !== undefined;
});

export const mappedProviders = filteredProviders.map((provider) => {
	if (typeof provider === 'function') {
		const providerData = provider();
		return { id: providerData.id, name: providerData.name };
	} else return { id: provider.id, name: provider.name };
});