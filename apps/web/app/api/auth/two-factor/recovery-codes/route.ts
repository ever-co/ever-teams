import { proxyTwoFactorWrite } from '@/core/services/server/two-factor-proxy';

// Proxy mode twin of Gauzy's `POST /auth/two-factor/recovery-codes`: new recovery codes, with a current code.
export async function POST(req: Request) {
	return proxyTwoFactorWrite(req, 'recovery-codes');
}
