import { crc32 } from 'node:zlib';

import { expect, test, type MockControl, type Page } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit, type MockScenario, type StubRequest } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * Who is offered the workspace data export on Settings › Workspace (`/settings/workspace`), and what happens when that
 * person runs it: the success path, every failure path and the in-flight state. Pinned in a real Chrome on lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`, control `http://127.0.0.1:3994`, `playwright/test-servers.ts:37`)
 * on 2026-11-23. Every count, string, URL, file name and call list below was measured — in this file's own runs
 * (`E:\Coding\.tmp\s2-lane-a-export-1.log`, `-2.log`) and in the hand measurements that chose the assertions
 * (`E:\Coding\.tmp\s2-lane-a-export-probe-1.log` … `-6.log`) — and each test prints a `MEASURE` line with what its page
 * and the mock actually did, so any assertion here can be re-checked against a log.
 *
 * ## The code this file measures (each line read out of its file before it is named)
 *
 * - `core/lib/utils/workspace-data-export.ts`: `canExportWorkspaceData` (`:34-40`) is **role name `SUPER_ADMIN`**
 *   (`ERoleName.SUPER_ADMIN`, `:38`) **and** the permission `EXPORT_ADD` (`WORKSPACE_EXPORT_PERMISSION` `:8`, through
 *   `holdsWorkspaceExportPermission` `:26-28`); `workspaceExportFileName` (`:91-93`) is
 *   `<stem>-data-<local day>.zip`, the stem from `fileNameStemOf` (`:82-88`: unsafe characters dropped, words joined by
 *   dashes, 80 characters at most) and the day from `localDayOf` (`:47-52`, `YYYY-MM-DD` of the browser's own day);
 *   `isCompleteZipArchive` (`:103-123`) wants the local-file-header signature at byte 0 (`:19`) and an end-of-central-
 *   directory record (`:20`) that really ends the bytes (`:109-121`).
 * - `core/hooks/settings/use-workspace-data-export.ts`: a second click is dropped while one export runs (`:59-63`,
 *   `store.get(workspaceDataExportState) === 'exporting'`; the atom is `core/stores/settings/workspace-data-export.ts`);
 *   the archive is downloaded, its start and end are read without copying a big archive twice (`archiveEndsOf` `:28-39`),
 *   and only a whole archive is saved: `downloadBlob` (`core/lib/utils/dashboard-export.ts:39-47`, an `<a download>`
 *   click over a `blob:` URL) plus the success toast `settings.workspace.EXPORT_DONE` with the file name as its
 *   description (`:77-79`); anything else — a refused call or an archive without its end record (`:74-75`) — sets the
 *   state to `failed` (`:81-83`) and saves nothing.
 * - `core/services/client/api/export/workspace-export.service.ts:18-26`: `GET /export?organizationId=…` as a blob. On
 *   this lane the browser sends it to the mock itself: `constants.tsx:229-232` takes the API base from
 *   `NEXT_PUBLIC_GAUZY_API_SERVER_URL`, `test-servers.ts` sets that to the mock origin and
 *   `core/services/client/axios.ts:108-112` makes the base `<mock origin>/api`, so every call below is
 *   `http://127.0.0.1:3992/api/export?organizationId=…`, in the mock's own log.
 * - `core/components/settings/pages/workspace/workspace-settings-page.tsx:95-101`: the data section is rendered **only**
 *   when `dataExport.canExport`, and `:102-110` hands the danger section a `dataExport` only under the same condition —
 *   so the export inside the delete dialog follows the page's own gate, not the dialog's.
 * - `core/components/settings/pages/workspace/workspace-data-section.tsx`: the button `data-testid="workspace-export-all"`
 *   (`:33-43`), `settings.workspace.EXPORT_ACTION` normally and `settings.workspace.EXPORTING` while exporting, with
 *   `disabled` and `aria-busy` on it (`:37-38`, and the label swap at `:19-23`); the failure `Notice` renders only when
 *   `isFailed && !isExporting` (`:24`, `:46-57`) and carries `EXPORT_FAILED`, `EXPORT_FAILED_DESCRIPTION` and a Retry
 *   button (`notifications.RETRY`).
 * - `core/components/settings/pages/workspace/workspace-danger-section.tsx`: the danger section is rendered only when
 *   `deletion.canDelete` (`:242-244`), which `core/lib/utils/organization-deletion.ts:25-27` answers from `ALL_ORG_EDIT`
 *   (the row is `data-testid="workspace-delete-organization"`, `:249-255`); opening it mounts `DeleteOrganizationDialog`
 *   (`:257-265`, `useHasBeenOpen`), whose children start with `ExportFirst` (`:141-169`, the text
 *   `settings.workspace.deletion.EXPORT_FIRST` plus the same Export button, disabled/`aria-busy` while an export runs)
 *   and it is rendered **only** when the page handed a `dataExport` (`:222`).
 * - The lane's switch: `scenario.roleName` (`cypress/support/mock-gauzy-server.mjs:70-82`) sets the fixture role's name
 *   apart from `scenario.manager`, `scenario.extraPermissions` adds to the role's five base permissions
 *   (`mock-gauzy-server.mjs:51-63`, served at `GET /api/role-permissions/me`), and `scenario.fails` answers a path with
 *   an HTTP refusal (`mock-gauzy-server.mjs:1081-1095`). `mockReset()` clears all three, and `setScenario` merges
 *   (`mock-gauzy-server.mjs:1226-1227`) — which is why every case here resets before arming, inside a test as well as
 *   after one.
 *
 * ## What was measured, per case (the numbers the assertions below are pinned on)
 *
 * - **The offer** (`probe-2.log`, six combinations, each from a reset mock): `workspace-export-all` is **1** for
 *   `SUPER_ADMIN` **with** `EXPORT_ADD` and **0** for every other combination — `ADMIN` (the unset role name) with
 *   `EXPORT_ADD` 0, `EMPLOYEE` with `EXPORT_ADD` 0, and all three without it 0. The `Data` heading and the
 *   `Export all data` label appear exactly where the button does (1/1/1 against 0/0/0), and `/settings/workspace`
 *   rendered its own `General` heading and the workspace name `Fixture Workspace A` in all six, so an absent button is
 *   a gate, not a page still loading. No case ran an export on its own: the mock logged no `/api/export` call.
 * - **The mock's own answer** (`probe-1.log` P2): one browser call
 *   `GET http://127.0.0.1:3992/api/export?organizationId=22222222-2222-4222-8222-111111111111`; the mock logged it as
 *   `GET /api/export` `organizationId=<the fixture organization A>` **200**, because it has no export handler and an
 *   unmatched `GET` answers `pagination([])` = `{ items: [], total: 0 }` (`mock-gauzy-server.mjs:827`) — JSON, so
 *   `isCompleteZipArchive` says no and nothing is saved: **0 downloads**, no `Workspace data exported` toast, and on
 *   screen `The export did not finish` + `Nothing was saved. A large workspace takes a while: try again in a moment.` +
 *   one `Try again` button. The button read `Export` again, and its `consoleErrors` were empty in every measurement of
 *   this case (reported, not asserted — see the console-noise note below).
 * - **Success, with a real ZIP written by this spec** (`probe-4.log` P5, `probe-6.log` T1): one download event,
 *   `suggestedFilename()` **exactly `Fixture-Workspace-A-data-2026-11-23.zip`** from a `blob:http://localhost:3031/…`
 *   URL — `workspaceExportFileName('Fixture Workspace A', <today>)`: the stem `Fixture-Workspace-A` from `fileNameStemOf`
 *   and the local day `2026-11-23`; exactly one sonner toast (`[data-sonner-toast]` count 1) whose text is
 *   `Workspace data exported` then that file name; the button back to `Export`; `pageErrors` empty (`consoleErrors` were
 *   empty in `probe-4.log`/`probe-6.log` and in this file's own runs but not in every repeat — see the console-noise
 *   note, so they are reported here rather than asserted).
 *   The mock still logged the forwarded call once (`route.fetch()` first, `session-rejected.spec.ts:202-214`), answered
 *   200 by its JSON fallback — that answer is what the stub replaces, and the archive bytes are this file's own.
 * - **A cut archive** (`probe-4.log` P6): the same 165-byte archive without its 22-byte end record (143 bytes, no
 *   `PK\x05\x06` anywhere in it), 200 from the stub, **0 downloads**, no success toast, the same failure notice with its
 *   `Try again`, button `Export`.
 * - **Refused by the platform** (`probe-2.log` P7, `probe-6.log` T2): with `fails: { '/api/export': 403 }` the mock
 *   logged exactly `GET /api/export` **403**, with 500 exactly **500**; one call each, no `POST /api/auth/refresh-token`
 *   and no `POST /api/auth/switch-organization`, the person still on `/settings/workspace`, 0 downloads, no success
 *   toast, the failure notice with its Retry, and the app's own log naming the refusal
 *   (`[ERROR] [HttpClient] … HTTP 403 Forbidden - GET /export …`).
 * - **In flight** (`probe-4.log` P8): with the stub held by a promise, the button read `Exporting…`, was `disabled`, and
 *   carried `aria-busy="true"`; no failure notice and no Retry button while one ran (0 each); a forced click on the
 *   disabled button and a dispatched `click` on it produced **no second call** — sampled 5 times over 2 s, the mock's
 *   `/api/export` count stayed 1 and the browser's own export requests stayed 1. After the release: 1 call in total,
 *   1 download named as above, the button `Export` again, not disabled and with no `aria-busy`, no failure notice.
 * - **The delete-organization dialog** (`probe-5.log`): the danger section needs `ALL_ORG_EDIT` (it appeared for
 *   `SUPER_ADMIN + EXPORT_ADD + ALL_ORG_EDIT` and for `ADMIN + EXPORT_ADD + ALL_ORG_EDIT`, and in none of the six
 *   combinations above). Opened by `SUPER_ADMIN + EXPORT_ADD`: one dialog, `EXPORT_FIRST` text count **1**, one Export
 *   button inside the dialog. Opened by `SUPER_ADMIN` without `EXPORT_ADD`, and by `ADMIN` with it: **0** and **0** —
 *   the page's `canExport` gate decides the dialog's offer. In all three the title was `Delete Fixture Organization A?`,
 *   the dialog was closed with its `Cancel`, and the mock logged **no** `DELETE` call at all; no export ran either.
 *
 * ## Mock limits this file runs into (they are not app defects)
 *
 * - The mock has **no `/export` handler**, so an unstubbed export answers its `pagination([])` fallback with status 200.
 *   That is exactly the "the answer is not an archive" path, measured as the app really sees it; the success and cut
 *   cases need `page.route`, and their answers restate the mock's CORS headers (`session-rejected.spec.ts:132-144`)
 *   because the page is on `localhost:3031` and the API on `127.0.0.1:3992` — without them the browser discards the
 *   answer and the case turns into a connection error.
 * - The mock has no `GET /api/organization/<id>/counts` nor `GET /api/organization/count` handler either: the dialog
 *   gets `{ items: [], total: 0 }` 200 (`mock-gauzy-server.mjs:827`), which `organization.service.ts:68-70`/`:82-84`
 *   validate against their own schemas and reject. So the confirmation shows `What this organization holds could not be
 *   counted` with its `Try again`, its `Delete organization` stays disabled (`workspace-danger-section.tsx:216`), and
 *   nothing in this file can reach a delete even by accident — which suits case 7, where the delete is never confirmed.
 * - `scenario.fails` arms **every** call of the armed path until `mockReset()` (`mock-gauzy-server.mjs:1081-1095`), so
 *   the 403 and the 500 are two separate visits rather than two clicks on one page.
 * - Assumption, measured once and then relied on: the workspace name the file name is built from is what the identity
 *   row shows, `Fixture Workspace A` (`use-workspace-settings.ts:103-108` takes the tenant's name, and the lane's
 *   fixture names it so — control `GET /fixture` `names.workspaceA`). The expected file name below is pinned as
 *   `Fixture-Workspace-A-data-<local day>.zip` and every case asserts the page really shows that name first.
 *
 * ## Console noise: this file reports `consoleErrors`, it does not assert them empty
 *
 * - Measured, and this is why the note exists: an otherwise clean Settings › Workspace page printed
 *   `error: The result of getSnapshot should be cached to avoid an infinite loop` (React's `useSyncExternalStore`
 *   warning, nothing to do with an export) in some runs and not in others, on the same code. In the logs that still
 *   exist it is in 2 of the 3 success rounds of `s2-lane-a-export-probe-8.log` and in none of the loads of
 *   `s2-lane-a-export-probe-7.log`; it also appeared once during a case-1 load and once during a case-7 dialog in runs
 *   of earlier drafts of this file, whose logs the later runs overwrote. An earlier draft asserted
 *   `consoleErrors() === []` on the dialog case and went red on exactly that assertion, then green twice on the same
 *   code — which is why the assertion is gone and every case prints its own `consoleErrors` in its `MEASURE` line
 *   Its presence is not predictable from run to run: across this file's pinned runs and its probes it shows up in some
 *   and not in others, and always either on a page that clicked nothing or on a case whose every export fact was exactly
 *   as pinned. That is why it is reported rather than asserted. The warning itself is a finding for the owner, not
 *   something this file changes.
 * - What *is* pinned about the console is the opposite direction: case 5 asserts the app really logged the refusal it was
 *   answered (`logMatching`, measured every time), and `pageErrors` (uncaught exceptions) was empty in every measurement
 *   and is asserted on the success path.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const SETTINGS_WORKSPACE_PATH = '/settings/workspace';
const EXPORT_PATH = '/api/export';
const REFRESH_PATH = '/api/auth/refresh-token';
const SWITCH_PATH = '/api/auth/switch-organization';
const EXPORT_BUTTON_SELECTOR = '[data-testid="workspace-export-all"]';
const DELETE_BUTTON_SELECTOR = '[data-testid="workspace-delete-organization"]';

/** `locales/en.json`, the keys each string below was taken from (`settings.workspace`, around :5975-6010). */
const PAGE_TITLE = 'General'; // settings.entries.workspaceGeneral.TITLE
const WORKSPACE_NAME = 'Fixture Workspace A'; // the lane fixture's tenant name, shown by the identity row
const DATA_SECTION = 'Data'; // settings.workspace.DATA_SECTION
const EXPORT_LABEL = 'Export all data'; // settings.workspace.EXPORT_LABEL
const EXPORT_DESCRIPTION =
	'A ZIP of CSV files, one per table: every organization of the workspace, in the format the import reads back.'; // settings.workspace.EXPORT_DESCRIPTION
const EXPORT_ACTION = 'Export'; // settings.workspace.EXPORT_ACTION
const EXPORTING = 'Exporting…'; // settings.workspace.EXPORTING
const EXPORT_DONE = 'Workspace data exported'; // settings.workspace.EXPORT_DONE
const EXPORT_FAILED = 'The export did not finish'; // settings.workspace.EXPORT_FAILED
const EXPORT_FAILED_DESCRIPTION = 'Nothing was saved. A large workspace takes a while: try again in a moment.'; // settings.workspace.EXPORT_FAILED_DESCRIPTION
const RETRY = 'Try again'; // notifications.RETRY
const DANGER_SECTION = 'Danger zone'; // settings.workspace.deletion.DANGER_SECTION
const EXPORT_FIRST = "Keep a copy first: export the workspace's data before you delete this organization."; // settings.workspace.deletion.EXPORT_FIRST
const DELETE_ACTION = 'Delete organization'; // settings.workspace.deletion.DELETE_ACTION
const CANCEL = 'Cancel'; // common.CANCEL
const COUNTS_FAILED = 'What this organization holds could not be counted'; // settings.workspace.deletion.COUNTS_FAILED

/** The arms. `extraPermissions` adds to the fixture role's five (`mock-gauzy-server.mjs:51-63`). */
const NO_EXTRA: MockScenario = {};
const EXPORT_PERMISSION_ONLY: MockScenario = { extraPermissions: ['EXPORT_ADD'] };
const OWNER_WITHOUT_PERMISSION: MockScenario = { roleName: 'SUPER_ADMIN' };
const EMPLOYEE_WITHOUT_PERMISSION: MockScenario = { roleName: 'EMPLOYEE' };
const OWNER_AND_PERMISSION: MockScenario = { roleName: 'SUPER_ADMIN', extraPermissions: ['EXPORT_ADD'] };
const EMPLOYEE_AND_PERMISSION: MockScenario = { roleName: 'EMPLOYEE', extraPermissions: ['EXPORT_ADD'] };
const DANGER_WITH_EXPORT: MockScenario = {
	roleName: 'SUPER_ADMIN',
	extraPermissions: ['EXPORT_ADD', 'ALL_ORG_EDIT']
};
const DANGER_WITHOUT_EXPORT: MockScenario = { roleName: 'SUPER_ADMIN', extraPermissions: ['ALL_ORG_EDIT'] };
/** Holds `EXPORT_ADD` but is not the workspace owner: the half the app's own proxy route would let through. */
const DANGER_EXPORT_PERMISSION_NOT_OWNER: MockScenario = {
	extraPermissions: ['EXPORT_ADD', 'ALL_ORG_EDIT']
};

/** The mock's own CORS answer, restated for every answer this spec writes itself — see the header's mock limits. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

/** The archive this spec writes: one stored file, so its CRC32 is `node:zlib`'s and no dependency is added. */
const ARCHIVE_ENTRY_NAME = 'organizations.csv';
const ARCHIVE_ENTRY_TEXT = 'id,name\n1,Fixture Organization A\n';
/** The end of central directory record is 22 bytes (`workspace-data-export.ts:22`); cutting it off is the cut case. */
const END_RECORD_BYTES = 22;

/** A whole, minimal ZIP: local file header, the file, central directory, end record (`unzip -t` says OK). */
function oneStoredFileZip(): Buffer {
	const name = Buffer.from(ARCHIVE_ENTRY_NAME, 'utf8');
	const data = Buffer.from(ARCHIVE_ENTRY_TEXT, 'utf8');
	const checksum = crc32(data);

	const local = Buffer.alloc(30);
	local.writeUInt32LE(0x04034b50, 0);
	local.writeUInt16LE(20, 4); // version needed
	local.writeUInt16LE(0, 6); // flags
	local.writeUInt16LE(0, 8); // compression method: stored
	local.writeUInt16LE(0, 10); // modification time
	local.writeUInt16LE(0x5b21, 12); // modification date
	local.writeUInt32LE(checksum, 14);
	local.writeUInt32LE(data.length, 18);
	local.writeUInt32LE(data.length, 22);
	local.writeUInt16LE(name.length, 26);
	local.writeUInt16LE(0, 28);

	const central = Buffer.alloc(46);
	central.writeUInt32LE(0x02014b50, 0);
	central.writeUInt16LE(20, 4);
	central.writeUInt16LE(20, 6);
	central.writeUInt16LE(0, 8);
	central.writeUInt16LE(0, 10);
	central.writeUInt16LE(0, 12);
	central.writeUInt16LE(0x5b21, 14);
	central.writeUInt32LE(checksum, 16);
	central.writeUInt32LE(data.length, 20);
	central.writeUInt32LE(data.length, 24);
	central.writeUInt16LE(name.length, 28);
	central.writeUInt16LE(0, 30);
	central.writeUInt16LE(0, 32);
	central.writeUInt16LE(0, 34);
	central.writeUInt16LE(0, 36);
	central.writeUInt32LE(0, 38);
	central.writeUInt32LE(0, 42);

	const end = Buffer.alloc(END_RECORD_BYTES);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(0, 4);
	end.writeUInt16LE(0, 6);
	end.writeUInt16LE(1, 8);
	end.writeUInt16LE(1, 10);
	end.writeUInt32LE(central.length + name.length, 12);
	end.writeUInt32LE(local.length + name.length + data.length, 16);
	end.writeUInt16LE(0, 20);

	return Buffer.concat([local, name, data, central, name, end]);
}

/** The file name this page's export must save under: `workspaceExportFileName(<the name the page shows>, <today>)`. */
function expectedExportFileName(date: Date): string {
	// `fileNameStemOf` (`:82-88`) turns the spaces of `Fixture Workspace A` into dashes; `localDayOf` (`:47-52`) is the
	// browser's own YYYY-MM-DD, which is this process's own day on a lane that runs on the same machine.
	const stem = WORKSPACE_NAME.replace(/\s+/g, '-');
	const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	return `${stem}-data-${day}.zip`;
}

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a workspace-data-export] MEASURE ${label} ${JSON.stringify(value)}`);

const text = (page: Page, value: string) => page.getByText(value, { exact: true });
const exportButton = (page: Page) => page.locator(EXPORT_BUTTON_SELECTOR);
const deleteButton = (page: Page) => page.locator(DELETE_BUTTON_SELECTOR);
const dialog = (page: Page) => page.getByRole('dialog');
const retryButtons = (page: Page) => page.getByRole('button', { name: RETRY, exact: true });

/** Every `/api/export` URL the browser sent, in browser order, from the moment this is attached. */
function recordExportRequests(page: Page): string[] {
	const urls: string[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin === MOCK_API_ORIGIN && url.pathname === EXPORT_PATH) urls.push(request.url());
	});
	return urls;
}

/** Every download the page caused, by the name it was saved under and its URL. */
function recordDownloads(page: Page): Array<{ fileName: string; url: string }> {
	const downloads: Array<{ fileName: string; url: string }> = [];
	page.on('download', (download) => downloads.push({ fileName: download.suggestedFilename(), url: download.url() }));
	return downloads;
}

/**
 * The export call as the mock recorded it: `method path query status`. `query` is its own field of the mock's request
 * log (`mock-gauzy-server.mjs:1122-1131`), so the `organizationId` the page sent is readable without guessing.
 */
const exportCallShapes = async (calls: StubRequest[]) =>
	calls.map((call) => [call.method, call.path, call.query, call.status]);

/**
 * The mock's `/api/export` count, sampled `tries` times `intervalMs` apart: this is how "no second request was sent"
 * is measured, because a single read only proves the count at one instant.
 */
async function exportCallCountWhileWatching(
	page: Page,
	mock: MockControl,
	{ tries = 5, intervalMs = 400 }: { tries?: number; intervalMs?: number } = {}
): Promise<number[]> {
	const samples: number[] = [];
	for (let attempt = 0; attempt < tries; attempt += 1) {
		samples.push((await mock.calls(EXPORT_PATH)).length);
		await page.waitForTimeout(intervalMs);
	}
	return samples;
}

/**
 * Answers the browser's own export call with bytes this spec wrote, after asking the mock (so the mock's log still
 * holds the call the page made). `body` without the archive's end record is the cut case.
 */
async function stubExportAnswer(page: Page, body: Buffer): Promise<void> {
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === EXPORT_PATH,
		async (route) => {
			if (route.request().method() !== 'GET') return route.fallback();
			await route.fetch();
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/zip' },
				body
			});
		}
	);
}

test.describe('lane-a · the workspace data export: who is offered it and what running it does', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ------------------------------------------------- 1. who is offered it: role name × EXPORT_ADD

	test('1 · only a SUPER_ADMIN holding EXPORT_ADD is offered the export', async ({ page, fixture, mock, shield }) => {
		const matrix: Array<{ label: string; scenario: MockScenario; offered: number }> = [
			{ label: 'ADMIN without EXPORT_ADD', scenario: NO_EXTRA, offered: 0 },
			{ label: 'ADMIN with EXPORT_ADD', scenario: EXPORT_PERMISSION_ONLY, offered: 0 },
			{ label: 'SUPER_ADMIN without EXPORT_ADD', scenario: OWNER_WITHOUT_PERMISSION, offered: 0 },
			{ label: 'SUPER_ADMIN with EXPORT_ADD', scenario: OWNER_AND_PERMISSION, offered: 1 },
			{ label: 'EMPLOYEE without EXPORT_ADD', scenario: EMPLOYEE_WITHOUT_PERMISSION, offered: 0 },
			{ label: 'EMPLOYEE with EXPORT_ADD', scenario: EMPLOYEE_AND_PERMISSION, offered: 0 }
		];

		for (const combo of matrix) {
			// `setScenario` merges, so a combination is armed only on top of a cleared mock (`mock-gauzy-server.mjs:1226`).
			await mockReset();
			await signInAndVisit(page, fixture, SETTINGS_WORKSPACE_PATH, { scenario: combo.scenario });

			// The page rendered: without this, an absent button could be a page still loading.
			await expect(
				page.getByRole('heading', { level: 1, name: PAGE_TITLE }),
				`Settings › Workspace rendered no page title for ${combo.label}`
			).toBeVisible({ timeout: 25_000 });
			await expect(
				text(page, WORKSPACE_NAME).first(),
				`Settings › Workspace showed no workspace for ${combo.label}`
			).toBeVisible();

			await expect(exportButton(page), `${combo.label} was offered the export button`).toHaveCount(combo.offered);
			await expect(
				page.getByRole('heading', { level: 2, name: DATA_SECTION }),
				`${combo.label} got the Data section without its button, or a button without the section`
			).toHaveCount(combo.offered);
			await expect(text(page, EXPORT_LABEL), `${combo.label} got the export row without its label`).toHaveCount(
				combo.offered
			);
			await expect(
				text(page, EXPORT_DESCRIPTION),
				`${combo.label} got the export row without its description`
			).toHaveCount(combo.offered);
			expect(await mock.calls(EXPORT_PATH), `${combo.label} ran an export nobody asked for`).toEqual([]);

			report('1 offer matrix', {
				combo: combo.label,
				scenario: combo.scenario,
				url: new URL(page.url()).pathname,
				exportButtons: await exportButton(page).count(),
				dataSectionHeadings: await page.getByRole('heading', { level: 2, name: DATA_SECTION }).count(),
				dangerSectionHeadings: await page.getByRole('heading', { level: 2, name: DANGER_SECTION }).count(),
				roleReads: (await mock.calls('/api/role-permissions/me')).length,
				consoleErrors: shield.consoleErrors()
			});
		}
	});

	// ------------------------------------------------- 2. the mock's own answer: a 200 that is not an archive

	test('2 · an answer that is not an archive: the failure notice, and nothing saved', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const requests = recordExportRequests(page);
		const downloads = recordDownloads(page);

		await signInAndVisit(page, fixture, SETTINGS_WORKSPACE_PATH, { scenario: OWNER_AND_PERMISSION });
		await expect(
			exportButton(page),
			'the export was not offered to the workspace owner holding EXPORT_ADD'
		).toBeVisible({ timeout: 25_000 });
		await exportButton(page).click();

		await expect(text(page, EXPORT_FAILED), 'a non-archive answer showed no failure').toBeVisible({
			timeout: 25_000
		});
		await expect(
			text(page, EXPORT_FAILED_DESCRIPTION),
			'the failure says nothing about what to do next'
		).toBeVisible();
		await expect(retryButtons(page), 'the failure offers no new try').toHaveCount(1);
		await expect(exportButton(page), 'the button is still busy after the flow ended').toHaveText(EXPORT_ACTION);

		expect(
			requests,
			'the export the browser sent was not one GET of the mock /export with this organization'
		).toEqual([`${MOCK_API_ORIGIN}${EXPORT_PATH}?organizationId=${fixture.ids.organizationA}`]);
		expect(
			await exportCallShapes(await mock.calls(EXPORT_PATH)),
			'the mock did not log exactly the call the page sent'
		).toEqual([['GET', EXPORT_PATH, `organizationId=${fixture.ids.organizationA}`, 200]]);
		expect(downloads, 'an answer that is not an archive was saved as a file anyway').toEqual([]);
		expect(
			await text(page, EXPORT_DONE).count(),
			'the success toast appeared for an export that saved nothing'
		).toBe(0);
		// `shield.consoleErrors()` is reported here, not asserted: see the header's console-noise note.

		report('2 not an archive', {
			requests,
			mockExport: await exportCallShapes(await mock.calls(EXPORT_PATH)),
			downloads,
			failureTitleCount: await text(page, EXPORT_FAILED).count(),
			retryButtons: await retryButtons(page).count(),
			buttonLabel: await exportButton(page).innerText(),
			consoleErrors: shield.consoleErrors()
		});
	});

	// ------------------------------------------------- 3. success: a real archive this spec wrote

	test('3 · a whole archive: one download under the workspace-and-day name, and the success toast', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await stubExportAnswer(page, oneStoredFileZip());
		const requests = recordExportRequests(page);
		const downloads = recordDownloads(page);
		const fileName = expectedExportFileName(new Date());

		await signInAndVisit(page, fixture, SETTINGS_WORKSPACE_PATH, { scenario: OWNER_AND_PERMISSION });
		await expect(
			exportButton(page),
			'the export was not offered to the workspace owner holding EXPORT_ADD'
		).toBeVisible({ timeout: 25_000 });
		await expect(
			text(page, WORKSPACE_NAME).first(),
			'the page shows a workspace other than the one the file name is built from'
		).toBeVisible();
		await exportButton(page).click();

		await expect(text(page, EXPORT_DONE), 'a whole archive saved without saying so').toBeVisible({
			timeout: 25_000
		});
		await expect(text(page, fileName), 'the success toast does not name the file it saved').toBeVisible();
		await expect(page.locator('[data-sonner-toast]'), 'the export said something other than once').toHaveCount(1);
		await expect(exportButton(page), 'the button never came back from its exporting label').toHaveText(
			EXPORT_ACTION
		);

		expect(downloads, 'the archive was not downloaded exactly once').toHaveLength(1);
		expect(downloads[0].fileName, 'the download was saved under a name other than the workspace and the day').toBe(
			fileName
		);
		expect(
			await exportCallShapes(await mock.calls(EXPORT_PATH)),
			'the export the mock logged is not the one GET this page sent'
		).toEqual([['GET', EXPORT_PATH, `organizationId=${fixture.ids.organizationA}`, 200]]);
		expect(requests, 'the page asked for the archive more than once').toHaveLength(1);
		expect(await text(page, EXPORT_FAILED).count(), 'a whole archive was reported as a failure').toBe(0);
		// `shield.consoleErrors()` is reported here, not asserted: see the header's console-noise note.
		expect(shield.pageErrors(), 'the success path threw an uncaught error').toEqual([]);

		report('3 success with a real ZIP', {
			fileName,
			downloads,
			requests,
			mockExport: await exportCallShapes(await mock.calls(EXPORT_PATH)),
			toastTexts: await page.locator('[data-sonner-toast]').allInnerTexts(),
			buttonLabel: await exportButton(page).innerText(),
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
	});

	// ------------------------------------------------- 4. a cut archive

	test('4 · an archive cut on its way: the failure notice, and nothing saved', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const archive = oneStoredFileZip();
		const cut = archive.subarray(0, archive.length - END_RECORD_BYTES);
		await stubExportAnswer(page, cut);
		const requests = recordExportRequests(page);
		const downloads = recordDownloads(page);

		await signInAndVisit(page, fixture, SETTINGS_WORKSPACE_PATH, { scenario: OWNER_AND_PERMISSION });
		await expect(
			exportButton(page),
			'the export was not offered to the workspace owner holding EXPORT_ADD'
		).toBeVisible({ timeout: 25_000 });
		await exportButton(page).click();

		await expect(text(page, EXPORT_FAILED), 'a cut archive showed no failure').toBeVisible({ timeout: 25_000 });
		await expect(
			text(page, EXPORT_FAILED_DESCRIPTION),
			'the cut archive says nothing about what to do next'
		).toBeVisible();
		await expect(retryButtons(page), 'the cut archive offers no new try').toHaveCount(1);
		await expect(exportButton(page), 'the button is still busy after the cut answer').toHaveText(EXPORT_ACTION);

		expect(downloads, 'a cut archive was saved as a file anyway').toEqual([]);
		expect(
			await text(page, EXPORT_DONE).count(),
			'the success toast appeared for an archive that never arrived whole'
		).toBe(0);
		expect(
			await exportCallShapes(await mock.calls(EXPORT_PATH)),
			'the mock did not log exactly the call the page sent'
		).toEqual([['GET', EXPORT_PATH, `organizationId=${fixture.ids.organizationA}`, 200]]);
		expect(requests, 'the page retried the cut archive on its own').toHaveLength(1);

		report('4 cut archive', {
			archiveBytes: archive.length,
			cutBytes: cut.length,
			cutHoldsAnEndRecord: cut.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06])),
			downloads,
			requests,
			mockExport: await exportCallShapes(await mock.calls(EXPORT_PATH)),
			buttonLabel: await exportButton(page).innerText(),
			consoleErrors: shield.consoleErrors()
		});
	});

	// ------------------------------------------------- 5. refused by the platform: 403 and 500

	test('5 · a refused export: the failure notice, nothing saved, and no renewal of the session', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		for (const status of [403, 500]) {
			// `fails` arms every call of the path until the reset, so each status is its own visit.
			await mockReset();
			const requests = recordExportRequests(page);
			const downloads = recordDownloads(page);
			await signInAndVisit(page, fixture, SETTINGS_WORKSPACE_PATH, {
				scenario: { ...OWNER_AND_PERMISSION, fails: { [EXPORT_PATH]: status } }
			});
			await expect(exportButton(page), `the export was not offered before the ${status}`).toBeVisible({
				timeout: 25_000
			});
			await exportButton(page).click();

			await expect(text(page, EXPORT_FAILED), `the ${status} refusal showed no failure`).toBeVisible({
				timeout: 25_000
			});
			await expect(retryButtons(page), `the ${status} refusal offers no new try`).toHaveCount(1);
			await expect(exportButton(page), `the button is still busy after the ${status}`).toHaveText(EXPORT_ACTION);

			expect(downloads, `the ${status} refusal was saved as a file anyway`).toEqual([]);
			expect(await text(page, EXPORT_DONE).count(), `the ${status} refusal showed a success toast`).toBe(0);
			expect(
				await exportCallShapes(await mock.calls(EXPORT_PATH)),
				`the mock did not answer the export with exactly one ${status}`
			).toEqual([['GET', EXPORT_PATH, `organizationId=${fixture.ids.organizationA}`, status]]);
			expect(requests, `the page asked for the refused archive more than once`).toHaveLength(1);
			expect(await mock.calls(REFRESH_PATH), `the ${status} refusal renewed the session`).toEqual([]);
			expect(
				await mock.calls(SWITCH_PATH),
				`the ${status} refusal switched this tab to another organization`
			).toEqual([]);
			expect(new URL(page.url()).pathname, `the ${status} refusal threw the person off the settings page`).toBe(
				SETTINGS_WORKSPACE_PATH
			);
			expect(
				shield.logMatching(/GET \/export/).some((line) => line.includes(String(status))),
				`the app logged nothing about the ${status} it was answered`
			).toBe(true);

			report(`5 refused ${status}`, {
				requests,
				downloads,
				mockExport: await exportCallShapes(await mock.calls(EXPORT_PATH)),
				refreshCalls: (await mock.calls(REFRESH_PATH)).length,
				switchCalls: (await mock.calls(SWITCH_PATH)).length,
				url: page.url(),
				consoleErrors: shield.consoleErrors()
			});
		}
	});

	// ------------------------------------------------- 6. in flight

	test('6 · in flight: the button says Exporting…, is disabled and busy, and a second attempt sends nothing', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		let release: () => void = () => undefined;
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route(
			(url) => url.origin === MOCK_API_ORIGIN && url.pathname === EXPORT_PATH,
			async (route) => {
				if (route.request().method() !== 'GET') return route.fallback();
				await route.fetch();
				await held;
				return route.fulfill({
					status: 200,
					headers: { ...CORS_HEADERS, 'content-type': 'application/zip' },
					body: oneStoredFileZip()
				});
			}
		);
		const requests = recordExportRequests(page);
		const downloads = recordDownloads(page);

		await signInAndVisit(page, fixture, SETTINGS_WORKSPACE_PATH, { scenario: OWNER_AND_PERMISSION });
		await expect(
			exportButton(page),
			'the export was not offered to the workspace owner holding EXPORT_ADD'
		).toBeVisible({ timeout: 25_000 });
		await exportButton(page).click();

		await expect(exportButton(page), 'a running export does not say it is running').toHaveText(EXPORTING, {
			timeout: 10_000
		});
		expect(await exportButton(page).isDisabled(), 'the button stays clickable while one export runs').toBe(true);
		expect(await exportButton(page).getAttribute('aria-busy'), 'the running button is not marked busy').toBe(
			'true'
		);
		expect(
			await text(page, EXPORT_FAILED).count(),
			'a failure notice appeared while the export was still running'
		).toBe(0);
		expect(await retryButtons(page).count(), 'a Retry button appeared while the export was still running').toBe(0);
		const whileRunning = {
			label: (await exportButton(page).innerText()).replace(/\s+/g, ' '),
			disabled: await exportButton(page).isDisabled(),
			ariaBusy: await exportButton(page).getAttribute('aria-busy'),
			browserRequests: requests.length,
			mockCalls: (await mock.calls(EXPORT_PATH)).length
		};
		report('6 while in flight', whileRunning);

		// Two ways a person can try again on a running export: a click forced onto the disabled button, and a click
		// dispatched straight at it. Neither may reach the platform (`use-workspace-data-export.ts:59-63`).
		await exportButton(page)
			.click({ force: true, timeout: 3_000 })
			.catch(() => undefined);
		await exportButton(page).dispatchEvent('click');

		const samples = await exportCallCountWhileWatching(page, mock);
		expect(samples, 'a second attempt reached the platform while the first export was still running').toEqual(
			samples.map(() => 1)
		);
		expect(requests, 'a second attempt sent a second browser request while one export ran').toHaveLength(1);
		await expect(
			exportButton(page),
			'the button stopped saying Exporting… while the export was still held'
		).toHaveText(EXPORTING);

		release();
		const fileName = expectedExportFileName(new Date());
		await expect(text(page, EXPORT_DONE), 'the held export never ended in a success').toBeVisible({
			timeout: 25_000
		});
		await expect(exportButton(page), 'the button never came back to Export once the export finished').toHaveText(
			EXPORT_ACTION
		);

		expect(requests, 'the export that ran from the held stub was not exactly one call').toHaveLength(1);
		expect(
			await exportCallShapes(await mock.calls(EXPORT_PATH)),
			'the mock did not log exactly one export for a run that was held, not retried'
		).toEqual([['GET', EXPORT_PATH, `organizationId=${fixture.ids.organizationA}`, 200]]);
		expect(
			downloads.map((download) => download.fileName),
			'the released export did not save exactly one archive under the workspace-and-day name'
		).toEqual([fileName]);
		expect(
			await exportButton(page).getAttribute('aria-busy'),
			'the finished button is still marked busy'
		).toBeNull();
		expect(await exportButton(page).isDisabled(), 'the finished button is still disabled').toBe(false);
		expect(await text(page, EXPORT_FAILED).count(), 'a completed export left a failure notice').toBe(0);

		report('6 after release', {
			browserRequests: requests,
			mockCalls: await exportCallShapes(await mock.calls(EXPORT_PATH)),
			downloads,
			callCountSamplesWhileRunning: samples,
			buttonLabel: await exportButton(page).innerText(),
			ariaBusy: await exportButton(page).getAttribute('aria-busy'),
			consoleErrors: shield.consoleErrors()
		});
	});

	// ------------------------------------------------- 7. the delete-organization dialog

	test('7 · the delete dialog offers the export only to the person the page offers it to, and nothing is deleted', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const cases: Array<{ label: string; scenario: MockScenario; offered: number }> = [
			{ label: 'SUPER_ADMIN + EXPORT_ADD', scenario: DANGER_WITH_EXPORT, offered: 1 },
			{ label: 'SUPER_ADMIN without EXPORT_ADD', scenario: DANGER_WITHOUT_EXPORT, offered: 0 },
			{ label: 'ADMIN + EXPORT_ADD', scenario: DANGER_EXPORT_PERMISSION_NOT_OWNER, offered: 0 }
		];

		for (const combo of cases) {
			await mockReset();
			await signInAndVisit(page, fixture, SETTINGS_WORKSPACE_PATH, { scenario: combo.scenario });
			await expect(
				page.getByRole('heading', { level: 2, name: DANGER_SECTION }),
				`no danger zone for ${combo.label}, although ALL_ORG_EDIT was armed`
			).toBeVisible({ timeout: 25_000 });
			await expect(
				exportButton(page),
				`${combo.label}: the page's own data section does not follow canExport`
			).toHaveCount(combo.offered);

			await deleteButton(page).click();
			// The footer is rendered with the dialog, so it is the point that proves the dialog really mounted.
			await expect(
				dialog(page).getByRole('button', { name: CANCEL, exact: true }),
				`${combo.label}: the delete confirmation never opened`
			).toBeVisible({ timeout: 15_000 });
			await expect(
				dialog(page).getByRole('heading').first(),
				`${combo.label}: the confirmation names no organization`
			).toHaveText('Delete Fixture Organization A?'); // settings.workspace.deletion.DELETE_TITLE
			await expect(
				dialog(page).getByText(EXPORT_FIRST, { exact: true }),
				`${combo.label}: the confirmation ${combo.offered ? 'hid the export it should offer' : 'offered an export this person may not run'}`
			).toHaveCount(combo.offered);
			await expect(
				dialog(page).getByRole('button', { name: EXPORT_ACTION, exact: true }),
				`${combo.label}: the confirmation's export button does not match the page's offer`
			).toHaveCount(combo.offered);
			// The counts the mock cannot answer keep the delete off on this lane (see the header's mock limits), and this
			// file only opens the confirmation and closes it: the delete button is never clicked.
			await expect(
				dialog(page).getByRole('button', { name: DELETE_ACTION, exact: true }),
				`${combo.label}: the confirmation's delete button is gone`
			).toBeVisible();
			const whileOpen = {
				exportFirstTexts: await dialog(page).getByText(EXPORT_FIRST, { exact: true }).count(),
				dialogExportButtons: await dialog(page)
					.getByRole('button', { name: EXPORT_ACTION, exact: true })
					.count(),
				dialogButtons: (await dialog(page).getByRole('button').allInnerTexts()).map((label) =>
					label.replace(/\s+/g, ' ')
				),
				countsFailedNotice: await text(page, COUNTS_FAILED).count(),
				exportCalls: (await mock.calls(EXPORT_PATH)).length
			};
			report(`7 dialog ${combo.label} open`, { scenario: combo.scenario, ...whileOpen });

			await dialog(page).getByRole('button', { name: CANCEL, exact: true }).click();
			await expect(dialog(page), `${combo.label}: Cancel left the confirmation open`).toHaveCount(0);

			expect(
				(await mock.requests()).filter((call) => call.method === 'DELETE'),
				`${combo.label}: something was deleted while only opening and closing the confirmation`
			).toEqual([]);
			expect(
				await mock.calls(EXPORT_PATH),
				`${combo.label}: opening the confirmation ran an export nobody clicked`
			).toEqual([]);
			// `shield.consoleErrors()` is reported here, not asserted: see the header's console-noise note.

			report(`7 dialog ${combo.label} closed`, {
				dialogCount: await dialog(page).count(),
				deletes: (await mock.requests()).filter((call) => call.method === 'DELETE').length,
				consoleErrors: shield.consoleErrors(),
				pageErrors: shield.pageErrors()
			});
		}
	});
});
