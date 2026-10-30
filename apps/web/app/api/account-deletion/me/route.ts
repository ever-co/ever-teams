import { proxyAccountDeletionMe } from '@/core/services/server/requests/account-deletion-me';

// Proxy mode (no NEXT_PUBLIC_GAUZY_API_SERVER_URL): Gauzy's signed-in account deletion of the current account.
export async function GET(req: Request) {
	return proxyAccountDeletionMe('GET', req);
}

export async function POST(req: Request) {
	return proxyAccountDeletionMe('POST', req);
}
