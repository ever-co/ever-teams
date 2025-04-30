import NextAuth, { type DefaultSession, type NextAuthConfig } from 'next-auth';
import { filteredProviders } from '@/core/lib/utils/check-provider-env-vars';
import { GauzyAdapter, jwtCallback, ProviderEnum, signInCallback } from '@/core/services/server/requests/OAuth';
import { NextRequest } from 'next/server';
import { AUTH_SECRET, IS_DESKTOP_APP, developmentAuthSecret, isDevelopment } from '@/core/constants/config/constants';

declare module 'next-auth' {
	interface Session extends DefaultSession {
		authCookie?: string;
	}
}

const secretKey = AUTH_SECRET || (isDevelopment ? developmentAuthSecret : '');

if (!secretKey) {
	console.warn('Missing secret: Please define AUTH_SECRET in the environment variables.');
}

const config: NextAuthConfig = {
	providers: filteredProviders,
	trustHost: IS_DESKTOP_APP || process.env.NODE_ENV === 'production',
	secret: secretKey,
	debug: process.env.NODE_ENV === 'development',
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
		async jwt({ token, user, account, trigger, session }) {
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
		async session({ session, token }) {
			return {
				...session,
				authCookie: token.authCookie
			};
		}
	},
	pages: {
		error: '/auth/error',
		newUser: '/auth/social-welcome'
	}
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(async (request) => {
	return {
		...config,
		adapter: GauzyAdapter(request as NextRequest)
	};
});
