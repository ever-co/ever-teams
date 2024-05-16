import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Facebook from 'next-auth/providers/facebook';
import Google from 'next-auth/providers/google';
import Github from 'next-auth/providers/github';
import Twitter from 'next-auth/providers/twitter';

const providers: Provider[] = [Facebook, Google, Github, Twitter];

export const mappedProviders = providers.map((provider) => {
	if (typeof provider === 'function') {
		const providerData = provider();
		return { id: providerData.id, name: providerData.name };
	} else return { id: provider.id, name: provider.name };
});

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: providers,
	// pages: {
	// 	signIn: '/auth/passcode'
	// },
	callbacks: {
		async signIn({ account, profile }) {
			if (account?.provider === 'google') {
				return !!(profile?.email_verified && profile.email?.endsWith('@gmail.com'));
			}
			return true; // We gonna add other validations for other providers
		}
	},
	debug: true,
	logger: {
		error(code, ...message) {
			console.error(code, message);
		},
		warn(code, ...message) {
			console.warn(code, message);
		},
		debug(code, ...message) {
			console.debug(code, message);
		}
	}
});
