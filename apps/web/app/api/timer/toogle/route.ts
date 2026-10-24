import { POST as togglePOST } from '../toggle/route';

/**
 * @deprecated The old, misspelled path of `/api/timer/toggle`. Kept so a client or an open tab that still posts
 * here keeps working; new code calls `/api/timer/toggle`.
 */
export async function POST(req: Request) {
	return togglePOST(req);
}
