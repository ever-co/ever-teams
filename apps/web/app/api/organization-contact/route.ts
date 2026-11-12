import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';
import { refuseWithoutPermission } from '@/core/services/server/refuse-without-permission';
import { CLIENT_CREATE_PERMISSIONS } from '@/core/lib/utils/clients';

/** Proxy mode twin of Gauzy's `POST /organization-contact`. */
export async function POST(req: Request) {
	const refusal = await refuseWithoutPermission(req, CLIENT_CREATE_PERMISSIONS);
	if (refusal) {
		return refusal;
	}
	return forwardToGauzy(req, '/organization-contact');
}
