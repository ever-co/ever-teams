import { proxyTwoFactorWrite } from '@/core/services/server/two-factor-proxy';

// Proxy mode twin of Gauzy's `POST /auth/two-factor/confirm`: the first code turns it on; recovery codes, shown once.
export async function POST(req: Request) {
	return proxyTwoFactorWrite(req, 'confirm');
}
