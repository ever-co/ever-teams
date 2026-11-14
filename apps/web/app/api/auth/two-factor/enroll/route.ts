import { proxyTwoFactorWrite } from '@/core/services/server/two-factor-proxy';

// Proxy mode twin of Gauzy's `POST /auth/two-factor/enroll`: starts a setup (the secret, as text and as an address).
export async function POST(req: Request) {
	return proxyTwoFactorWrite(req, 'enroll');
}
