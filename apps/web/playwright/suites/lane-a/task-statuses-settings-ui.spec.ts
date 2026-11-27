import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Route } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, hardVisit, signInAndVisit, type BootstrapFixture, type MockScenario } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * Settings › Team › Statuses (`/settings/team/statuses`): the four groups a team's task statuses are filed under, the
 * status type the editor offers, the one reorder request this page is the only task-settings page to send, the tasks a
 * delete moves first, the built-in rows that cannot be moved or deleted, and the person who may not write.
 * `suites/lane-b/task-property-settings-ui.spec.ts` already pins the shared list for priorities, sizes, versions and
 * issue types (its finding 3: reorder exists on this page only) — this file covers the status-only half, and it does
 * not repeat `suites/mock/team-settings.spec.ts:54-76` (the icon library).
 *
 * Lane: **lane-a** (app `http://localhost:3031`, mock `127.0.0.1:3992`, control `3994`, `playwright/test-servers.ts`).
 * Measurements: `D:\Coding\.tmp\s3-lane-a-statuses-probe1.log` (P1 the list and its reads and menus, P2 the editor,
 * P3 the menu move and its body, P4 the two drag routes, P5 the type picker, P6 a refused create, P7 `manager: false`),
 * `-probe2.log` (C1 the groups and chips, C2/C3 the create bodies, C4/C5 the type change under both served answers,
 * C6 an unchanged save and Cancel, C7/C8 the delete order, C9/C10 the refusals, C11 a refused read),
 * `-probe3.log` (R1 a refused reorder in one session with every toast, R2 a cross-group drag and the disabled moves,
 * R3 the row a create in `other` lands on, R4 the delete dialog while the tasks are still on their way),
 * `-probe4.log` (Y1 a cross-group drag alone, Y2 a raw pointer drag alone, Y3 a cross-group raw pointer drag).
 * Acceptance runs: `D:\Coding\.tmp\s3-lane-a-statuses-1.log` and `-2.log`.
 *
 * ## Components this file drives (file:line, each opened before it is named)
 *
 * `app/[locale]/(main)/settings/team/statuses/page.tsx` → `core/components/settings/pages/task-properties/statuses-settings-page.tsx:79-85`
 * (`StatusesSettingsPage` → `TeamSettingsGate` (`core/components/settings/kit/team-settings-gate.tsx:39-56`,
 * `requiresManager` left at its default `false`) → `StatusesSettingsContent:43-77` → `SettingsPage`
 * (`core/components/settings/kit/settings-page.tsx:32-51`, the `h1` title) → `PropertyList kind="status"`
 * (`core/components/settings/pages/task-properties/property-list.tsx:261-625`, groups `:98-108` `:593-610`,
 * `GroupHeader:231-259`, `AddRow:160-190`, rows `:490-522`, the read-failure `Notice:570-584`, the live region `:619-621`) →
 * `PropertyRow` + its `RowMenu` (`property-row.tsx:57-141`, `:143-193`), `PropertyEditorRow`
 * (`property-editor-row.tsx:53-231`) with `StatusTypePicker` (`status-type-picker.tsx:25-73`),
 * `PropertyColorField` (`property-color-field.tsx:53-135`) and `PropertyPreview` (`property-preview.tsx:34-63`), the
 * statuses' own delete dialog (`statuses-settings-page.tsx:15-37` over `property-delete-dialog.tsx:53-112` and
 * `core/components/settings/kit/danger.tsx:76-199`), the drag pair (`property-dnd.ts:68-113`,
 * `@atlaskit/pragmatic-drag-and-drop`), and `TaskPropertyIcon` (`core/components/tasks/task-property-icon.tsx:403-465`).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's mock and shell. **Served by this file:** the whole read (`GET /api/task-metadata/bootstrap`,
 * its `taskStatuses` section is this file's store) and every write — `POST /api/task-statuses`,
 * `PUT /api/task-statuses/<id>`, `PATCH /api/task-statuses/reorder`, `DELETE /api/task-statuses/<id>` — plus the team's
 * tasks (`GET /api/tasks/team`, `GET /api/tasks/<id>`) and the `PUT /api/tasks/<id>` a status delete sends first,
 * because the delete counts the tasks **loaded in the browser** (`core/hooks/settings/use-status-deletion.ts:15-31`
 * reads `tasksByTeamState`) and the lane's mock holds exactly one task (`cypress/support/mock-gauzy-server.mjs:677-678`).
 * Every answer restates the mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204), because the page
 * sits on `localhost:3031` and the API on `127.0.0.1:3992`; `route.fetch()` is never called, so the mock's own log
 * proves the page acted on this file. Answers are store-backed: a create, an edit, a reorder or a delete changes what
 * the next read answers, and a refusal changes nothing.
 *
 * **The read is the bootstrap bundle, never `GET /api/task-statuses`.** `useStatusSettings`
 * (`core/hooks/settings/use-status-settings.ts:46-108`) feeds its list from `useTaskStatusesQuery`, which takes
 * `taskMetadataQuery.data?.taskStatuses` while `useBootstrap` is true — `useBootstrap = !publicTeam`
 * (`core/hooks/tasks/use-task-metadata-bootstrap-query.ts:35`) — and keeps the per-team `GET /task-statuses` query
 * disabled in exactly that case (`core/hooks/tasks/use-task-statuses-query.ts:41-51`). Measured on this lane
 * (`-probe1.log` P1): the statuses read was `GET …/api/task-metadata/bootstrap?organizationId=…&organizationTeamId=…
 * &projectId=…&include=issueTypes,relatedIssueTypes,taskLabels,taskPriorities,taskSizes,taskStatuses,taskVersions` and
 * no `GET …/api/task-statuses` happened at all. The client validates that section with the `.strict()`
 * `taskStatusSchema` (`task-metadata-bootstrap.service.ts:62-68`, `core/types/schemas/task/task-status.schema.ts:16-40`),
 * so a served row carries only the keys the schema knows.
 *
 * ## Findings (measured; each names the log it came from)
 *
 * 1. The list is filed in four fixed groups — `To do`, `In progress`, `Done`, `Other` — by the stored
 *    `isTodo`/`isInProgress`/`isDone` (`statusItemsOf`, `settings-task-properties.ts:101-112`), sorted by `order` with
 *    an unordered row last (`UNORDERED`), and a group left without rows is not rendered at all
 *    (`displayGroupsOf`, `property-list.tsx:98-108`). Each header's chip is the plural `GROUP_COUNT` line
 *    (`property-list.tsx:243-245`). `-probe1.log` P1, `-probe2.log` C1/C4.
 * 2. A row prints its stored name through CSS `capitalize` (`property-row.tsx:27` `:177`), so `sprint-queue` reads as
 *    `sprint queue`; its glyph carries the stored colour as `color: oklch(from rgb(…) 0.62 min(3 * c, 0.16) h)`
 *    (`task-property-icon.tsx:118-122`), and with no colour the glyph is muted and has no `style` at all. A stored
 *    library icon path renders as the app's own glyph — 0 `<img>` in the row (`-probe2.log` C1).
 * 3. Strict Mode mounts the page twice, so the bootstrap read happens twice, and the shell reads the team's tasks
 *    (`GET /api/tasks/team?…take=50&skip=1&order[createdAt]=DESC&order[id]=DESC`, `task.service.ts:143-151`) and the
 *    active task by id beside it (`-probe1.log` P1).
 * 4. A built-in status (`isSystem`) offers nothing but Edit: no drag handle and no `draggable` on its row
 *    (`property-row.tsx:150` `:163-175`), no `Move up`/`Move down` and no `Delete` item — instead the two labels
 *    `BUILT_IN_MOVE` and `BUILT_IN_DELETE` (`property-row.tsx:109-131`, `settings-task-properties.ts:529-544`).
 *    `-probe1.log` P1, `-probe3.log` R2.
 * 5. A move the list cannot save is listed **disabled** rather than left out: `canMoveUp`/`canMoveDown` come from the
 *    row's place in its group (`property-list.tsx:499-502`), so the only row of a group shows both items with
 *    `aria-disabled="true"` (`-probe1.log` P1, `-probe3.log` R2). A move that would push a built-in row is refused
 *    before it is offered, by `statusOrderOf`'s built-in guard (`settings-task-properties.ts:499-505`); this file's
 *    served list puts no row in that position, so that branch is not measured here (see "not covered" below).
 * 6. One `PATCH /api/task-statuses/reorder` per saved move, from the menu or from the handle, and its body holds
 *    **only the team's own statuses**, renumbered over the whole list: built-in ids are left out even where their
 *    number did not change, and rows of other groups are renumbered too (`statusOrderOf`,
 *    `settings-task-properties.ts:480-517`). A reload reads the stored orders back (`-probe1.log` P3/P4, `-probe4.log` Y2).
 * 7. Both drag routes work here, and a drop through a row's middle takes that row's **top** edge (`attachClosestEdge`
 *    with `allowedEdges: ['top','bottom']`, `property-dnd.ts:96-97`): Playwright's own `locator.dragTo` and the brief's
 *    `page.mouse` down + stepped moves + up each send the same single reorder (`-probe4.log` Y2). A drop into another
 *    group sends nothing and moves nothing by either route — `canDrop` (`property-dnd.ts:89-94`) and `dropRow`'s guard
 *    (`property-list.tsx:383-385`) — so **a cross-group move is not reachable on this page** (`-probe3.log` R2,
 *    `-probe4.log` Y1/Y3).
 * 8. Create: the editor's type is the group's own template (`templateOfGroup`, `settings-task-properties.ts:242-252`)
 *    and the POST carries `name`, its slug `value`, `color`, the icon that type carries (`iconPathOfTemplate`
 *    `:317-323`), `template`, and the three scope ids; the `other` group's editor has no type, so the request carries
 *    neither `template` nor `icon`. A new row has no `order` and lands last in its group (`-probe2.log` C2/C3,
 *    `-probe3.log` R3).
 * 9. The editor sends only what changed (`statusEditBodyOf` `settings-task-properties.ts:411-417`, `isDraftChanged`
 *    `use-status-settings.ts:75-79`): an unchanged save sends nothing, and so does Cancel (`-probe2.log` C6). A rename
 *    the server refuses leaves the editor open with what was typed and announces nothing
 *    (`property-editor-row.tsx:123-134`, `-probe2.log` C10).
 * 10. **Type change (measured, untagged).** The `PUT` carries `template`, but where the row ends up follows the
 *     flags the read answers with, not the request: the client's own comment at `settings-task-properties.ts:174`
 *     reads "Gauzy reads `template` on creation only, to file the status under a workflow category; an update ignores
 *     it." Both served answers are pinned with byte-identical requests: re-filing moves the row and the emptied `Other`
 *     group is not rendered; keeping the stored flags leaves the row where it was while the page still announces
 *     `ANNOUNCE_SAVED` (`-probe2.log` C4/C5). Untagged: the comment describes what Gauzy does with the field, it does
 *     not say the editor should not offer it, and which of the two answers the real API gives is not measurable here.
 * 11. **Delete with tasks (measured, untagged; worth a product look).** `remove` sends one `PUT /api/tasks/<id>` per
 *     loaded task whose status name matches (`isSameStatusName` `settings-task-properties.ts:546-549`), awaits them
 *     all, and only then the `DELETE` (`use-status-deletion.ts:26-31`). Each body is the whole loaded task with only
 *     `status` replaced — and its `taskStatusId` still names the status being deleted (`-probe2.log` C7). The code
 *     states the intent ("move to Open", `use-status-deletion.ts:13`), but whether Gauzy files the task by `status` or
 *     by `taskStatusId` is the API's to say, so the body alone does not prove the move fails.
 * 12. Delete copy: `delete.CHOICES_GONE` then the plural `delete.STATUS_TASKS` (`statuses-settings-page.tsx:19-25`);
 *     while the team's tasks are still loading it is `delete.STATUS_COUNTING` and the confirm button is disabled
 *     (`isReady={!isCounting}` `:32`, `isCounting: isFirstLoad` `use-status-deletion.ts:33`) — `-probe3.log` R4. A
 *     status no loaded task uses needs only the `DELETE` (`-probe2.log` C8).
 * 13. **Refused reorder (400) — [MEASURED, NOT INTENDED].** The optimistic orders are put back in the same session
 *     (`use-status-settings.ts:95-103`), the toast is `toasts.tasks.STATUS_ORDER_FAILED` with `toasts.REASONS.INVALID`
 *     (`use-reorder-task-status.ts:32-35`), and a reload shows the old order — yet the live region still claims the
 *     move — "{name} moved to position {position}." (`settings.taskProperties.ANNOUNCE_MOVED`, `locales/en.json:5296`),
 *     the product's own copy stating a move the page did not make — because `move` swallows the refusal
 *     (`use-status-settings.ts:101-103`) and `property-list.tsx:333-334` announces after `await onMove(orderedIds)`
 *     resolved anyway (`-probe3.log` R1). No unit test covers a refused reorder (`use-status-settings.test.ts`).
 * 14. **Refused delete (500) (measured, untagged).** The dialog stays open carrying `toasts.REASONS.SERVER` and
 *     the row stays listed, while the task moves already sent are not put back (`use-status-deletion.ts:27-29`): those
 *     tasks sit on Open under a status that is still on the list (`-probe2.log` C10). Untagged: nothing in the code,
 *     its tests or its copy says the moves should be undone.
 * 15. Refused read (500): the `ERROR_TITLE`/`ERROR_DESCRIPTION` notice with a `pages.unauthorized.TRY_AGAIN` button
 *     stands in for the whole list, 0 rows (`property-list.tsx:564-584`) (`-probe2.log` C11).
 * 16. **A person who may not write (measured, untagged).** With `scenario {manager:false}` the fixture role has
 *     no `ORG_TASK_SETTING` (`core/hooks/tasks/use-task-settings-access.ts:14`): the hint paragraph sits above the list
 *     (`property-list.tsx:617`), every group Add row is `disabled`, no row carries a drag handle or `draggable`, and all
 *     four menu items are listed `aria-disabled="true"` under the hint's own label (`property-row.tsx:93-98`). The
 *     header's Add button carries no `disabled` (`statuses-settings-page.tsx:59-62`) and still opens the create form
 *     for them (`-probe1.log` P7). Untagged: the editor's save handles exactly that case on purpose — a create from a
 *     person who may not write closes the editor and sends nothing (`property-list.tsx:427-429`).
 * 17. Console discipline: an armed refusal excuses only the client's own HTTP error line that names that verb, that
 *     path **and** that status (`logger-adapter.service.ts:186-199`); the dev `Mutation failed:` line
 *     (`mutation-error-toaster.tsx:47-48`) is excused only in the three tests that arm a write refusal, React's
 *     `getSnapshot` store warning is filtered everywhere, and the dev-only
 *     `DEV … Copy details` toast (`pages.about.COPY_DETAILS`) is asserted apart from the app's own toasts.
 *
 * ## What this file does not cover
 *
 * - A cross-group move: not reachable in the code (`property-dnd.ts:89-94`, `property-list.tsx:383-385`), measured as
 *   a no-op by both drag routes (`-probe3.log` R2, `-probe4.log` Y1/Y3).
 * - The built-in-order collision `statusOrderOf` refuses (`settings-task-properties.ts:499-505`): it shows up as a
 *   disabled menu item rather than a request, and this file's served list puts no row in that position.
 * - `Make default` / `ANNOUNCE_DEFAULT`: `statuses-settings-page.tsx:65-74` passes no `onMakeDefault`, so the item is
 *   never offered (asserted once, inside the row menu).
 * - The icon library and icon upload: `suites/mock/team-settings.spec.ts:54-76` owns them; `use-property-icon-upload`
 *   and `use-can-upload-property-icon` are not driven here.
 * - A name the list already holds (`NAME_TAKEN` on the field, `property-editor-row.tsx:118-121`), the custom-colour
 *   entry of the colour field, and Next's own `app/api/**` proxies — this page addresses the API origin directly.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const STATUSES_PATH = '/settings/team/statuses';
