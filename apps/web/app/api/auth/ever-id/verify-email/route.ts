import { NextResponse } from 'next/server';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { getEverIdConfig } from '@/core/lib/auth/ever-id/config';
import { everIdHandoffFromRequest } from '@/core/lib/auth/ever-id/handoff';

/**
 * Opens Ever ID's e-mail verification for a person whose Ever ID sign-in was refused because Ever ID has not verified
 * their e-mail address yet: the page that asks to verify it (/auth/error?error=EverIdEmailUnverified) links here.
 *
 * The Ever ID subject comes from the sealed cookie that sign-in set, never from the page or a URL of this app. With it
 * the browser goes to Ever ID's verification form for that person (where they enter the code Ever ID e-mailed them,
 * or have a new one sent); without it (expired, another browser) back to the sign-in, whose next refusal sets it
 * again. 404 while the Ever ID sign-in is not configured.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Ever ID's e-mail verification form (its hosted login, ZITADEL Login V2). */
const EVER_ID_VERIFY_PATH = '/ui/v2/login/verify';

export function GET(req: Request) {
	const config = getEverIdConfig();
	if (!config) {
		return new NextResponse(null, { status: 404, headers: NO_STORE });
	}
	const subject = everIdHandoffFromRequest(req, 'verify_email');
	let location: string = DEFAULT_APP_PATH;
	if (subject) {
		const verify = new URL(EVER_ID_VERIFY_PATH, config.issuer);
		verify.searchParams.set('userId', subject);
		location = verify.href;
	}
	// A same-origin fallback stays a relative Location: behind the proxy the request URL may name the pod, not the app.
	return new NextResponse(null, { status: 303, headers: { ...NO_STORE, Location: location } });
}
