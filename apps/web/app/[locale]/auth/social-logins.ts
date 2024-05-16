'use server';

import { signIn } from '../../../auth';

export async function signInFunction(provider: any) {
	return await signIn(provider.id);
}
