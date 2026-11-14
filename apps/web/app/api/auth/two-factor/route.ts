import { proxyTwoFactorStatus } from '@/core/services/server/two-factor-proxy';

// Proxy mode twin of Gauzy's `GET /auth/two-factor`: the signed-in person's own two-factor state.
export async function GET(req: Request) {
	return proxyTwoFactorStatus(req);
}
