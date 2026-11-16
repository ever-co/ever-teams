import { proxyTwoFactorWrite } from '@/core/services/server/two-factor-proxy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

// Proxy mode twin of Gauzy's `POST /auth/two-factor/confirm`: the first code turns it on; recovery codes, shown once.
export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	return proxyTwoFactorWrite(req, 'confirm');
}
