import { proxyResetMemberTwoFactor } from '@/core/services/server/two-factor-proxy';

// Proxy mode twin of Gauzy's `DELETE /auth/two-factor/users/:userId`: an administrator resets a member's second factor.
export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params;
	return proxyResetMemberTwoFactor(req, userId);
}
