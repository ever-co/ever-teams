import { proxyTwoFactorWrite } from '@/core/services/server/two-factor-proxy';

// Proxy mode twin of Gauzy's `POST /auth/two-factor/disable`: turns it off with a current code or a recovery code.
export async function POST(req: Request) {
	return proxyTwoFactorWrite(req, 'disable');
}
