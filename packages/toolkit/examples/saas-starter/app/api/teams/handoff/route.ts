import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { takeTeamsHandoff } from '@/lib/auth/teams-handoff';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Hands the Teams token left by the last sign-in (`connectTeamsAccount`) to the signed-in page, once.
 * POST only (never cached or prefetched); 401 without a local session; `{ token: null }` when there is none.
 */
export async function POST() {
	// getSession throws on a session cookie it cannot verify: no session either way
	if (!(await getSession().catch(() => null))) {
		return NextResponse.json({ token: null }, { status: 401, headers: NO_STORE });
	}
	return NextResponse.json({ token: await takeTeamsHandoff() }, { headers: NO_STORE });
}