const BOOTSTRAP_ROUTE = '/api/task-metadata/bootstrap';
const TASKS_ROUTE = '/api/tasks';
const TEAM_TASKS_ROUTE = '/api/tasks/team';
const STATUSES_ROUTE = '/api/task-statuses';
const REORDER_ROUTE = '/api/task-statuses/reorder';

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated on every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/** `locales/en.json`, read by key: nothing below types an English sentence. */
const LOCALE = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: Record<string, string>;
	pages: {
		about: { COPY_DETAILS: string };
		settingsTeam: { TASK_SETTINGS_READ_ONLY: string };
		unauthorized: { TRY_AGAIN: string };
	};
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string>; tasks: { STATUS_ORDER_FAILED: string } };
	settings: {
		entries: { statuses: { TITLE: string; DESCRIPTION: string } };
		taskProperties: Record<string, string> & {
			delete: Record<string, string>;
			groups: Record<string, string>;
			statusTypes: Record<string, string>;
		};
	};
};
const PROPERTIES = LOCALE.settings.taskProperties;
const GROUPS = PROPERTIES.groups;
const STATUS_TYPES = PROPERTIES.statusTypes;
const PAGE = LOCALE.settings.entries.statuses;

/** The `{kind, select, …}` branch of a shared key (`selectBranch` of `suites/lane-b/task-property-settings-ui.spec.ts:227-263`). */
function selectBranch(template: string, value: string): string {
	const marker = 'select,';
	const start = template.indexOf(marker);
	if (start < 0) {
		throw new Error(`not a select template: ${template}`);
	}
	let index = start + marker.length;
	let fallback = '';
	while (index < template.length) {
		const keyMatch = /^\s*(\w+)\s*\{/.exec(template.slice(index));
		if (!keyMatch) {
			break;
		}
		const open = index + keyMatch[0].length;
		let depth = 1;
		let cursor = open;
		while (cursor < template.length && depth > 0) {
			const char = template[cursor];
			if (char === '{') depth += 1;
			if (char === '}') depth -= 1;
			cursor += 1;
		}
		const branch = template.slice(open, cursor - 1).trim();
		if (keyMatch[1] === value) {
			return branch;
		}
		if (keyMatch[1] === 'other') {
			fallback = branch;
		}
		index = cursor;
	}
	if (!fallback) {
		throw new Error(`no branch for "${value}" in ${template}`);
	}
	return fallback;
}

/** `{count, plural, =0 {…} one {# …} other {# …}}`: the branch next-intl would pick for `count`, with `#` filled. */
function pluralBranch(template: string, count: number): string {
	const branchOf = (key: string): string | undefined => {
		// `=0 {`, `one {`, `other {`: the key always follows a space or the opening brace, and `=0` needs no word
		// boundary to be found.
		const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const match = new RegExp(`(?:^|[^A-Za-z0-9_])${escaped}\\s*\\{`).exec(template);
		if (!match) {
			return undefined;
		}
		let cursor = match.index + match[0].length;
		let depth = 1;
		const start = cursor;
		while (cursor < template.length && depth > 0) {
			const char = template[cursor];
			if (char === '{') depth += 1;
			if (char === '}') depth -= 1;
			cursor += 1;
		}
		return template.slice(start, cursor - 1);
	};
	const exact = branchOf(`=${count}`);
	const branch =
		exact ?? (count === 1 ? (branchOf('one') ?? branchOf('other')) : (branchOf('other') ?? branchOf('one')));
	if (branch === undefined) {
		throw new Error(`no plural branch in ${template}`);
	}
	return branch.replace(/#/g, String(count));
}

const copyOf = {
	add: selectBranch(PROPERTIES.ADD!, 'status'),
	namePlaceholder: selectBranch(PROPERTIES.NAME_PLACEHOLDER!, 'status'),
	emptyTitle: selectBranch(PROPERTIES.EMPTY_TITLE!, 'status'),
	errorTitle: selectBranch(PROPERTIES.ERROR_TITLE!, 'status'),
	errorDescription: PROPERTIES.ERROR_DESCRIPTION!,
	retry: LOCALE.pages.unauthorized.TRY_AGAIN!,
	groupTodo: GROUPS.todo!,
	groupInProgress: GROUPS.inProgress!,
	groupDone: GROUPS.done!,
	groupOther: GROUPS.other!,
	groupCount: (count: number) => pluralBranch(PROPERTIES.GROUP_COUNT!, count),
	groupAdd: (group: string) => PROPERTIES.GROUP_ADD!.replace('{group}', group),
	rowActions: (name: string) => PROPERTIES.ROW_ACTIONS!.replace('{name}', name),
	drag: PROPERTIES.DRAG!,
	builtInMove: PROPERTIES.BUILT_IN_MOVE!,
	builtInDelete: PROPERTIES.BUILT_IN_DELETE!,
	defaultChip: PROPERTIES.DEFAULT!,
	makeDefault: PROPERTIES.MAKE_DEFAULT!,
	typeLabel: PROPERTIES.TYPE!,
	typeNone: PROPERTIES.TYPE_NONE!,
	typeGroupHint: (group: string) => PROPERTIES.TYPE_GROUP_HINT!.replace('{group}', group),
	preview: PROPERTIES.PREVIEW!,
	hexHint: PROPERTIES.HEX_HINT!,
	menuEdit: LOCALE.common.EDIT!,
	menuDelete: LOCALE.common.DELETE!,
	menuMoveUp: PROPERTIES.MOVE_UP!,
	menuMoveDown: PROPERTIES.MOVE_DOWN!,
	editorSave: LOCALE.common.SAVE!,
	editorCancel: LOCALE.common.CANCEL!,
	announceAdded: (name: string) => PROPERTIES.ANNOUNCE_ADDED!.replace('{name}', name),
	announceSaved: (name: string) => PROPERTIES.ANNOUNCE_SAVED!.replace('{name}', name),
	announceDeleted: (name: string) => PROPERTIES.ANNOUNCE_DELETED!.replace('{name}', name),
	announceMoved: (name: string, position: number) =>
		PROPERTIES.ANNOUNCE_MOVED!.replace('{name}', name).replace('{position}', String(position)),
	deleteTitle: selectBranch(PROPERTIES.delete.TITLE!, 'status'),
	deleteDescription: PROPERTIES.delete.DESCRIPTION!,
	deleteConfirm: selectBranch(PROPERTIES.delete.CONFIRM!, 'status'),
	deleteChoicesGone: PROPERTIES.delete.CHOICES_GONE!,
	deleteStatusTasks: (count: number) => pluralBranch(PROPERTIES.delete.STATUS_TASKS!, count),
	deleteStatusCounting: PROPERTIES.delete.STATUS_COUNTING!,
	readOnlyHint: LOCALE.pages.settingsTeam.TASK_SETTINGS_READ_ONLY!,
	orderFailedToast: LOCALE.toasts.tasks.STATUS_ORDER_FAILED!,
	mutationFailedToast: LOCALE.toasts.MUTATION_FAILED!,
	copyDetails: LOCALE.pages.about.COPY_DETAILS!,
	reason: (key: string) => LOCALE.toasts.REASONS[key]!,
	statusType: (key: string) => STATUS_TYPES[key]!
};

const report = (label: string, value: unknown) =>
	console.log(`[lane-a statuses] MEASURE ${label} ${JSON.stringify(value)}`);

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
const sorted = <T extends string>(items: T[]) => [...items].sort();

/** `dataColorHue`'s `oklch(from <hex> …)` reaches Chrome's `style` attribute as `rgb(…)` (lane-b spec `:362-367`). */
const rgbOf = (hex: string): string => {
	const digits = hex.replace('#', '');
	const parts = [0, 2, 4].map((index) => parseInt(digits.slice(index, index + 2), 16));
	return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
};
/** The whole declaration a served colour paints on the row's icon span (`task-property-icon.tsx:118-122`). */
const glyphStyle = (hex: string): string => `color: oklch(from ${rgbOf(hex)} 0.62 min(3 * c, 0.16) h);`;

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * `mutation-error-toaster.tsx:47-48`, printed for every failed mutation in dev mode. Excused only in a test that armed
 * a write refusal, so a mutation failing anywhere else is a finding.
 */
const DEV_MUTATION_NOISE = 'Mutation failed:';
const devMutationLine = (line: string) => line.includes(DEV_MUTATION_NOISE);

/**
 * The client's own HTTP error line for a refusal this file armed (`logger-adapter.service.ts:186-199`): the logged
 * `url` is the axios `config.url`, so a `GET` carries its whole query string. A line is excused only when it names
 * the verb, the path this file armed **and** that status.
 */
const armedRefusal = (verb: string, path: string, status: number) => {
	const withoutApi = path.replace(/^\/api/, '');
	return (line: string) =>
		line.includes(`HTTP Error: ${verb} ${withoutApi}`) && line.includes(`${status} {statusCode: ${status}`);
};

const consoleFindings = (shield: Shield, expected: Array<(line: string) => boolean> = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !expected.some((isArmed) => isArmed(line)));

const toastsOf = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasText: /\S/ });
/** The dev-only `DEV … failed … Copy details` toast (`dev-error-toaster.tsx`), kept apart from the app's own toasts. */
const devToastsOf = (page: Page) => toastsOf(page).filter({ hasText: copyOf.copyDetails });
const appToastsOf = (page: Page) => toastsOf(page).filter({ hasNotText: copyOf.copyDetails });
/** The pointer must rest away from the toaster before a toast is waited out: a hover pauses every countdown. */
const parkPointer = (page: Page) => page.mouse.move(2, 2);

