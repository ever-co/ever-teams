import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Google from 'next-auth/providers/google';
import Github from 'next-auth/providers/github';

const providers: Provider[] = [Google, Github];

export const mappedProviders = providers.map((provider) => {
	if (typeof provider === 'function') {
		const providerData = provider();
		return { id: providerData.id, name: providerData.name };
	} else return { id: provider.id, name: provider.name };
});

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: providers,
	pages: {
		signIn: '/auth/passcode'
	},
	callbacks: {
		async signIn({ account, profile }) {
			if (account?.provider === 'google') {
				return !!(profile?.email_verified && profile.email?.endsWith('@gmail.com'));
			}
			return true; // We gonna add other validations for other providers
		}
	}
});
