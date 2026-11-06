import { proxyAccountDeletion } from '@/core/services/server/requests/account-deletion';

// Proxy mode (no NEXT_PUBLIC_GAUZY_API_SERVER_URL): forwards to Gauzy POST /api/account-deletion/request. Public route.
export async function POST(req: Request) {
	return proxyAccountDeletion('request', req);
}