const UUID_LEAD: Record<string, string> = { status: '7f1a0000', task: '7f2b0000' };
/** A uuid the client's `uuIdSchema` accepts (`core/types/schemas/common/base.schema.ts:7`). */
const uuid = (kind: string, index: number) => `${UUID_LEAD[kind]}-0000-4000-8000-${String(index).padStart(12, '0')}`;

/** A status as this file serves it: only keys `taskStatusSchema` knows (`.strict()`, `task-status.schema.ts:16-40`). */
type ServedStatus = {
	id: string;
	name: string;
	value: string;
	color: string | null;
	icon: string | null;
	order: number | null;
	isSystem?: boolean;
	isDefault?: boolean;
	isTodo?: boolean;
	isInProgress?: boolean;
	isDone?: boolean;
	tenantId: string;
	organizationId: string;
	organizationTeamId: string | null;
};

/** A task, in the shape `taskSchema` accepts and `suites/lane-b/kanban-board-ui.spec.ts:355-371` proved on a lane. */
type ServedTask = {
	id: string;
	title: string;
	number: number;
	public: boolean | null;
	status: string;
	taskStatusId: string;
	estimate: number;
	createdAt: string;
	tags: Array<unknown>;
	members: Array<unknown>;
	teams: Array<{ id: string; name: string; organizationId: string; tenantId: string }>;
	tenantId: string;
	organizationId: string;
};

type Refusal = { status: number; message: string };

type ServedScript = {
	statuses: ServedStatus[];
	tasks: ServedTask[];
	/** Treat the `template` an edit sent as the row's workflow flags (re-file it), or keep the flags as stored. */
	refileOnTemplate: boolean;
	readRefusal?: Refusal;
	createRefusal?: Refusal;
	editRefusal?: Refusal;
	deleteRefusal?: Refusal;
	reorderRefusal?: Refusal;
	taskWriteRefusal?: Refusal;
	/** Hold the first `GET /api/tasks/team` this long, so the delete dialog can be read before the tasks are known. */
	firstTaskReadDelayMs?: number;
};

type ServedCall = { method: string; path: string; search: string; body: Record<string, unknown> | null };

type StatusesApi = {
	calls: ServedCall[];
	statuses: ServedStatus[];
	tasks: ServedTask[];
	reads: () => ServedCall[];
	writes: () => ServedCall[];
	writesOf: (method: string, path: string) => ServedCall[];
	shapes: () => string[];
};

/** The workflow flags the client's own `groupOfTemplate` files each template under (`settings-task-properties.ts:217-226`). */
const TEMPLATE_FLAGS: Record<string, { isTodo?: boolean; isInProgress?: boolean; isDone?: boolean }> = {
	backlog: { isTodo: true },
	open: { isTodo: true },
	'in-progress': { isInProgress: true },
	'ready-for-review': { isInProgress: true },
	'in-review': { isInProgress: true },
	blocked: { isInProgress: true },
	done: { isDone: true },
	completed: { isDone: true }
};
const FLAGS_OFF = { isTodo: false, isInProgress: false, isDone: false };

/**
 * This file's stand-in for the statuses API and for the team's tasks, on the mock origin: the mock holds two built-in
 * statuses and one task (`mock-gauzy-server.mjs:156-181`, `:677-678`), and `useStatusDeletion` counts the tasks
 * **loaded in the browser** (`use-status-deletion.ts:15-31`), so a delete that moves tasks is only testable from here.
 * The list answer is always the current store, so a create, an edit, a reorder or a delete changes what the next read
 * answers and a refusal changes nothing. `route.fetch()` is never called.
 */
async function serveStatuses(page: Page, script: ServedScript): Promise<StatusesApi> {
	const store = { statuses: [...script.statuses], tasks: [...script.tasks] };
	const calls: ServedCall[] = [];
	const matcher = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		(url.pathname === BOOTSTRAP_ROUTE ||
			url.pathname === TEAM_TASKS_ROUTE ||
			url.pathname.startsWith(TASKS_ROUTE) ||
			url.pathname.startsWith(STATUSES_ROUTE));

	const answer = (route: Route, status: number, body?: unknown) =>
		route.fulfill({
			status,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: body === undefined ? '' : JSON.stringify(body)
		});
	const pagination = <T>(items: T[]) => ({ items, total: items.length });

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		// The mock answers a preflight itself (`mock-gauzy-server.mjs:1097-1101`); this route replaced it, so it must.
		if (method === 'OPTIONS') return answer(route, 204);

		const body = request.postData() ? (JSON.parse(request.postData() as string) as Record<string, unknown>) : null;
		calls.push({ method, path: url.pathname, search: decodeURIComponent(url.search), body });

		if (url.pathname === BOOTSTRAP_ROUTE && method === 'GET') {
			if (script.readRefusal) return answer(route, script.readRefusal.status, script.readRefusal);
			return answer(route, 200, {
				taskStatuses: pagination(store.statuses),
				taskPriorities: pagination([]),
				taskSizes: pagination([]),
				taskLabels: pagination([]),
				taskVersions: pagination([]),
				issueTypes: pagination([]),
				relatedIssueTypes: pagination([])
			});
		}

		if (url.pathname === TEAM_TASKS_ROUTE && method === 'GET') {
			if (script.firstTaskReadDelayMs && calls.filter((call) => call.path === TEAM_TASKS_ROUTE).length <= 1) {
				await new Promise((resolve) => setTimeout(resolve, script.firstTaskReadDelayMs));
			}
			// The read asks for `order[createdAt]=DESC&order[id]=DESC` (`task.service.ts:143-151`); sorting here is what
			// makes a page's content decided instead of racy.
			const newestFirst = [...store.tasks].sort(
				(first, second) => second.createdAt.localeCompare(first.createdAt) || second.id.localeCompare(first.id)
			);
			const take = Number(url.searchParams.get('take') ?? '');
			const skip = Number(url.searchParams.get('skip') ?? '');
			const items =
				Number.isFinite(take) && take > 0 && Number.isFinite(skip) && skip >= 1
					? newestFirst.slice((skip - 1) * take, skip * take)
					: newestFirst;
			return answer(route, 200, { items, total: store.tasks.length });
		}

		if (url.pathname.startsWith(`${TASKS_ROUTE}/`) && method === 'GET') {
			const taskId = decodeURIComponent(url.pathname.slice(TASKS_ROUTE.length + 1));
			const found = store.tasks.find((task) => task.id === taskId);
			if (!found) return answer(route, 404, { statusCode: 404, message: `no task ${taskId} here` });
			return answer(route, 200, found);
		}

		if (url.pathname.startsWith(`${TASKS_ROUTE}/`) && method === 'PUT') {
			const taskId = decodeURIComponent(url.pathname.slice(TASKS_ROUTE.length + 1));
			if (script.taskWriteRefusal) return answer(route, script.taskWriteRefusal.status, script.taskWriteRefusal);
			const current = store.tasks.find((task) => task.id === taskId);
			if (!current) return answer(route, 404, { statusCode: 404, message: `no task ${taskId} here` });
			const merged = { ...current, ...(body as object) } as ServedTask;
			store.tasks = store.tasks.map((task) => (task.id === taskId ? merged : task));
			return answer(route, 200, merged);
		}

		if (url.pathname === STATUSES_ROUTE && method === 'POST') {
			if (script.createRefusal) return answer(route, script.createRefusal.status, script.createRefusal);
			const template = String(body?.template ?? '');
			const created: ServedStatus = {
				id: uuid('status', 900 + store.statuses.length),
				name: String(body?.name ?? ''),
				value: String(body?.value ?? body?.name ?? ''),
				color: (body?.color as string) ?? null,
				icon: (body?.icon as string) ?? null,
				order: null,
				...(TEMPLATE_FLAGS[template] ?? FLAGS_OFF),
				isSystem: false,
				tenantId: String(body?.tenantId ?? ''),
				organizationId: String(body?.organizationId ?? ''),
				organizationTeamId: (body?.organizationTeamId as string) ?? null
			};
			store.statuses = [...store.statuses, created];
			return answer(route, 201, created);
		}

		if (url.pathname === REORDER_ROUTE && method === 'PATCH') {
			if (script.reorderRefusal) return answer(route, script.reorderRefusal.status, script.reorderRefusal);
			const entries = (body?.reorder as Array<{ id: string; order: number }>) ?? [];
			const orderById = new Map(entries.map((entry) => [entry.id, entry.order]));
			store.statuses = store.statuses.map((status) =>
				orderById.has(status.id) ? { ...status, order: orderById.get(status.id) as number } : status
			);
			return answer(route, 200, {
				success: true,
				list: entries.map((entry) => ({ id: entry.id, order: entry.order }))
			});
		}

		const statusId = url.pathname.startsWith(`${STATUSES_ROUTE}/`)
			? decodeURIComponent(url.pathname.slice(STATUSES_ROUTE.length + 1))
			: '';

		if (statusId && method === 'PUT') {
			if (script.editRefusal) return answer(route, script.editRefusal.status, script.editRefusal);
			const current = store.statuses.find((status) => status.id === statusId);
			if (!current) return answer(route, 404, { statusCode: 404, message: `no status ${statusId} here` });
			const template = body?.template as string | undefined;
			const merged: ServedStatus = {
				...current,
				...(body as object),
				...(template && script.refileOnTemplate ? { ...(TEMPLATE_FLAGS[template] ?? FLAGS_OFF) } : {})
			};
			store.statuses = store.statuses.map((status) => (status.id === statusId ? merged : status));
			// Gauzy's TypeORM answer, the shape `taskStatusUpdateResponseSchema` expects (`task-status.schema.ts:74-78`).
			return answer(route, 200, { generatedMaps: [], raw: [], affected: 1 });
		}

		if (statusId && method === 'DELETE') {
			if (script.deleteRefusal) return answer(route, script.deleteRefusal.status, script.deleteRefusal);
			const removed = store.statuses.find((status) => status.id === statusId);
			if (!removed) return answer(route, 404, { statusCode: 404, message: `no status ${statusId} here` });
			store.statuses = store.statuses.filter((status) => status.id !== statusId);
			return answer(route, 200, removed);
		}

		return answer(route, 599, {
			statusCode: 599,
			message: `this file served no answer for ${method} ${url.pathname}`
		});
	});

	return {
		calls,
		get statuses() {
			return store.statuses;
		},
		get tasks() {
			return store.tasks;
		},
		reads: () => calls.filter((call) => call.method === 'GET'),
		writes: () => calls.filter((call) => call.method !== 'GET'),
		writesOf: (method, path) => calls.filter((call) => call.method === method && call.path === path),
		shapes: () =>
			calls.map(
				(call) => `${call.method} ${call.path}${call.body === null ? '' : ` ${JSON.stringify(call.body)}`}`
			)
	};
}

