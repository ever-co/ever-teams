import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of Gauzy's `/auth/sessions` (GET, ever-co/ever-gauzy#11943): where the signed-in user is signed in.
 * Gauzy answers with this user's own sessions only; the answer names devices and addresses, so no cache keeps it.
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/auth/sessions', { noStore: true });
}
