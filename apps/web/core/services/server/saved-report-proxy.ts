import { NextResponse } from 'next/server';
import { enabledPermissionsOf } from '@/core/lib/utils/member-access';
import { gauzyErrorResponse } from './gauzy-error-response';
import { authenticatedGuard } from './guards/authenticated-guard-app';
import { getMyRolePermissionsRequest } from './requests/role-permissions';
import {
	createSavedReportRequest,
	deleteSavedReportRequest,
	listSavedReportsRequest,
	readSharedReportRequest,
	shareSavedReportRequest,
	unshareSavedReportRequest,
	updateSavedReportRequest
} from './requests/saved-reports';

/**
 * Proxy mode twins (no NEXT_PUBLIC_GAUZY_API_SERVER_URL) of Gauzy's saved reports routes, `/api/saved-reports/*`, and
 * of the public read of a shared report, `/api/public/saved-reports/:token`. Gauzy's answers and refusals pass through
 * unchanged: a report of someone else is its 404, a link asked from an API token session its 403.
 */

/** Gauzy reads saved reports with the permissions of the time log reports they describe: one of these is needed. */
export const SAVED_REPORT_PERMISSIONS: ReadonlyArray<string> = ['TIME_TRACKER', 'ALL_ORG_EDIT', 'ALL_ORG_VIEW'];

/** The token of a link, and the report it opens, are never cached on the way. */
const NO_STORE = { 'Cache-Control': 'no-store' };

type Write = 'create' | 'update' | 'delete' | 'share' | 'unshare';

function isWalkingSegment(segment: string) {
	return segment === '.' || segment === '..';
}

function invalidRequest(message: string): NextResponse {
	return NextResponse.json({ message }, { status: 400, headers: NO_STORE });
}

function withNoStore(response: NextResponse): NextResponse {
	response.headers.set('Cache-Control', 'no-store');
	return response;
}

async function bodyOf(req: Request): Promise<unknown> {
	return req.json().catch(() => null);
}

interface ProxySession {
	bearer_token: string;
	tenantId: string;
}

/** The caller holds one of the permissions the time log reports are read with. */
async function mayUseSavedReports(session: ProxySession): Promise<boolean> {
	const { data: permissions } = await getMyRolePermissionsRequest(session);
	const enabled = enabledPermissionsOf(permissions ?? []);
	return SAVED_REPORT_PERMISSIONS.some((permission) => enabled.includes(permission));
}

function refused(): NextResponse {
	return NextResponse.json({ message: 'You may not use saved reports.' }, { status: 403, headers: NO_STORE });
}

/** The page of the list a request asks for (`skip`, `take`), passed on as given: Gauzy checks it. */
function listPageOf(searchParams: URLSearchParams): { skip?: string; take?: string } {
	const page: { skip?: string; take?: string } = {};
	const skip = searchParams.get('skip');
	if (skip !== null) {
		page.skip = skip;
	}
	const take = searchParams.get('take');
	if (take !== null) {
		page.take = take;
	}
	return page;
}

/** `GET /api/saved-reports?organizationId=&skip=&take=`: one page of the caller's saved reports of an organization. */
export async function proxyListSavedReports(req: Request): Promise<NextResponse> {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');
	const { searchParams } = new URL(req.url);
	const askedOrganizationId = searchParams.get('organizationId') ?? organizationId;
	if (!askedOrganizationId) return invalidRequest('organizationId is required');
	const session = { bearer_token: access_token, tenantId };
	try {
		if (!(await mayUseSavedReports(session))) return refused();
		const { data } = await listSavedReportsRequest({
			...session,
			organizationId: askedOrganizationId,
			...listPageOf(searchParams)
		});
		return NextResponse.json(data, { headers: NO_STORE });
	} catch (error) {
		return withNoStore(await gauzyErrorResponse(error, 'The saved reports could not be read.'));
	}
}

async function sendWrite(write: Write, session: ProxySession, id: string, body: unknown) {
	switch (write) {
		case 'create':
			return createSavedReportRequest({ ...session, body });
		case 'update':
			return updateSavedReportRequest({ ...session, id, body });
		case 'delete':
			return deleteSavedReportRequest({ ...session, id });
		case 'share':
			return shareSavedReportRequest({ ...session, id, body: body ?? {} });
		case 'unshare':
			return unshareSavedReportRequest({ ...session, id });
	}
}

const WRITE_STATUS: Record<Write, number> = { create: 201, update: 200, delete: 204, share: 201, unshare: 204 };

/** The signed-in writes: save, change, delete, turn a link on or replace it, turn it off. */
export async function proxySavedReportWrite(req: Request, write: Write, id = ''): Promise<NextResponse> {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');
	const needsId = write !== 'create';
	const hasNoId = needsId && !id;
	if (hasNoId || isWalkingSegment(id)) return invalidRequest('Invalid saved report');
	const session = { bearer_token: access_token, tenantId };
	const body = await bodyOf(req);
	try {
		if (!(await mayUseSavedReports(session))) return refused();
		const { data } = await sendWrite(write, session, id, body);
		const status = WRITE_STATUS[write];
		if (status === 204) {
			return new NextResponse(null, { status, headers: NO_STORE });
		}
		return NextResponse.json(data, { status, headers: NO_STORE });
	} catch (error) {
		return withNoStore(await gauzyErrorResponse(error, 'The saved report could not be changed.'));
	}
}

/** `GET /api/public/saved-reports/:token` (no session): a shared report read through its link. */
export async function proxyReadSharedReport(token: string): Promise<NextResponse> {
	if (!token || isWalkingSegment(token)) return invalidRequest('Invalid link');
	try {
		const { data } = await readSharedReportRequest(token);
		return NextResponse.json(data, { headers: NO_STORE });
	} catch (error) {
		return withNoStore(await gauzyErrorResponse(error, 'The shared report could not be read.'));
	}
}