/** A day at local noon, `setDate` steps so a run at any hour lands on the intended calendar day. */
const dayIso = (offsetDays: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offsetDays);
	return day.toISOString();
};

/**
 * The list this file serves: the two built-in rows the lane's own fixture carries (`mock-gauzy-server.mjs:156-181`,
 * names kept so the fixture task still matches one) plus five of the team's own, so every group has a row, one group
 * has three, one has a built-in and an own row side by side, and `other` holds a status with no workflow flag.
 */
function statusesScript(fixture: BootstrapFixture) {
	const { ids } = fixture;
	const statusOf = (index: number, name: string, extra: Partial<ServedStatus> = {}): ServedStatus => ({
		id: uuid('status', index),
		name,
		value: name.split(' ').join('-').toLowerCase(),
		color: null,
		icon: null,
		order: index,
		tenantId: ids.tenantA,
		organizationId: ids.organizationA,
		organizationTeamId: ids.teamA,
		...extra
	});
	const open = statusOf(1, 'open', { isSystem: true, isDefault: true, isTodo: true, color: '#94a3b8' });
	const queue = statusOf(2, 'sprint-queue', {
		isTodo: true,
		color: '#6366f1',
		icon: 'ever-icons/task-statuses/backlog.svg'
	});
	const triage = statusOf(3, 'triage', { isTodo: true, color: '#0ea5e9' });
	const doing = statusOf(4, 'in-progress', { isSystem: true, isInProgress: true, color: '#6366f1' });
	const blocked = statusOf(5, 'blocked', { isInProgress: true, color: '#ef4444' });
	const signed = statusOf(6, 'signed-off', { isDone: true, color: '#22c55e' });
	const obsolete = statusOf(7, 'obsolete');
	return {
		all: [open, queue, triage, doing, blocked, signed, obsolete],
		open,
		queue,
		triage,
		doing,
		blocked,
		signed,
		obsolete
	};
}

/** The team's loaded tasks: the fixture's own plus two that use `blocked`, so a delete has something to move. */
function tasksScript(fixture: BootstrapFixture, statuses: ReturnType<typeof statusesScript>): ServedTask[] {
	const { ids, names } = fixture;
	const team = { id: ids.teamA, name: names.teamA, organizationId: ids.organizationA, tenantId: ids.tenantA };
	const taskOf = (index: number, title: string, extra: Partial<ServedTask>): ServedTask => ({
		// The first row keeps the fixture task's own id, so the shell's active-task read still finds it.
		id: index === 1 ? ids.task : uuid('task', index),
		title,
		number: 100 + index,
		public: false,
		status: 'open',
		taskStatusId: statuses.open.id,
		estimate: 3600,
		createdAt: dayIso(-(10 - index)),
		tags: [],
		members: [],
		teams: [team],
		tenantId: ids.tenantA,
		organizationId: ids.organizationA,
		...extra
	});
	return [
		taskOf(1, names.task, {}),
		taskOf(2, 'Status probe two', { status: 'blocked', taskStatusId: statuses.blocked.id }),
		taskOf(3, 'Status probe three', { status: 'blocked', taskStatusId: statuses.blocked.id })
	];
}

/** Serves this file's list, signs the fixture person in and lands on the page (routes first, cookies second). */
const openStatusesPage = async (
	page: Page,
	fixture: BootstrapFixture,
	patch: Partial<ServedScript> = {},
	options: { scenario?: MockScenario; requireShell?: boolean } = {}
): Promise<{ api: StatusesApi; statuses: ReturnType<typeof statusesScript> }> => {
	const statuses = statusesScript(fixture);
	const api = await serveStatuses(page, {
		statuses: statuses.all,
		tasks: tasksScript(fixture, statuses),
		refileOnTemplate: true,
		...patch
	});
	// Routes first, cookies second, navigation last (`playwright/helpers.ts:434-451`).
	await signInAndVisit(page, fixture, STATUSES_PATH, options);
	await expect(page.locator('[data-property-row]')).toHaveCount(statuses.all.length, { timeout: 30_000 });
	return { api, statuses };
};

const rowsOf = async (page: Page): Promise<Array<{ id: string; group: string; label: string }>> =>
	page.$$eval('[data-property-row]', (nodes) =>
		nodes.map((node) => {
			const surface = node.closest('div.rounded-xl');
			const heading = surface?.querySelector('h2')?.textContent ?? '(no group heading)';
			const label = node.querySelector('span.min-w-0')?.textContent ?? '';
			return {
				id: node.getAttribute('data-property-row') ?? '',
				group: heading.trim(),
				label: label.trim()
			};
		})
	);

const rowShape = (row: { id: string; group: string; label: string }) => `${row.group} :: ${row.label}`;
const orderOf = async (page: Page): Promise<string[]> => (await rowsOf(page)).map(rowShape);

const rowOf = (page: Page, id: string): Locator => page.locator(`[data-property-row="${id}"]`);
const chipOf = (page: Page, id: string, text: string): Locator => rowOf(page, id).getByText(text, { exact: true });
const iconOf = (page: Page, id: string): Locator => rowOf(page, id).locator('[data-slot="task-property-icon"]');
const handleOf = (page: Page, id: string): Locator => rowOf(page, id).locator(`span[title="${copyOf.drag}"]`);
const announceOf = (page: Page): Locator => page.locator('p[aria-live="polite"]').last();
/** The editor is found by the name input it gives itself (`NAME_PLACEHOLDER`), as in the lane-b settings spec. */
const editorOf = (page: Page): Locator =>
	page.locator('form').filter({ has: page.locator(`input[placeholder="${copyOf.namePlaceholder}"]`) });
const nameFieldOf = (page: Page): Locator => editorOf(page).locator(`input[placeholder="${copyOf.namePlaceholder}"]`);
const saveButtonOf = (page: Page): Locator => editorOf(page).locator('button[type="submit"]');
const typeTriggerOf = (page: Page): Locator => editorOf(page).locator('button[aria-labelledby]');
const deleteDialogOf = (page: Page): Locator => page.getByRole('dialog', { name: copyOf.deleteTitle });

const openRowMenu = async (page: Page, id: string): Promise<void> => {
	const trigger = rowOf(page, id).locator('[data-row-menu]');
	await expect(trigger).toBeVisible({ timeout: 15_000 });
	await trigger.click({ timeout: 15_000 });
	await expect(page.locator('[role="menuitem"]').first()).toBeVisible({ timeout: 15_000 });
};

/** Base UI menus are document-level portals: they hold pointer events until they are closed. */
const closeRowMenu = async (page: Page): Promise<void> => {
	await page.keyboard.press('Escape');
	await expect(page.locator('[role="menuitem"]')).toHaveCount(0, { timeout: 15_000 });
};

const menuItems = async (page: Page): Promise<Array<{ text: string; disabled: string }>> =>
	page.$$eval('[role="menuitem"]', (nodes) =>
		nodes.map((node) => ({
			text: (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
			disabled: node.getAttribute('aria-disabled') ?? 'no-attr'
		}))
	);

const addRowOf = (page: Page, group: string): Locator => page.locator(`[data-add-row="${group}"]`);

const groupAddButtonOf = (page: Page, groupLabel: string): Locator =>
	page.getByRole('button', { name: copyOf.groupAdd(groupLabel), exact: true });

/** Every row's `draggable` attribute and its drag handle, as the list set them (`property-row.tsx:150` `:163-175`). */
const dragShapeOf = async (page: Page, handleTitle: string): Promise<string[]> =>
	page.$$eval(
		'[data-property-row]',
		(nodes, title) =>
			nodes.map(
				(node) =>
					`${node.getAttribute('draggable')} drag=${node.querySelectorAll(`span[title="${title}"]`).length}`
			),
		handleTitle
	);

const chipsOf = async (page: Page): Promise<string[]> =>
	page.$$eval('span[aria-label]', (nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));

const labelOf = (page: Page, id: string): Locator => rowOf(page, id).locator('span.min-w-0');
const hexFieldOf = (page: Page): Locator => editorOf(page).locator(`input[title="${copyOf.hexHint}"]`);
const announceTextOf = async (page: Page): Promise<string> => (await announceOf(page).innerText()).trim();

/** The four group headings, in document order, as the rows themselves see them. */
const groupHeadingsOf = async (page: Page): Promise<string[]> => {
	const headings = (await rowsOf(page)).map((row) => row.group);
	return headings.filter((heading, index) => heading !== headings[index - 1]);
};

/** The reorder request's entries as `<status id> <order>`, the order `taskStatusOrderSchema` validates. */
const reorderOf = (body: Record<string, unknown> | null): string[] =>
	((body?.reorder as Array<{ id: string; order: number }>) ?? []).map((entry) => `${entry.id} ${entry.order}`);

const boxOf = async (locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> => {
	const box = await locator.boundingBox();
	if (!box) {
		throw new Error('the drag locator has no box');
	}
	return box;
};

/** Playwright's own drag: it produces the HTML5 drag events the row's drag handle answers to. */
const dragHandleTo = async (page: Page, fromId: string, toId: string): Promise<void> => {
	const handle = handleOf(page, fromId);
	await expect(handle).toBeVisible({ timeout: 15_000 });
	await handle.dragTo(rowOf(page, toId), { timeout: 15_000 });
};

/** A raw pointer drag — down on the handle, several small moves, up (`suites/lane-b/kanban-board-ui.spec.ts:718-726`). */
const dragByMouse = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> => {
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	// A press only becomes a drag once the pointer moves: step out of the row, then across, then onto the target.
	await page.mouse.move(from.x, from.y + 26, { steps: 5 });
	await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 8 });
	await page.mouse.move(to.x, to.y, { steps: 8 });
	await page.mouse.up();
};

/** The four group labels as this file's rows see them, from `settings.taskProperties.groups`. */
const SERVED_ROWS = {
	todo: copyOf.groupTodo,
	inProgress: copyOf.groupInProgress,
	done: copyOf.groupDone,
	other: copyOf.groupOther
};

