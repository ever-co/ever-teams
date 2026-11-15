import { proxyListSavedReports, proxySavedReportWrite } from '@/core/services/server/saved-report-proxy';

// Proxy mode twins of Gauzy's `GET /saved-reports` (the caller's reports of an organization) and `POST /saved-reports`.
export async function GET(req: Request) {
	return proxyListSavedReports(req);
}

export async function POST(req: Request) {
	return proxySavedReportWrite(req, 'create');
}
