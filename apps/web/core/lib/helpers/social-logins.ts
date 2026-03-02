'use server';

import { signIn, signOut } from '@/auth';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';

export async function signInFunction(provider: any) {
	return await signIn(provider.id, { redirectTo: '/auth/workspace' });
}

export async function signOutFunction() {
	return await signOut({ redirectTo: DEFAULT_APP_PATH });
}
