import { proxyCreateEmployeePlaceholder } from '@/core/services/server/employee-placeholder-proxy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

// Proxy mode twin of Gauzy's `POST /employee-placeholder`: a member without an account (ever-gauzy #11913). The body is
// read as JSON whatever its declared type, so a form another site posts with the session's cookies would add a member:
// it must come from this app's own pages.
export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	return proxyCreateEmployeePlaceholder(req);
}
