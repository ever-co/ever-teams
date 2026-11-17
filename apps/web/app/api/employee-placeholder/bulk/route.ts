import { proxyCreateEmployeePlaceholders } from '@/core/services/server/employee-placeholder-proxy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

// Proxy mode twin of Gauzy's `POST /employee-placeholder/bulk`: members without an account, for an import. Like one
// member's, it must come from this app's own pages.
export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	return proxyCreateEmployeePlaceholders(req);
}
