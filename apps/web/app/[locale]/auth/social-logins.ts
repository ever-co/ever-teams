'use server';

import { signIn, auth } from '../../../auth';

export async function signInFunction(provider: any) {
	auth().then((session) => console.log(session));
	return await signIn(provider.id, { redirectTo: '/' });
}
