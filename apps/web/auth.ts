import NextAuth from 'next-auth';
import { filteredProviders } from '@app/utils/check-provider-env-vars';
import { GauzyAdapter, jwtCallback, ProviderEnum, signInCallback } from '@app/services/server/requests/OAuth';
import { NextRequest } from 'next/server';
import { AUTH_SECRET, IS_DESKTOP_APP, developmentAuthSecret, isDevelopment } from '@app/constants';

const secretKey = AUTH_SECRET || (isDevelopment ? developmentAuthSecret : '');

if (!secretKey) {
	throw new Error('Missing secret: Please define AUTH_SECRET in the environment variables.');
}

export const { handlers, signIn, signOut, auth } = NextAuth((request) => ({
	providers: filteredProviders,
	trustHost: IS_DESKTOP_APP || process.env.NODE_ENV === 'production',
	secret: secretKey,
	debug: process.env.NODE_ENV === 'development',
	adapter: GauzyAdapter(request as NextRequest),
	session: { strategy: 'jwt' },
	callbacks: {
		async signIn({ account }) {
			try {
				if (account) {
					const { provider, access_token } = account;
					if (access_token) {
						await signInCallback(provider as ProviderEnum, access_token);
						return true;
					}
					return true;
				}
				return false;
			} catch (error) {
				console.error('Error in signIn callback:', error);
				return false;
			}
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
		error: '/auth/error',
		newUser: '/auth/social-welcome'
	}
}));
