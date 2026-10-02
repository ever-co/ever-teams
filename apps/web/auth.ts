import NextAuth, { type DefaultSession, type NextAuthConfig } from 'next-auth';
import { filteredProviders } from '@/core/lib/utils/check-provider-env-vars';
import { GauzyAdapter, jwtCallback, signInCallback } from '@/core/services/server/requests/o-auth';
import { NextRequest } from 'next/server';
import { AUTH_SECRET, IS_DESKTOP_APP, developmentAuthSecret, isDevelopment } from '@/core/constants/config/constants';
import { EProvider } from '@/core/types/generics/enums/social-accounts';
import { everIdJwtPayload, everIdSignInCallback, isEverIdSessionData } from '@/core/services/server/ever-id/sign-in';

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
	trustHost: IS_DESKTOP_APP || process.env.NODE_ENV === 'production' || isDevelopment,
	secret: secretKey,
	debug: process.env.NODE_ENV === 'development',
	session: { strategy: 'jwt' },
	callbacks: {
		async signIn({ account, profile }) {
			// Ever ID: the ID token is exchanged with the Gauzy API (one call); every other provider keeps the path below
			if (account?.provider === EProvider.EVER_ID) {
				return everIdSignInCallback(account, profile as Record<string, unknown> | undefined);
			}
			try {
				if (account) {
					const { provider, access_token } = account;
					if (access_token) {
						await signInCallback(provider as EProvider, access_token);
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
			// Ever ID: keep the workspace list for the chooser; the Gauzy tokens come from the workspace sign-in
			if (user && account?.provider === EProvider.EVER_ID) {
				const everIdSession = everIdJwtPayload(account);
				if (everIdSession) {
					token.authCookie = everIdSession;
				}
				return token;
			}
			// Ever ID: the chooser's workspace sign-in is done; nothing that can sign in again stays in this session
			if (trigger === 'update' && isEverIdSessionData(token.authCookie)) {
				delete token.authCookie;
				return token;
			}
			if (user && account) {
				const { access_token, provider } = account;
				if (access_token) {
					token.authCookie = await jwtCallback(provider as EProvider, access_token);
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
