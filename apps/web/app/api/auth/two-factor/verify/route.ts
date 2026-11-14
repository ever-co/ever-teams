import { proxyTwoFactorVerify } from '@/core/services/server/two-factor-proxy';

// Proxy mode twin of Gauzy's `POST /auth/two-factor/verify`: the code step of a sign-in, answered with the session.
export async function POST(req: Request) {
	return proxyTwoFactorVerify(req);
}
