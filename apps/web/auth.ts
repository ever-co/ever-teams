import NextAuth, { type DefaultSession, type NextAuthConfig } from 'next-auth';
import { filteredProviders } from '@/core/lib/utils/check-provider-env-vars';
import { GauzyAdapter, jwtCallback, signInCallback } from '@/core/services/server/requests/o-auth';
import { NextRequest } from 'next/server';
import { IS_DESKTOP_APP, authSecret, isDevelopment } from '@/core/constants/config/constants';
import { EProvider } from '@/core/types/generics/enums/social-accounts';
import {
	everIdJwtPayload,
	everIdSessionUpdate,
	everIdSignInCallback,
	isEverIdSessionData
} from '@/core/services/server/ever-id/sign-in';

declare module 'next-auth' {
	interface Session extends DefaultSession {
		authCookie?: string;
	}
}

const config: NextAuthConfig = {
	providers: filteredProviders,
	trustHost: IS_DESKTOP_APP || process.env.NODE_ENV === 'production' || isDevelopment,
	secret: authSecret,
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
				token.everId = true;
				return token;
			}
			// Ever ID: once the chooser's workspace sign-in reported its tokens, nothing that can sign in again stays in
			// this session; no update of an Ever ID session stores its payload
			if (trigger === 'update' && (token.everId === true || isEverIdSessionData(token.authCookie))) {
				everIdSessionUpdate(token, session);
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
