'use server';

import { signIn, signOut } from '../../../auth';

export async function signInFunction(provider: any) {
	return await signIn(provider.id, { redirectTo: '/auth/workspace' });
}

export async function signOutFunction() {
	return await signOut({ redirectTo: '/auth/passcode' });
}