test('the four groups in their order, every row as printed, and the one read behind them', async ({
	page,
	fixture,
	shield
}) => {
	const { api, statuses } = await openStatusesPage(page, fixture);

	await expect(page.getByRole('heading', { level: 1, name: PAGE.TITLE })).toBeVisible();
	await expect(page.getByText(PAGE.DESCRIPTION).first()).toBeVisible();
	await expect
		.poll(() => groupHeadingsOf(page))
		.toEqual([copyOf.groupTodo, copyOf.groupInProgress, copyOf.groupDone, copyOf.groupOther]);
	await expect
		.poll(() => orderOf(page))
		.toEqual([
			`${SERVED_ROWS.todo} :: open`,
			`${SERVED_ROWS.todo} :: sprint queue`,
			`${SERVED_ROWS.todo} :: triage`,
			`${SERVED_ROWS.inProgress} :: in progress`,
			`${SERVED_ROWS.inProgress} :: blocked`,
			`${SERVED_ROWS.done} :: signed off`,
			`${SERVED_ROWS.other} :: obsolete`
		]);
	// `GroupHeader`'s count chip is a span whose label is the plural line (`property-list.tsx:243-245`).
	await expect
		.poll(() => chipsOf(page))
		.toEqual([copyOf.groupCount(3), copyOf.groupCount(2), copyOf.groupCount(1), copyOf.groupCount(1)]);

	// Each row's glyph carries the stored colour as its own `oklch(from …)` declaration; a colourless status is muted.
	for (const served of statuses.all) {
		const icon = iconOf(page, served.id);
		await expect(icon).toHaveCount(1);
		await expect(icon).toHaveAttribute('class', /size-4/);
		if (served.color) {
			await expect(icon).toHaveAttribute('style', glyphStyle(served.color));
		} else {
			expect(await icon.getAttribute('style')).toBeNull();
			await expect(icon).toHaveAttribute('class', /text-muted-foreground/);
		}
	}
	// The stored library icon path renders as the app's own glyph, with no image request (the icon library itself is
	// `suites/mock/team-settings.spec.ts:54-76`, not repeated here).
	await expect(rowOf(page, statuses.queue.id).locator('img')).toHaveCount(0);
	await expect(labelOf(page, statuses.queue.id)).toHaveText('sprint queue');

	// `isDefault` paints one chip, on the built-in default status only (`property-row.tsx:178`).
	await expect(chipOf(page, statuses.open.id, copyOf.defaultChip)).toBeVisible();
	for (const other of [
		statuses.queue,
		statuses.triage,
		statuses.doing,
		statuses.blocked,
		statuses.signed,
		statuses.obsolete
	]) {
		await expect(chipOf(page, other.id, copyOf.defaultChip)).toHaveCount(0);
	}

	// The drag handle and the `draggable` attribute exist on the team's own rows only (`property-row.tsx:150` `:163-175`).
	await expect
		.poll(() => dragShapeOf(page, copyOf.drag))
		.toEqual([
			'null drag=0',
			'true drag=1',
			'true drag=1',
			'null drag=0',
			'true drag=1',
			'true drag=1',
			'true drag=1'
		]);
	await expect(page.getByRole('button', { name: copyOf.rowActions('sprint queue'), exact: true })).toHaveCount(1);

	// The read: the bootstrap bundle, asked for this team, with `taskStatuses` in its `include`. Strict Mode mounts the
	// page twice, so the same read happens twice; the per-team `GET /api/task-statuses` never happens at all.
	const bootstrapReads = api.reads().filter((call) => call.path === BOOTSTRAP_ROUTE);
	expect(bootstrapReads.length).toBeGreaterThanOrEqual(1);
	for (const read of bootstrapReads) {
		expect(read.search).toContain(`organizationId=${fixture.ids.organizationA}`);
		expect(read.search).toContain(`organizationTeamId=${fixture.ids.teamA}`);
		expect(read.search).toContain('taskStatuses');
	}
	expect(api.reads().filter((call) => call.path === STATUSES_ROUTE)).toEqual([]);
	expect(api.writes()).toEqual([]);
	report(
		'reads',
		api.reads().map((call) => `${call.method} ${call.path}`)
	);
	expect(consoleFindings(shield)).toEqual([]);
});

test('what a built-in status offers, and which moves of a group the list will not save', async ({
	page,
	fixture,
	shield
}) => {
	const { statuses } = await openStatusesPage(page, fixture);

	// `isMoveRefused` / `isDeletionRefused` (`settings-task-properties.ts:529-544`) take the built-in row out of both,
	// and say so in the menu instead of listing a disabled item (`property-row.tsx:109-131`).
	for (const builtIn of [statuses.open, statuses.doing]) {
		await openRowMenu(page, builtIn.id);
		await expect.poll(() => menuItems(page)).toEqual([{ text: copyOf.menuEdit, disabled: 'no-attr' }]);
		await expect(page.getByText(copyOf.builtInMove)).toBeVisible();
		await expect(page.getByText(copyOf.builtInDelete)).toBeVisible();
		await closeRowMenu(page);
	}

	// A row of the team in the middle of a group of three: all four actions, none disabled — and the move past the
	// built-in row above it is offered, because the built-in keeps its own order and only the team's rows are sent.
	await openRowMenu(page, statuses.queue.id);
	await expect
		.poll(() => menuItems(page))
		.toEqual([
			{ text: copyOf.menuEdit, disabled: 'no-attr' },
			{ text: copyOf.menuMoveUp, disabled: 'no-attr' },
			{ text: copyOf.menuMoveDown, disabled: 'no-attr' },
			{ text: copyOf.menuDelete, disabled: 'no-attr' }
		]);
	// `Make default` is never offered here: this page passes no `onMakeDefault` (`statuses-settings-page.tsx:65-74`).
	await expect(page.getByRole('menuitem', { name: copyOf.makeDefault })).toHaveCount(0);
	await closeRowMenu(page);

	// The last row of a group has no row to move down onto: `canMoveDown` is false, and the item is listed disabled.
	await openRowMenu(page, statuses.triage.id);
	await expect
		.poll(() => menuItems(page))
		.toEqual([
			{ text: copyOf.menuEdit, disabled: 'no-attr' },
			{ text: copyOf.menuMoveUp, disabled: 'no-attr' },
			{ text: copyOf.menuMoveDown, disabled: 'true' },
			{ text: copyOf.menuDelete, disabled: 'no-attr' }
		]);
	await closeRowMenu(page);

	// The only row of a group has no row to swap with: `canMoveUp` / `canMoveDown` come from `isFirst` / `isLast`
	// (`property-list.tsx:499-502`), and the menu lists both items disabled.
	for (const alone of [statuses.signed, statuses.obsolete]) {
		await openRowMenu(page, alone.id);
		await expect
			.poll(() => menuItems(page))
			.toEqual([
				{ text: copyOf.menuEdit, disabled: 'no-attr' },
				{ text: copyOf.menuMoveUp, disabled: 'true' },
				{ text: copyOf.menuMoveDown, disabled: 'true' },
				{ text: copyOf.menuDelete, disabled: 'no-attr' }
			]);
		await closeRowMenu(page);
	}

	expect(consoleFindings(shield)).toEqual([]);
});

