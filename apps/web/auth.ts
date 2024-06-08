import NextAuth from 'next-auth';
import { filteredProviders } from '@app/utils/check-provider-env-vars';
import { GauzyAdapter, jwtCallback, ProviderEnum, signInCallback } from '@app/services/server/requests/OAuth';

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: filteredProviders,
	adapter: GauzyAdapter,
	callbacks: {
		async signIn({ account }) {
			if (account) {
				const { provider, access_token } = account;
				if (access_token) {
					return await signInCallback(provider as ProviderEnum, access_token);
				}
			}
			return true;
		},

		async jwt({ token, user, trigger, session, account }) {
			if (user) {
				if (account) {
					const { access_token, provider } = account;
					if (access_token) {
						token.authCookie = await jwtCallback(provider as ProviderEnum, access_token);
					}
				}
			}

			if (trigger === 'update' && session) {
				token = { ...token, authCookie: session };
			}

			return token;
		},
		session({ session, token }) {
			session.user = token.authCookie as any;
			return session;
		}
	},
	pages: {
		error: '/auth/error'
	}
});
