import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode twin of the platform's `GET /plugins/docs/exports/pdf` (the PDF export probe; 404 while it is off). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/plugins/docs/exports/pdf');
}
