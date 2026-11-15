/**
 * Proxy mode twin of Gauzy's `GET /export`, the ZIP of every table of the session's workspace. It first reads the
 * session's own role permissions and refuses here, before Gauzy builds anything, a role without EXPORT_ADD.
 */
import { gauzyUrl, restoreFetch, signedInRequest } from '@/test/api/forward-to-gauzy';
import { GET as exportWorkspaceData } from './route';

const ORIGIN = 'https://app.ever.team';

/** Gauzy's owner role holds the export; its default member role does not. */
const OWNER = ['EXPORT_ADD', 'ALL_ORG_EDIT', 'ALL_ORG_VIEW'];
const MEMBER = ['TIME_TRACKER', 'ORG_CONTACT_VIEW', 'ALL_ORG_VIEW'];

function permissionRows(permissions: string[]) {
	return permissions.map((permission) => ({ permission, enabled: true }));
}

function jsonAnswer(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function gauzyAnswersInOrder(...answers: Response[]) {
	const fetchMock = jest.fn();
	for (const answer of answers) {
		fetchMock.mockResolvedValueOnce(answer);
	}
	global.fetch = fetchMock;
	return fetchMock;
}

function zipAnswer(body: BodyInit) {
	return new Response(body, {
		status: 200,
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': 'attachment; filename="3f2a_export.zip"'
		}
	});
}

afterEach(restoreFetch);

describe('GET /api/export', () => {
	it("hands the workspace's archive on to a role that holds the export, with its query", async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(OWNER)), zipAnswer('PK\u0003\u0004archive'));
		const request = signedInRequest(`${ORIGIN}/api/export?organizationId=org-1`);

		const response = await exportWorkspaceData(request);

		const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
		expect(url).toBe(gauzyUrl('/export?organizationId=org-1'));
		expect(init.method).toBe('GET');
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/zip');
		expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="3f2a_export.zip"');
		await expect(response.text()).resolves.toBe('PK\u0003\u0004archive');
	});

	it('refuses a role without the export, before Gauzy builds anything', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(MEMBER)));
		const request = signedInRequest(`${ORIGIN}/api/export?organizationId=org-1`);

		const response = await exportWorkspaceData(request);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('passes the archive on as a stream, without reading it whole first', async () => {
		let pulled = 0;
		const archive = new ReadableStream<Uint8Array>({
			pull(controller) {
				pulled += 1;
				controller.enqueue(new Uint8Array([0x50, 0x4b]));
				if (pulled === 3) {
					controller.close();
				}
			}
		});
		gauzyAnswersInOrder(jsonAnswer(permissionRows(OWNER)), zipAnswer(archive));

		const response = await exportWorkspaceData(signedInRequest(`${ORIGIN}/api/export`));

		expect(pulled).toBeLessThan(3);
		const bytes = new Uint8Array(await response.arrayBuffer());
		expect(bytes).toHaveLength(6);
	});

	it("passes Gauzy's own refusal on", async () => {
		gauzyAnswersInOrder(
			jsonAnswer(permissionRows(OWNER)),
			jsonAnswer({ statusCode: 403, message: 'Forbidden' }, 403)
		);

		const response = await exportWorkspaceData(signedInRequest(`${ORIGIN}/api/export`));

		expect(response.status).toBe(403);
	});
});
