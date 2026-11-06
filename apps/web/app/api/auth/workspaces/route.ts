import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * Proxy mode twin of Gauzy's `GET /auth/workspaces`: the workspaces of the caller, with their teams when asked
 * (`includeTeams`). Without this static segment the request fell into the NextAuth catch-all, which answers 400.
 */
export async function GET(req: Request) {
	return forwardToGauzy(req, '/auth/workspaces');
}
