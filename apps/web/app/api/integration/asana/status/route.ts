import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/** Proxy mode: the Asana integration's status of an organization (`?organizationId=` passes through). */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/integration/asana/status');
}
