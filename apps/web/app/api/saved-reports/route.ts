import { proxyListSavedReports, proxySavedReportWrite } from '@/core/services/server/saved-report-proxy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

// Proxy mode twins of Gauzy's `GET /saved-reports` (the caller's reports of an organization) and `POST /saved-reports`.
// The write reads its body as JSON whatever its declared type, so a form another site posts with the session's cookies
// would save a report: it must come from this app's own pages.
export async function GET(req: Request) {
	return proxyListSavedReports(req);
}

export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	return proxySavedReportWrite(req, 'create');
}
