import { EProvider } from '@/core/types/generics/enums/social-accounts';

/**
 * Starts the Ever ID sign-in again (browser side). Its workspace tokens last 15 minutes: a chooser left open longer
 * cannot use them any more. The sign-in server action is loaded only then, since the pages that call this serve
 * every other sign-in too.
 */
export function restartEverIdSignIn(): void {
	void import('@/core/lib/helpers/social-logins').then(({ signInFunction }) =>
		signInFunction({ id: EProvider.EVER_ID })
	);
}
