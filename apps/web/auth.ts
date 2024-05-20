import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Facebook from 'next-auth/providers/facebook';
import Google from 'next-auth/providers/google';
import Github from 'next-auth/providers/github';
import Twitter from 'next-auth/providers/twitter';
import { signWithSocialLoginsRequest } from '@app/services/server/requests';

const providers: Provider[] = [Facebook, Google, Github, Twitter];

export const mappedProviders = providers.map((provider) => {
	if (typeof provider === 'function') {
		const providerData = provider();
		return { id: providerData.id, name: providerData.name };
	} else return { id: provider.id, name: provider.name };
});

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: providers,

	callbacks: {
		async signIn({ user, account, profile }) {
			// console.log({ user, account, profile });
			try {
				const { email } = user;
				const gauzyConnectedUser = await signWithSocialLoginsRequest(email ?? '');
				// console.log(
				// 	'============================',
				// 	gauzyConnectedUser.data,
				// 	gauzyConnectedUser.data.workspaces
				// );
				return !!gauzyConnectedUser;
			} catch (error) {
				return false;
			}
		},

		async jwt({ token, user }) {
			if (user) {
				const { email } = user;
				const gauzyConnectedUser = await signWithSocialLoginsRequest(email ?? '');
				token.custom = gauzyConnectedUser;
				token.id = user.id;
			}
			return token;
		},
		session({ session, token }) {
			session.user.id = token.id as string;
			session.user = token.custom as any;
			console.log(session);
			return session;
		}
	}
	// debug: true,
	// logger: {
	// 	error(code, ...message) {
	// 		console.error(code, message);
	// 	},
	// 	warn(code, ...message) {
	// 		console.warn(code, message);
	// 	},
	// 	debug(code, ...message) {
	// 		console.debug(code, message);
	// 	}
	// }
});
