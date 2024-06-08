import NextAuth from 'next-auth';
import { filteredProviders } from '@app/utils/check-provider-env-vars';
import { GauzyAdapter, jwtCallback, ProviderEnum } from '@app/services/server/requests/OAuth';
import { NextRequest } from 'next/server';

export const { handlers, signIn, signOut, auth } = NextAuth((request) => ({
	providers: filteredProviders,
	adapter: GauzyAdapter(request as NextRequest),
	callbacks: {
		async signIn({ account }) {
			if (account) {
				const { provider, access_token } = account;
				if (access_token) {
					// return await signInCallback(provider as ProviderEnum, access_token);
					return true;
				}
				return true;
			}
			return false;
		},

		async jwt({ token, user, trigger, session, account }) {
			if (user && account) {
				const { access_token, provider } = account;
				if (access_token) {
					token.authCookie = await jwtCallback(provider as ProviderEnum, access_token);
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
}));