test('Move up from the row menu: one reorder request holding the team’s own statuses, and the order after a reload', async ({
	page,
	fixture,
	shield
}) => {
	const { api, statuses } = await openStatusesPage(page, fixture);
	const rowsBefore = await orderOf(page);

	await openRowMenu(page, statuses.queue.id);
	await page.getByRole('menuitem', { name: copyOf.menuMoveUp, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PATCH', REORDER_ROUTE).length, { timeout: 30_000 }).toBe(1);

	// `statusOrderOf` (`settings-task-properties.ts:480-517`) numbers the team's own statuses over the whole list and
	// leaves every built-in one out of the request — including the ones whose number did not change.
	const [patch] = api.writesOf('PATCH', REORDER_ROUTE);
	expect(patch.body?.organizationId).toBe(fixture.ids.organizationA);
	expect(patch.body?.tenantId).toBe(fixture.ids.tenantA);
	expect(reorderOf(patch.body)).toEqual([
		`${statuses.queue.id} 0`,
		`${statuses.triage.id} 2`,
		`${statuses.blocked.id} 5`,
		`${statuses.signed.id} 6`,
		`${statuses.obsolete.id} 7`
	]);
	for (const builtIn of [statuses.open, statuses.doing]) {
		expect(reorderOf(patch.body).some((entry) => entry.startsWith(`${builtIn.id} `))).toBe(false);
	}

	await expect.poll(() => announceTextOf(page)).toBe(copyOf.announceMoved('sprint queue', 1));
	const rowsAfterMove = [
		`${SERVED_ROWS.todo} :: sprint queue`,
		`${SERVED_ROWS.todo} :: open`,
		`${SERVED_ROWS.todo} :: triage`,
		`${SERVED_ROWS.inProgress} :: in progress`,
		`${SERVED_ROWS.inProgress} :: blocked`,
		`${SERVED_ROWS.done} :: signed off`,
		`${SERVED_ROWS.other} :: obsolete`
	];
	await expect.poll(() => orderOf(page)).toEqual(rowsAfterMove);
	await expect
		.poll(() => chipsOf(page))
		.toEqual([copyOf.groupCount(3), copyOf.groupCount(2), copyOf.groupCount(1), copyOf.groupCount(1)]);

	// A reload reads the stored order back: the served list answers with the orders the reorder wrote.
	await hardVisit(page, STATUSES_PATH);
	await expect(page.locator('[data-property-row]')).toHaveCount(7, { timeout: 30_000 });
	await expect.poll(() => orderOf(page)).toEqual(rowsAfterMove);
	expect(api.statuses.map((status) => `${status.name} ${status.order}`)).toEqual([
		'open 1',
		'sprint-queue 0',
		'triage 2',
		'in-progress 4',
		'blocked 5',
		'signed-off 6',
		'obsolete 7'
	]);
	report(
		'reorder request',
		api.writesOf('PATCH', REORDER_ROUTE).map((call) => call.body)
	);
	expect(rowsBefore[0]).toBe(`${SERVED_ROWS.todo} :: open`);
	expect(consoleFindings(shield)).toEqual([]);
});

test('the drag handle reorders inside its group — Playwright’s drag and a raw pointer drag, each one request; a drop into another group sends nothing', async ({
	page,
	fixture,
	shield
}) => {
	const { api, statuses } = await openStatusesPage(page, fixture);
	const patchCount = () => api.writesOf('PATCH', REORDER_ROUTE).length;
	const rowsAfterBothMoves = [
		`${SERVED_ROWS.todo} :: sprint queue`,
		`${SERVED_ROWS.todo} :: open`,
		`${SERVED_ROWS.todo} :: triage`,
		`${SERVED_ROWS.inProgress} :: in progress`,
		`${SERVED_ROWS.inProgress} :: blocked`,
		`${SERVED_ROWS.done} :: signed off`,
		`${SERVED_ROWS.other} :: obsolete`
	];

	// Route A, Playwright's own drag: the handle of `triage` dropped on the row of `queue` (a centre drop takes the
	// target's top edge, so `triage` lands where `queue` was) → one reorder.
	await dragHandleTo(page, statuses.triage.id, statuses.queue.id);
	await expect.poll(patchCount, { timeout: 30_000 }).toBe(1);
	expect(reorderOf(api.writesOf('PATCH', REORDER_ROUTE)[0].body)).toEqual([
		`${statuses.triage.id} 2`,
		`${statuses.queue.id} 3`,
		`${statuses.blocked.id} 5`,
		`${statuses.signed.id} 6`,
		`${statuses.obsolete.id} 7`
	]);
	await expect.poll(() => announceTextOf(page)).toBe(copyOf.announceMoved('triage', 2));
	await expect
		.poll(() => orderOf(page))
		.toEqual([
			`${SERVED_ROWS.todo} :: open`,
			`${SERVED_ROWS.todo} :: triage`,
			`${SERVED_ROWS.todo} :: sprint queue`,
			`${SERVED_ROWS.inProgress} :: in progress`,
			`${SERVED_ROWS.inProgress} :: blocked`,
			`${SERVED_ROWS.done} :: signed off`,
			`${SERVED_ROWS.other} :: obsolete`
		]);

	// Route B, the brief's route: `page.mouse` down on the handle, several small moves with `steps`, up. A row of the
	// team is `draggable=true` with the handle as its drag handle (`property-row.tsx:150` `:163-175`,
	// `property-dnd.ts:114-120`), and Chromium turns that pointer drag into the same HTML5 drag: one reorder, the same
	// body shape (`-probe4.log` Y2).
	const handleBox = await boxOf(handleOf(page, statuses.queue.id));
	const targetBox = await boxOf(rowOf(page, statuses.open.id));
	await dragByMouse(page, { x: handleBox.x + 4, y: handleBox.y + 4 }, { x: targetBox.x + 60, y: targetBox.y + 4 });
	await expect.poll(patchCount, { timeout: 30_000 }).toBe(2);
	expect(reorderOf(api.writesOf('PATCH', REORDER_ROUTE)[1].body)).toEqual([
		`${statuses.queue.id} 0`,
		`${statuses.triage.id} 2`,
		`${statuses.blocked.id} 5`,
		`${statuses.signed.id} 6`,
		`${statuses.obsolete.id} 7`
	]);
	await expect.poll(() => announceTextOf(page)).toBe(copyOf.announceMoved('sprint queue', 1));
	await expect.poll(() => orderOf(page)).toEqual(rowsAfterBothMoves);

	// A drop into another group moves nothing and sends nothing, by either route: `canDrop` refuses a target outside
	// the row's own group (`property-dnd.ts:89-94`) and `dropRow` guards it again (`property-list.tsx:383-385`). The
	// settle is the wait that shows no request followed (`-probe4.log` Y1 and Y3: 0 writes after 3 s).
	await dragHandleTo(page, statuses.triage.id, statuses.blocked.id);
	await page.waitForTimeout(2_000);
	expect(patchCount()).toBe(2);
	await expect.poll(() => orderOf(page)).toEqual(rowsAfterBothMoves);

	const backHandleBox = await boxOf(handleOf(page, statuses.triage.id));
	const otherBox = await boxOf(rowOf(page, statuses.blocked.id));
	await dragByMouse(
		page,
		{ x: backHandleBox.x + 4, y: backHandleBox.y + 4 },
		{ x: otherBox.x + 60, y: otherBox.y + 4 }
	);
	await page.waitForTimeout(2_000);
	expect(patchCount()).toBe(2);
	await expect.poll(() => orderOf(page)).toEqual(rowsAfterBothMoves);

	// What the two saved reorders left is what a reload reads back, in the group order the page prints.
	await hardVisit(page, STATUSES_PATH);
	await expect(page.locator('[data-property-row]')).toHaveCount(7, { timeout: 30_000 });
	await expect.poll(() => orderOf(page)).toEqual(rowsAfterBothMoves);
	expect(api.statuses.map((status) => `${status.name} ${status.order}`)).toEqual([
		'open 1',
		'sprint-queue 0',
		'triage 2',
		'in-progress 4',
		'blocked 5',
		'signed-off 6',
		'obsolete 7'
	]);
	report(
		'drag reorders',
		api.writesOf('PATCH', REORDER_ROUTE).map((call) => reorderOf(call.body))
	);
	expect(consoleFindings(shield)).toEqual([]);
});

test('creating a status in the To do group: the form, the one request, and where the row lands', async ({
	page,
	fixture,
	shield
}) => {
	const { api, statuses } = await openStatusesPage(page, fixture);

	await expect(groupAddButtonOf(page, copyOf.groupTodo)).toBeEnabled();
	await addRowOf(page, 'todo').click({ timeout: 15_000 });

	// The editor a group's Add row opens: the name field, the colour (its own default swatch), and the type the group
	// stands for — `templateOfGroup('todo')` (`settings-task-properties.ts:242-252`), said under the picker.
	await expect(editorOf(page)).toBeVisible();
	await expect(nameFieldOf(page)).toHaveValue('');
	await expect(hexFieldOf(page)).toHaveValue('#EC4899');
	await expect(editorOf(page).locator('button[aria-label="#EC4899"]')).toHaveAttribute('aria-pressed', 'true');
	await expect(typeTriggerOf(page)).toContainText(copyOf.statusType('open'));
	await expect(page.getByText(copyOf.typeGroupHint(copyOf.groupTodo))).toBeVisible();
	await expect(saveButtonOf(page)).toHaveText(copyOf.add);

	await nameFieldOf(page).fill('Probe sprint two');
	await saveButtonOf(page).click({ timeout: 15_000 });

	await expect.poll(() => api.writesOf('POST', STATUSES_ROUTE).length, { timeout: 30_000 }).toBe(1);
	const [post] = api.writesOf('POST', STATUSES_ROUTE);
	// Only the fields `create` builds (`use-status-settings.ts:58-72`): the name, its slug, the colour, the icon the
	// type carries (`iconPathOfTemplate`, `settings-task-properties.ts:317-323`), the type, and the three scope ids.
	expect(post.body).toEqual({
		name: 'Probe sprint two',
		value: 'probe-sprint-two',
		icon: 'ever-icons/task-statuses/open.svg',
		color: '#EC4899',
		template: 'open',
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		organizationTeamId: fixture.ids.teamA
	});

	await expect(page.locator('[data-property-row]')).toHaveCount(8, { timeout: 30_000 });
	const created = api.statuses.find((status) => status.name === 'Probe sprint two');
	if (!created) {
		throw new Error(
			`the served store never took the new status: ${api.statuses.map((status) => status.name).join(', ')}`
		);
	}
	// No order yet, so the group's sort puts it last (`statusItemsOf`'s `UNORDERED`).
	expect(created.order).toBeNull();
	await expect
		.poll(() => orderOf(page))
		.toEqual([
			`${SERVED_ROWS.todo} :: open`,
			`${SERVED_ROWS.todo} :: sprint queue`,
			`${SERVED_ROWS.todo} :: triage`,
			`${SERVED_ROWS.todo} :: Probe sprint two`,
			`${SERVED_ROWS.inProgress} :: in progress`,
			`${SERVED_ROWS.inProgress} :: blocked`,
			`${SERVED_ROWS.done} :: signed off`,
			`${SERVED_ROWS.other} :: obsolete`
		]);
	await expect
		.poll(() => chipsOf(page))
		.toEqual([copyOf.groupCount(4), copyOf.groupCount(2), copyOf.groupCount(1), copyOf.groupCount(1)]);
	await expect(iconOf(page, created.id)).toHaveAttribute('style', glyphStyle('#EC4899'));
	await expect.poll(() => announceTextOf(page)).toBe(copyOf.announceAdded('Probe sprint two'));
	await expect(editorOf(page)).toHaveCount(0);
	await expect(rowOf(page, statuses.obsolete.id)).toBeVisible();
	expect(consoleFindings(shield)).toEqual([]);
});

test('creating a status in the Other group: no type on the form, so none in the request either', async ({
	page,
	fixture,
	shield
}) => {
	const { api } = await openStatusesPage(page, fixture);

	await addRowOf(page, 'other').click({ timeout: 15_000 });
	await expect(typeTriggerOf(page)).toContainText(copyOf.typeNone);
	await nameFieldOf(page).fill('Dropped idea');
	await saveButtonOf(page).click({ timeout: 15_000 });

	await expect.poll(() => api.writesOf('POST', STATUSES_ROUTE).length, { timeout: 30_000 }).toBe(1);
	const [post] = api.writesOf('POST', STATUSES_ROUTE);
	// `create` passes `template: undefinedIfNull(draft.template)` and `icon: undefinedIfNull(draft.icon)`, and JSON
	// drops both: the Other group's editor left the type unset (`statusType` of 'other' is `null`).
	expect(post.body).toEqual({
		name: 'Dropped idea',
		value: 'dropped-idea',
		color: '#EC4899',
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		organizationTeamId: fixture.ids.teamA
	});
	expect(post.body?.template).toBeUndefined();
	expect(post.body?.icon).toBeUndefined();

	await expect(page.locator('[data-property-row]')).toHaveCount(8, { timeout: 30_000 });
	await expect
		.poll(() => orderOf(page))
		.toEqual([
			`${SERVED_ROWS.todo} :: open`,
			`${SERVED_ROWS.todo} :: sprint queue`,
			`${SERVED_ROWS.todo} :: triage`,
			`${SERVED_ROWS.inProgress} :: in progress`,
			`${SERVED_ROWS.inProgress} :: blocked`,
			`${SERVED_ROWS.done} :: signed off`,
			`${SERVED_ROWS.other} :: obsolete`,
			`${SERVED_ROWS.other} :: Dropped idea`
		]);
	await expect
		.poll(() => chipsOf(page))
		.toEqual([copyOf.groupCount(3), copyOf.groupCount(2), copyOf.groupCount(1), copyOf.groupCount(2)]);
	await expect.poll(() => announceTextOf(page)).toBe(copyOf.announceAdded('Dropped idea'));
	expect(consoleFindings(shield)).toEqual([]);
});

const STATUS_TYPE_ORDER = [
	'backlog',
	'open',
	'inProgress',
	'readyForReview',
	'inReview',
	'blocked',
	'done',
	'completed',
	'cancelled',
	'custom'
];

/** Opens one status's editor through its row menu (`property-editor-row.tsx` replaces the row while it is open). */
const openEditorOf = async (page: Page, statusId: string): Promise<void> => {
	await openRowMenu(page, statusId);
	await page.getByRole('menuitem', { name: copyOf.menuEdit, exact: true }).click({ timeout: 15_000 });
	await expect(nameFieldOf(page)).toBeVisible({ timeout: 15_000 });
};

/** The type picker: its whole list, then `Blocked`, then the editor's Save. Returns the `PUT` that answered. */
const pickBlockedType = async (page: Page, api: StatusesApi, statusId: string): Promise<ServedCall> => {
	await expect(typeTriggerOf(page)).toContainText(copyOf.typeNone);
	await typeTriggerOf(page).click({ timeout: 15_000 });
	// `StatusTypePicker` lists "No type" first, then every `STATUS_TEMPLATES` entry in its own order.
	await expect(page.locator('[role="menuitem"]')).toHaveCount(STATUS_TYPE_ORDER.length + 1, { timeout: 15_000 });
	await expect(page.locator('[role="menuitem"]').nth(0)).toContainText(copyOf.typeNone);
	for (const [index, key] of STATUS_TYPE_ORDER.entries()) {
		await expect(page.locator('[role="menuitem"]').nth(index + 1)).toContainText(copyOf.statusType(key));
	}
	await page.getByRole('menuitem', { name: copyOf.statusType('blocked'), exact: true }).click({ timeout: 15_000 });
	await expect(typeTriggerOf(page)).toContainText(copyOf.statusType('blocked'));
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT', `${STATUSES_ROUTE}/${statusId}`).length, { timeout: 30_000 }).toBe(1);
	return api.writesOf('PUT', `${STATUSES_ROUTE}/${statusId}`)[0];
};

test('changing a status’s type: the request it sends, and the group a re-filing read answers it back under', async ({
	page,
	fixture,
	shield
}) => {
	const { api, statuses } = await openStatusesPage(page, fixture, { refileOnTemplate: true });
	await expect(labelOf(page, statuses.obsolete.id)).toHaveText('obsolete');

	await openEditorOf(page, statuses.obsolete.id);
	await expect(nameFieldOf(page)).toHaveValue('obsolete');
	await expect(hexFieldOf(page)).toHaveValue('');
	await expect(saveButtonOf(page)).toHaveText(copyOf.editorSave);

	const put = await pickBlockedType(page, api, statuses.obsolete.id);
	// `statusEditBodyOf` sends the name, the type, and only the look fields that hold something (`color`/`icon` were
	// `null`), with the two scope ids the service adds (`task-status.service.ts:120-150`).
	expect(put.body).toEqual({
		name: 'obsolete',
		template: 'blocked',
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA
	});
	expect(put.body?.color).toBeUndefined();
	expect(put.body?.icon).toBeUndefined();
	await expect.poll(() => announceTextOf(page)).toBe(copyOf.announceSaved('obsolete'));

	// This served read re-files the row from the `template` it was sent, so the row moves and the group it left, now
	// empty, is not rendered at all (`statusItemsOf` drops an empty `other`).
	await expect
		.poll(() => groupHeadingsOf(page))
		.toEqual([copyOf.groupTodo, copyOf.groupInProgress, copyOf.groupDone]);
	await expect
		.poll(() => orderOf(page))
		.toEqual([
			`${SERVED_ROWS.todo} :: open`,
			`${SERVED_ROWS.todo} :: sprint queue`,
			`${SERVED_ROWS.todo} :: triage`,
			`${SERVED_ROWS.inProgress} :: in progress`,
			`${SERVED_ROWS.inProgress} :: blocked`,
			`${SERVED_ROWS.inProgress} :: obsolete`,
			`${SERVED_ROWS.done} :: signed off`
		]);
	await expect.poll(() => chipsOf(page)).toEqual([copyOf.groupCount(3), copyOf.groupCount(3), copyOf.groupCount(1)]);
	await expect(rowOf(page, statuses.obsolete.id)).toBeVisible();

	// A save that changed nothing sends nothing (`isDraftChanged`, `use-status-settings.ts:75-79`), and neither does
	// Cancel after typing a new name.
	await openEditorOf(page, statuses.signed.id);
	await expect(nameFieldOf(page)).toHaveValue('signed off');
	await expect(hexFieldOf(page)).toHaveValue('#22c55e');
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect(editorOf(page)).toHaveCount(0, { timeout: 15_000 });
	expect(api.writesOf('PUT', `${STATUSES_ROUTE}/${statuses.signed.id}`)).toEqual([]);

	await openEditorOf(page, statuses.triage.id);
	await nameFieldOf(page).fill('triage renamed');
	await page.getByRole('button', { name: copyOf.editorCancel, exact: true }).click({ timeout: 15_000 });
	await expect(editorOf(page)).toHaveCount(0, { timeout: 15_000 });
	expect(api.writes()).toHaveLength(1);
	await expect(labelOf(page, statuses.triage.id)).toHaveText('triage');
	expect(consoleFindings(shield)).toEqual([]);
});

test('the same type change when the stored flags survive the update: the row keeps its group', async ({
	page,
	fixture,
	shield
}) => {
	const { api, statuses } = await openStatusesPage(page, fixture, { refileOnTemplate: false });

	await openEditorOf(page, statuses.obsolete.id);
	const put = await pickBlockedType(page, api, statuses.obsolete.id);
	// The request is byte for byte the one the re-filing variant sent (header finding 10).
	expect(put.body).toEqual({
		name: 'obsolete',
		template: 'blocked',
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA
	});
	// And the row did not move: which group a status sits in comes from the
	// `isTodo`/`isInProgress`/`isDone` the read answers with (`statusItemsOf`'s `firstTrueGroup`), while the page sent
	// a `template` and announced the save. The client says so itself: "Gauzy reads `template` on creation only, to
	// file the status under a workflow category; an update ignores it." (`settings-task-properties.ts:174`).
	await expect
		.poll(() => groupHeadingsOf(page))
		.toEqual([copyOf.groupTodo, copyOf.groupInProgress, copyOf.groupDone, copyOf.groupOther]);
	await expect
		.poll(() => orderOf(page))
		.toEqual([
			`${SERVED_ROWS.todo} :: open`,
			`${SERVED_ROWS.todo} :: sprint queue`,
			`${SERVED_ROWS.todo} :: triage`,
			`${SERVED_ROWS.inProgress} :: in progress`,
			`${SERVED_ROWS.inProgress} :: blocked`,
			`${SERVED_ROWS.done} :: signed off`,
			`${SERVED_ROWS.other} :: obsolete`
		]);
	await expect.poll(() => announceTextOf(page)).toBe(copyOf.announceSaved('obsolete'));
	report('type change kept flags', { putBody: put.body, rows: await orderOf(page) });
	expect(consoleFindings(shield)).toEqual([]);
});

test('deleting a status: the tasks that use it move first, and a status no task uses needs only the DELETE', async ({
	page,
	fixture,
	shield
}) => {
	// The team's tasks are held on their way for a moment, so the dialog can be read before its count is known.
	const { api, statuses } = await openStatusesPage(
		page,
		fixture,
		{ firstTaskReadDelayMs: 8_000 },
		{ requireShell: false }
	);
	const movingIds = sorted(api.tasks.filter((task) => task.status === 'blocked').map((task) => task.id));
	expect(movingIds).toHaveLength(2);

	await openRowMenu(page, statuses.blocked.id);
	await page.getByRole('menuitem', { name: copyOf.menuDelete, exact: true }).click({ timeout: 15_000 });
	const dialog = deleteDialogOf(page);
	await expect(dialog).toBeVisible({ timeout: 30_000 });
	await expect(dialog).toContainText(copyOf.deleteTitle);
	await expect(dialog).toContainText(copyOf.deleteDescription);
	await expect(dialog).toContainText(copyOf.deleteChoicesGone);
	// `isCounting: isFirstLoad` (`use-status-deletion.ts:33`) holds the confirm until the tasks are known (`isReady={!isCounting}`,
	// `statuses-settings-page.tsx:32`).
	await expect(dialog).toContainText(copyOf.deleteStatusCounting);
	const confirm = dialog.getByRole('button', { name: copyOf.deleteConfirm, exact: true });
	await expect(confirm).toBeDisabled();
	await expect(dialog).toContainText(copyOf.deleteStatusTasks(2), { timeout: 60_000 });
	await expect(confirm).toBeEnabled();

	// Cancel first: a delete that was never confirmed sent nothing at all.
	await dialog.getByRole('button', { name: copyOf.editorCancel, exact: true }).click({ timeout: 15_000 });
	await expect(dialog).toHaveCount(0, { timeout: 15_000 });
	expect(api.writes()).toEqual([]);

	await openRowMenu(page, statuses.blocked.id);
	await page.getByRole('menuitem', { name: copyOf.menuDelete, exact: true }).click({ timeout: 15_000 });
	await expect(dialog).toBeVisible({ timeout: 15_000 });
	await confirm.click({ timeout: 15_000 });
	await expect(rowOf(page, statuses.blocked.id)).toHaveCount(0, { timeout: 30_000 });
	await expect.poll(() => announceTextOf(page)).toBe(copyOf.announceDeleted('blocked'));

	const writes = api.writes();
	report(
		'delete writes',
		writes.map((call) => `${call.method} ${call.path}`)
	);
	// `remove` (`use-status-deletion.ts:26-31`): every move first, then the status delete.
	expect(writes.map((call) => `${call.method} ${call.path}`)).toHaveLength(3);
	expect(sorted(writes.map((call) => `${call.method} ${call.path}`))).toEqual(
		sorted([
			...movingIds.map((id) => `PUT ${TASKS_ROUTE}/${id}`),
			`DELETE ${STATUSES_ROUTE}/${statuses.blocked.id}`
		])
	);
	expect(writes.slice(0, 2).every((call) => call.method === 'PUT' && call.path.startsWith(`${TASKS_ROUTE}/`))).toBe(
		true
	);
	expect(`${writes[2].method} ${writes[2].path}`).toBe(`DELETE ${STATUSES_ROUTE}/${statuses.blocked.id}`);
	for (const call of writes.slice(0, 2)) {
		const body = call.body as Record<string, unknown>;
		// The whole loaded task, with only `status` replaced (`updateTask({ ...task, status: ETaskStatusName.OPEN })`).
		// Measured (header finding 11): `taskStatusId` in that body still names the status being deleted.
		expect(sorted(Object.keys(body))).toEqual(
			'createdAt estimate id members number organizationId public status tags taskStatusId teams tenantId title'.split(
				' '
			)
		);
		expect(body.status).toBe('open');
		expect(body.taskStatusId).toBe(statuses.blocked.id);
	}
	expect(sorted(api.tasks.filter((task) => movingIds.includes(task.id)).map((task) => task.status))).toEqual([
		'open',
		'open'
	]);
	await expect
		.poll(() => chipsOf(page))
		.toEqual([copyOf.groupCount(3), copyOf.groupCount(1), copyOf.groupCount(1), copyOf.groupCount(1)]);

	// A status no loaded task uses: the dialog says so, and its delete is the only request.
	await openRowMenu(page, statuses.obsolete.id);
	await page.getByRole('menuitem', { name: copyOf.menuDelete, exact: true }).click({ timeout: 15_000 });
	const secondDialog = deleteDialogOf(page);
	await expect(secondDialog).toContainText(copyOf.deleteStatusTasks(0), { timeout: 30_000 });
	const sentBefore = writes.length;
	await secondDialog.getByRole('button', { name: copyOf.deleteConfirm, exact: true }).click({ timeout: 15_000 });
	await expect(rowOf(page, statuses.obsolete.id)).toHaveCount(0, { timeout: 30_000 });
	const afterSecond = api.writes();
	expect(afterSecond.slice(sentBefore).map((call) => `${call.method} ${call.path}`)).toEqual([
		`DELETE ${STATUSES_ROUTE}/${statuses.obsolete.id}`
	]);
	await expect.poll(() => announceTextOf(page)).toBe(copyOf.announceDeleted('obsolete'));
	await expect
		.poll(() => groupHeadingsOf(page))
		.toEqual([copyOf.groupTodo, copyOf.groupInProgress, copyOf.groupDone]);
	expect(consoleFindings(shield)).toEqual([]);
});

test('a reorder the server refuses: the rows go back to where they were, and the page says why', async ({
	page,
	fixture,
	shield
}) => {
	const refusal = { status: 400, message: 'the built-in status cannot be reordered' };
	const { api, statuses } = await openStatusesPage(page, fixture, { reorderRefusal: refusal });
	const rowsBefore = await orderOf(page);

	await openRowMenu(page, statuses.queue.id);
	await page.getByRole('menuitem', { name: copyOf.menuMoveUp, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PATCH', REORDER_ROUTE).length, { timeout: 30_000 }).toBe(1);

	// `move` set the new orders first, and its `catch { setTaskStatuses(previous) }` puts them back
	// (`use-status-settings.ts:95-103`), so the list is the list again in the same session.
	await expect.poll(() => orderOf(page)).toEqual(rowsBefore);
	expect(api.statuses.map((status) => `${status.name} ${status.order}`)).toEqual([
		'open 1',
		'sprint-queue 2',
		'triage 3',
		'in-progress 4',
		'blocked 5',
		'signed-off 6',
		'obsolete 7'
	]);

	// [MEASURED, NOT INTENDED] the live region still says "{name} moved to position {position}."
	// (`settings.taskProperties.ANNOUNCE_MOVED`, `locales/en.json:5296`) while the rows are back where they were:
	// `move` swallows the refusal (`use-status-settings.ts:101-103`), so `property-list.tsx:333-334` announces it after
	// `await onMove(orderedIds)` resolved anyway. The product's own copy states a move the page did not make.
	await expect.poll(() => announceTextOf(page)).toBe(copyOf.announceMoved('sprint queue', 1));

	await parkPointer(page);
	const appToast = appToastsOf(page).filter({ hasText: copyOf.orderFailedToast }).first();
	await expect(appToast).toBeVisible({ timeout: 30_000 });
	await expect(appToast).toContainText(copyOf.reason('INVALID'));
	// The dev-only toast names the mutation and the refusal this file armed (`-probe3.log` R1 listed both toasts).
	await expect(devToastsOf(page).filter({ hasText: refusal.message }).first()).toBeVisible({ timeout: 30_000 });
	// `leavesErrorToFallback` keeps the global fallback toast quiet when the mutation already spoke for itself
	// (`mutation-error-toaster.tsx:50-56`).
	await expect(appToastsOf(page).filter({ hasText: copyOf.mutationFailedToast })).toHaveCount(0);

	await hardVisit(page, STATUSES_PATH);
	await expect(page.locator('[data-property-row]')).toHaveCount(7, { timeout: 30_000 });
	await expect.poll(() => orderOf(page)).toEqual(rowsBefore);

	report('refused reorder', {
		writes: api
			.writes()
			.map((call) => `${call.method} ${call.path} ${call.body?.reorder ? reorderOf(call.body).join(',') : ''}`)
	});
	// The only console line excused is the client's own HTTP error for the refusal this file armed.
	expect(shield.consoleErrors().filter((line) => armedRefusal('PATCH', REORDER_ROUTE, 400)(line))).toHaveLength(1);
	expect(consoleFindings(shield, [armedRefusal('PATCH', REORDER_ROUTE, 400), devMutationLine])).toEqual([]);
});

test('a delete the server refuses: the task moves were already sent, the row stays, and the reason is in the dialog', async ({
	page,
	fixture,
	shield
}) => {
	const refusal = { status: 500, message: 'the status is held' };
	const { api, statuses } = await openStatusesPage(page, fixture, { deleteRefusal: refusal });
	const rowsBefore = await orderOf(page);
	const movingIds = sorted(api.tasks.filter((task) => task.status === 'blocked').map((task) => task.id));

	await openRowMenu(page, statuses.blocked.id);
	await page.getByRole('menuitem', { name: copyOf.menuDelete, exact: true }).click({ timeout: 15_000 });
	const dialog = deleteDialogOf(page);
	await expect(dialog).toBeVisible({ timeout: 30_000 });
	await expect(dialog).toContainText(copyOf.deleteStatusTasks(2), { timeout: 60_000 });
	await dialog.getByRole('button', { name: copyOf.deleteConfirm, exact: true }).click({ timeout: 15_000 });

	await expect
		.poll(() => api.writesOf('DELETE', `${STATUSES_ROUTE}/${statuses.blocked.id}`).length, { timeout: 30_000 })
		.toBe(1);
	// The dialog stays open and carries the reason key the service mapped (`danger.tsx` / `property-delete-dialog.tsx`).
	await expect(dialog).toContainText(copyOf.reason('SERVER'), { timeout: 30_000 });
	await expect.poll(() => orderOf(page)).toEqual(rowsBefore);
	await expect(rowOf(page, statuses.blocked.id)).toBeVisible();
	// No delete happened, so the list never announced one.
	expect(await announceTextOf(page)).not.toBe(copyOf.announceDeleted('blocked'));
	report(
		'refused delete',
		api.writes().map((call) => `${call.method} ${call.path}`)
	);
	expect(sorted(api.writes().map((call) => `${call.method} ${call.path}`))).toEqual(
		sorted([
			...movingIds.map((id) => `PUT ${TASKS_ROUTE}/${id}`),
			`DELETE ${STATUSES_ROUTE}/${statuses.blocked.id}`
		])
	);
	// Measured (header finding 14): `remove` awaited the moves before the delete and nothing puts them back
	// (`use-status-deletion.ts:27-29`): the two tasks of this team are on Open now, and their status is still listed.
	expect(sorted(api.tasks.filter((task) => movingIds.includes(task.id)).map((task) => task.status))).toEqual([
		'open',
		'open'
	]);
	expect(
		shield
			.consoleErrors()
			.filter((line) => armedRefusal('DELETE', `${STATUSES_ROUTE}/${statuses.blocked.id}`, 500)(line))
	).toHaveLength(1);
	expect(
		consoleFindings(shield, [
			armedRefusal('DELETE', `${STATUSES_ROUTE}/${statuses.blocked.id}`, 500),
			devMutationLine
		])
	).toEqual([]);
});

test('an edit the server refuses: the editor keeps what was typed, the row keeps its name', async ({
	page,
	fixture,
	shield
}) => {
	const refusal = { status: 500, message: 'the rename was refused' };
	const { api, statuses } = await openStatusesPage(page, fixture, { editRefusal: refusal });

	await openEditorOf(page, statuses.signed.id);
	await nameFieldOf(page).fill('Renamed refused');
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect
		.poll(() => api.writesOf('PUT', `${STATUSES_ROUTE}/${statuses.signed.id}`).length, { timeout: 30_000 })
		.toBe(1);

	const [put] = api.writesOf('PUT', `${STATUSES_ROUTE}/${statuses.signed.id}`);
	expect(put.body).toEqual({
		name: 'Renamed refused',
		color: '#22c55e',
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA
	});
	// `submit` catches the refusal, and the comment there says what happens: "the row stays open with what was typed"
	// (`property-editor-row.tsx:123-134`). Nothing was written to the list, and nothing was announced.
	await expect(editorOf(page)).toBeVisible();
	await expect(nameFieldOf(page)).toHaveValue('Renamed refused');
	expect(await announceTextOf(page)).not.toContain('Renamed refused');
	expect(api.statuses.find((status) => status.id === statuses.signed.id)?.name).toBe('signed-off');

	await page.getByRole('button', { name: copyOf.editorCancel, exact: true }).click({ timeout: 15_000 });
	await expect(editorOf(page)).toHaveCount(0, { timeout: 15_000 });
	await expect(rowOf(page, statuses.signed.id)).toBeVisible();
	await expect(labelOf(page, statuses.signed.id)).toHaveText('signed off');

	expect(
		shield
			.consoleErrors()
			.filter((line) => armedRefusal('PUT', `${STATUSES_ROUTE}/${statuses.signed.id}`, 500)(line))
	).toHaveLength(1);
	expect(
		consoleFindings(shield, [armedRefusal('PUT', `${STATUSES_ROUTE}/${statuses.signed.id}`, 500), devMutationLine])
	).toEqual([]);
});

test('a read that fails: the notice with its retry, and no list at all', async ({ page, fixture, shield }) => {
	const statuses = statusesScript(fixture);
	const api = await serveStatuses(page, {
		statuses: statuses.all,
		tasks: tasksScript(fixture, statuses),
		refileOnTemplate: true,
		readRefusal: { status: 500, message: 'the statuses are held' }
	});
	await signInAndVisit(page, fixture, STATUSES_PATH);

	await expect(page.getByRole('heading', { level: 1, name: PAGE.TITLE })).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('body')).toContainText(copyOf.errorTitle, { timeout: 30_000 });
	const bodyText = flat(await page.locator('body').innerText());
	expect(bodyText).toContain(copyOf.errorDescription);
	await expect(page.getByRole('button', { name: copyOf.retry, exact: true })).toBeVisible();
	// `showsError = isError && !hasItems` (`property-list.tsx:564`): the notice stands in for the whole list.
	await expect(page.locator('[data-property-row]')).toHaveCount(0);
	await expect(page.locator('[data-add-row]')).toHaveCount(0);

	const bootstrapReads = api.reads().filter((call) => call.path === BOOTSTRAP_ROUTE);
	expect(bootstrapReads.length).toBeGreaterThanOrEqual(1);
	for (const read of bootstrapReads) {
		expect(read.search).toContain('taskStatuses');
	}
	report('refused read', { reads: api.reads().map((call) => `${call.method} ${call.path}`) });
	const armedRead = armedRefusal('GET', BOOTSTRAP_ROUTE, 500);
	expect(shield.consoleErrors().filter((line) => armedRead(line))).toHaveLength(bootstrapReads.length);
	expect(consoleFindings(shield, [armedRead])).toEqual([]);
});

test('a person who may not write: the hint, no write control, and every row action listed disabled', async ({
	page,
	fixture,
	shield
}) => {
	// The fixture role without `ORG_TASK_SETTING` and not a team manager: `useTeamSettingsAccess` reports
	// `canWrite: false`, which is what puts the hint on the list and the `disabled` on every control.
	const { api, statuses } = await openStatusesPage(page, fixture, {}, { scenario: { manager: false } });

	await expect(page.getByText(copyOf.readOnlyHint).first()).toBeVisible({ timeout: 30_000 });
	for (const group of ['todo', 'inProgress', 'done', 'other']) {
		await expect(addRowOf(page, group)).toBeDisabled();
	}
	await expect(page.locator(`span[title="${copyOf.drag}"]`)).toHaveCount(0);
	await expect
		.poll(() => dragShapeOf(page, copyOf.drag))
		.toEqual([
			'null drag=0',
			'null drag=0',
			'null drag=0',
			'null drag=0',
			'null drag=0',
			'null drag=0',
			'null drag=0'
		]);

	for (const own of [statuses.queue, statuses.obsolete]) {
		await openRowMenu(page, own.id);
		await expect
			.poll(() => menuItems(page))
			.toEqual([
				{ text: copyOf.menuEdit, disabled: 'true' },
				{ text: copyOf.menuMoveUp, disabled: 'true' },
				{ text: copyOf.menuMoveDown, disabled: 'true' },
				{ text: copyOf.menuDelete, disabled: 'true' }
			]);
		// The menu repeats the hint as its first label (`property-row.tsx:93-98`).
		await expect(page.getByText(copyOf.readOnlyHint).last()).toBeVisible();
		await closeRowMenu(page);
	}

	// Measured (header finding 16): the header's own Add button carries no `disabled` (`statuses-settings-page.tsx:59-62`),
	// so this person can still open the create form; a save from it closes the editor and sends nothing
	// (`property-list.tsx:427-429`), and this test leaves it with Cancel.
	const headerAdd = page.getByRole('button', { name: copyOf.add, exact: true }).first();
	await expect(headerAdd).toBeEnabled();
	await headerAdd.click({ timeout: 15_000 });
	await expect(editorOf(page)).toBeVisible({ timeout: 15_000 });
	await page.getByRole('button', { name: copyOf.editorCancel, exact: true }).click({ timeout: 15_000 });
	await expect(editorOf(page)).toHaveCount(0, { timeout: 15_000 });

	expect(api.writes()).toEqual([]);
	await expect
		.poll(() => orderOf(page))
		.toEqual([
			`${SERVED_ROWS.todo} :: open`,
			`${SERVED_ROWS.todo} :: sprint queue`,
			`${SERVED_ROWS.todo} :: triage`,
			`${SERVED_ROWS.inProgress} :: in progress`,
			`${SERVED_ROWS.inProgress} :: blocked`,
			`${SERVED_ROWS.done} :: signed off`,
			`${SERVED_ROWS.other} :: obsolete`
		]);
	report('read only', { rows: (await rowsOf(page)).length, writes: api.writes().length });
	expect(consoleFindings(shield)).toEqual([]);
});
