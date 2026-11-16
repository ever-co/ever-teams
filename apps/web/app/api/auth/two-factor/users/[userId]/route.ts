import { proxyResetMemberTwoFactor } from '@/core/services/server/two-factor-proxy';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';

// Proxy mode twin of Gauzy's `DELETE /auth/two-factor/users/:userId`: an administrator resets a member's second factor.
export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { userId } = await params;
	return proxyResetMemberTwoFactor(req, userId);
}
