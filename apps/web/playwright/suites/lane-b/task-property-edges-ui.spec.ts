import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Route } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, hardVisit, signInWithFixture, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * Settings › Team › the edges of the task property lists: the rows Gauzy built (`isSystem`), a read that answered 500,
 * the move a built-in status refuses, and the custom entry of the colour field — on
 * `/settings/team/{priorities,sizes,versions,issue-types,statuses}`.
 *
 * `suites/lane-b/task-property-settings-ui.spec.ts` pins the shared list of the four ungrouped kinds and names what it
 * left out (`:197-198`: "`isSystem` rows, whose delete and move the menu hides (`settings-task-properties.ts:529-544`);
 * the read-failure Notice (`property-list.tsx:569-581`)"). `suites/lane-a/task-statuses-settings-ui.spec.ts` leaves the
 * other two (`:156-157`: "The built-in-order collision `statusOrderOf` refuses (`settings-task-properties.ts:499-505`):
 * it shows up as a disabled menu item rather than a request, and this file's served list puts no row in that position.";
 * `:162-163`: "the custom-colour entry of the colour field"). This file is those leftovers: it copies their harness
 * shape (the store-backed list served on the mock origin, the `{kind, select, …}` copy reader, the console discipline)
 * and repeats nothing they already pin.
 *
 * Lane: **lane-b** (app `http://localhost:3032`, mock `127.0.0.1:3996`, control `3998`, `playwright/test-servers.ts`).
 * Every value asserted below was printed by a run first: the probes `D:\Coding\.tmp\s2-lane-b-propertyedges-probe1-1.log`
 * to `-probe6-1.log` (probe sources `D:\Coding\.tmp\probe-propertyedges\`), this file's own `[lane-b property edges]
 * MEASURE …` lines, and the two acceptance runs `D:\Coding\.tmp\s3-lane-b-propertyedges-1.log` and `-2.log`. Each claim
 * below names the run it came from.
 *
 * Eight cases were asked for; this file runs nine tests, because two of them need two served lists each and one carries
 * its own counterpart: the `isSystem` menu case covers four kinds in one test (`an isSystem row of each kind …`), the
 * protected-row case on statuses is its own test (`a built-in status …`), the refused-move case also proves the move the
 * same list *will* save, in the same test (`the move past the built-in status is refused …`), the refused read is one test
 * on priorities and a second test that loops sizes and issue types (`the read refused on …`, `the same refusal on sizes
 * and on issue types …`), the colour-field case splits in two because an accepted hex needs a row served with a colour
 * and an invalid hex needs one served `color: null` (`the custom colour …`, `an invalid hex …`), the refused save
 * (`a colour the API refuses (400) …`) and the held write (`a held write …`) are each one test.
 *
 * ## Where the browser sends these calls
 *
 * As in the lane-b settings spec `:29-47`: the served document's `NEXT_PUBLIC_GAUZY_API_SERVER_URL` is the mock origin,
 * so every read here was `GET <mock origin>/api/task-metadata/bootstrap?organizationId=…&organizationTeamId=…
 * &projectId=…&include=issueTypes,relatedIssueTypes,taskLabels,taskPriorities,taskSizes,taskStatuses,taskVersions`
 * (`-probe1-1.log` line 6) and every write `<mock origin>/api/<kind>/<id>` (`-probe5-1.log` line 14). The mock keeps no
 * priorities, sizes, versions or issue types (`cypress/support/mock-gauzy-server.mjs:686-692` answers those four as empty
 * pages), so this file answers the whole bootstrap bundle and every write itself, on the mock origin only, restating the
 * mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`) and answering `OPTIONS` with 204 before it records a call.
 * `route.fetch()` is never called. The list answer is always the **current store**, so a saved write changes what the next
 * read answers and a refusal changes nothing — the shape `suites/lane-a/task-statuses-settings-ui.spec.ts` calls
 * store-backed. (An early probe answered the `taskStatuses` section from a frozen array instead, and the saved reorder
 * then visibly reverted on the page — `-probe3-1.log` line 24. Serving the store is what the app's own re-read needs.)
 * The app's `app/api/**` twins are never touched: every `page.route` here is the predicate
 * `url.origin === MOCK_API_ORIGIN && <exact paths>`.
 *
 * ## Components driven (file:line)
 *
 * `core/components/settings/pages/task-properties/property-list.tsx:261` (the failure Notice `:564-581`, the rows
 * `:490-522`, `offeredOrderOf` `:307-322` and `moveTo` `:324-337`), `property-row.tsx:57-141` (the row menu) and
 * `:143-193` (the row, its drag handle `:163-175`), `property-editor-row.tsx:53-231`, `property-color-field.tsx:54-136`,
 * `property-preview.tsx:22-56`, `core/lib/utils/settings-task-properties.ts` (`isHexColor` `:76-80`, `sortsBelow`
 * `:456-465`, `statusOrderOf` `:480-517`, `isStatusOrderSaved` `:520-526`, `isMoveRefused` `:529-531`,
 * `KINDS_WITH_PROTECTED_ROWS` `:534-539`, `isDeletionRefused` `:541-544`), `core/hooks/settings/use-status-settings.ts`
 * (`canMove`, `move`), `core/hooks/tasks/use-reorder-task-status.ts:22-40`, and the per-kind hooks
 * `use-priority-settings.ts`, `use-size-settings.ts`, `use-version-settings.ts`, `use-issue-type-settings.ts`.
 *
 * ## Measured, with the source line that decides it
 *
 * 1. **An `isSystem` row of a protected kind keeps Edit and loses Delete.** `isDeletionRefused` is true exactly for
 *    `KINDS_WITH_PROTECTED_ROWS` = status, priority, size, issueType (`settings-task-properties.ts:534-544`), and the
 *    menu then renders no Delete item at all, only a `BUILT_IN_DELETE` label (`property-row.tsx:127-131`). Measured: on
 *    `/settings/team/priorities` and `/settings/team/sizes` the built-in row's menu is the single item `Edit` plus the
 *    line "Built in: it cannot be deleted" (`-probe1-1.log` line 8, `-probe3-1.log` line 27); on
 *    `/settings/team/issue-types` it is `Edit`, `Make default` plus that same line (`-probe4-1.log` line 9). A row of the
 *    same team on each of those lists carries `Delete` (`-probe1-1.log` line 12, `-probe3-1.log` line 28, `-probe4-1.log`
 *    line 10).
 * 2. **A version that is `isSystem` still offers Delete.** `version` is not in `KINDS_WITH_PROTECTED_ROWS`
 *    (`settings-task-properties.ts:534-539`), so `isDeletionRefused('version', row)` is false. Measured: its menu is
 *    `Edit`, `Delete` with no `BUILT_IN_DELETE` line (`-probe4-1.log` line 5). Measured, untagged: the set is what that
 *    code lists, and nothing in it, its types or its copy says versions were meant to be inside it.
 * 3. **No move item, and no `BUILT_IN_MOVE` line, on the four ungrouped pages.** `TaskPropertySettingsBody` passes
 *    `onDelete` only (`task-property-settings-body.tsx:47-53`), so `canReorder = Boolean(onMove)` is false
 *    (`property-row.tsx:69-71`), which hides both move items *and* the label a refused status row would get. Measured: no
 *    menu of those four pages carried a move item or that line (`-probe1-1.log`, `-probe3-1.log`, `-probe4-1.log`), and no
 *    row there carries a drag handle (`-probe1-1.log` line 5: `handle: false` on all three rows). Reorder exists on
 *    `/settings/team/statuses` only (`statuses-settings-page.tsx:65-74`).
 * 4. **On `/settings/team/statuses` a built-in row gets the other half of the copy.** `isMoveRefused('status', row)` is
 *    true for it (`settings-task-properties.ts:529-531`), so `offersMove` is false and the `BUILT_IN_MOVE` label stands in
 *    the two move items' place (`property-row.tsx:109-113`); `isDeleteRefused` is true too. Its menu is therefore the one
 *    item `Edit`, two labels, nothing else, and `canDrag` is false (`property-row.tsx:150,:163-175`) so the row renders no
 *    drag handle. Measured on `open` and `in-progress`: exactly that menu (`-probe3-1.log` lines 11,:14) and no handle on
 *    either, while every own row of the same list showed one (`-probe2-1.log` line 4).
 * 5. **The move the list will not save.** `canMoveUp`/`canMoveDown` come from `offeredOrderOf`, which returns `null` when
 *    `canMove(orderedIds)` refuses (`property-list.tsx:313-321`; on this page `canMove` is `isStatusOrderSaved(items,
 *    orderedIds)`, `use-status-settings.ts:79`), i.e. when `statusOrderOf` found no order Gauzy can write. This file
 *    serves `open` (built-in, stored `order: 0`) at the head of "To do" with the team's own `triage` (1) and `queue` (2)
 *    after it. A built-in keeps the order Gauzy stored and must sort strictly below an own row placed above it
 *    (`sortsBelow` `:456-465`), while the own rows are numbered from `Math.max(lastOwnOrder, above?.order ?? -1) + 1`
 *    (`:507`), so putting `triage` at the head would give it order 0 and demand that `open` sort below it with `0 > 0` →
 *    `null` (`:499-505`). Measured (`-probe3-1.log` line 12): `triage` offers `Move up` with `aria-disabled="true"` and
 *    `Move down` enabled — the row is neither first nor last of its group, so only the collision explains it — while
 *    `queue`'s `Move up` is enabled and its `Move down` disabled by its place at the group's end (`-probe3-1.log` line 13).
 *    The refused move sends nothing: `moveTo` returns before `onMove` when `offeredOrderOf` is `null`
 *    (`property-list.tsx:329-332`); measured as 0 writes with the rows unchanged (`-probe2-1.log` lines 11-13). A
 *    Playwright click on that item is refused by the browser itself (the item carries `data-disabled` +
 *    `aria-disabled="true"` + `data-disabled:pointer-events-none`): the click timed out on `element is not enabled`
 *    (`-probe2-1.log` line 10), which is why the case asserts the attribute instead of clicking.
 * 6. **One `PATCH /api/task-statuses/reorder` per saved move, carrying the team's own statuses only.** Measured body of
 *    `queue`'s Move up: `{"organizationId":"22222222-…","reorder":[{"queue":1},{"triage":2},{"blocked":11},
 *    {"signed-off":12},{"obsolete":13}],"tenantId":"11111111-…"}` — no built-in id at all, because Gauzy writes `order`
 *    `where isSystem = false` and one built-in in the request matches no row and answers 400 (#5359, the comment at
 *    `settings-task-properties.ts:466-478`); the own rows of the later groups are re-sent at the numbers that keep them
 *    below the built-in they follow (`blocked` must clear the built-in's stored 10) (`:507`) (`-probe3-1.log` line 17).
 *    After the answer the page re-reads the bootstrap (`use-reorder-task-status.ts:29-31` → `invalidateTaskStatusesData`)
 *    and the live region reads `queue moved to position 2.` (`moveTo` `:333-334` with `ANNOUNCE_MOVED`,
 *    `position: toIndex + 1`) (`-probe3-1.log` lines 19-20).
 * 7. **A read that answers 500 becomes the list's own failure Notice.** `showsError = isError && !hasItems`
 *    (`property-list.tsx:564`) renders the `Notice` with `ERROR_TITLE` for that kind, `ERROR_DESCRIPTION` and a
 *    `pages.unauthorized.TRY_AGAIN` button (`:569-581`). A 500 is not `isEndpointUnavailable()` (404/405/501 only,
 *    `core/services/client/api-error.service.ts:253-255`), so there is no legacy per-section fallback
 *    (`task-metadata-bootstrap.service.ts:41-48`) and the query fails; with `retry: 1` (`core/query/config/index.ts:31`)
 *    it is still pending while it retries, so the list is a skeleton first (`showsSkeleton` `property-list.tsx:565`) — the
 *    Notice is polled for, never assumed. Measured on priorities, sizes and issue types: the title branches "The priorities
 *    did not load", "The sizes did not load", "The issue types did not load", the description "Check your connection, then
 *    try again.", one Try again button, 0 rows, then the rows back after Try again with the Notice gone (`-probe4-1.log`
 *    lines 13-18,:22-24). The refused reads are never counted exactly — the retry is the client's, and the number of them
 *    varies (`-probe1-1.log` printed 1 refused read, `-probe4-1.log` 2).
 * 8. **The custom entry of the colour field.** Ten swatch buttons named by their own hex (`aria-label`, `aria-pressed`),
 *    then the `Custom color` button whose `aria-pressed` means "the colour is not one of the ten" (`isCustomColor`
 *    `property-color-field.tsx:28-34,:98-116`), then the hex input (`title` = `HEX_HINT`, `maxLength=7`, `:124-134`).
 *    Measured on a row served `#6366F1`: 10 swatches with `#6366F1` pressed, `Custom color` `aria-pressed="false"` with no
 *    `style`, the hex field `#6366F1` with no `aria-invalid` (`-probe1-1.log` line 17), the preview chip `--chip: oklch(from
 *    #6366F1 0.62 min(c * 3, 0.16) h);` (`-probe6-1.log` line 5). Typing `#7C3AED` (accepted by `isHexColor`
 *    `settings-task-properties.ts:76-80`): every swatch `aria-pressed="false"`, `Custom color` `aria-pressed="true"` with
 *    `style="background-color: rgb(124, 58, 237);"`, the hex field `#7C3AED` and still no `aria-invalid` (`-probe1-1.log`
 *    line 19, `-probe5-1.log` lines 9-12), and the chip repainted with it (`-probe6-1.log` line 6). The entry opens a
 *    popover holding a `react-colorful` picker (dynamic, `ssr: false`, `property-color-field.tsx:16-19,:117-120`): measured
 *    1 `.react-colorful` node with no input of its own (`-probe1-1.log` line 18). Escape closes that picker and leaves the
 *    editor open, exactly as its comment states ("Escape cancels the row, unless it was pressed in one of its pickers,
 *    which close themselves first", `property-editor-row.tsx:46-51`): at the instant of the key press the picker is still
 *    mounted and the editor is open (the `report` printed `{"pickers":1,"editors":1}`), the nodes then reach 0 and the
 *    editor stays 1 (`-s3-lane-b-propertyedges-diag-2.log` line 39, then the two assertions that poll for both).
 * 9. **The save carries the colour and nothing else.** `PUT /api/task-priorities/<id>` body
 *    `{"name":"high","color":"#7C3AED","tenantId":…,"organizationId":…}` — `propertyEditBodyOf`
 *    (`settings-task-properties.ts:399-410`) plus the pair the client's own `put` adds; no `organizationTeamId` for this
 *    kind (the sizes hook adds it, `use-edit-task-size.ts:20-23`; the priorities hook does not), no `icon`
 *    (`definedOrUndefined` `:384-389`) (`-probe5-1.log` line 14). Once the answer is in, the list is re-read once and the
 *    row's glyph is painted with the new colour, `color: oklch(from rgb(124, 58, 237) 0.62 min(3 * c, 0.16) h)`
 *    (`task-property-icon.tsx:118-122`, `task-data-color.ts:8-10`) (`-probe5-1.log` lines 16-17).
 * 10. **An invalid hex never reaches the draft.** `handleHexChange` keeps the typed text but calls `onChange` only for a
 *     valid hex (`property-color-field.tsx:69-78`), and empty counts as accepted (`:43-46,:131`). Measured on the row
 *     served `color: null`: the field opens empty with no `aria-invalid` and the chip unpainted (`-probe5-1.log` lines
 *     21-22,:27); after typing `#12XY8` the field holds `#12XY8` with `aria-invalid="true"`, `Custom color` stays
 *     `aria-pressed="false"`, no swatch is pressed and the chip is still unpainted (`-probe5-1.log` lines 23-27,
 *     `-probe6-1.log` line 8), and Save sent nothing (`-probe5-1.log` line 28). What it did do: the editor closed and the
 *     live region announced `no priority saved.` — `saveDraft` announces after `await update(…)`, and `update` had already
 *     returned because the draft changed nothing (`use-property-actions.ts:35-42`, `property-list.tsx:447-449`)
 *     (`-probe6-1.log` line 9, `-probe5-1.log` line 29). Measured, untagged: that early return is how the hook is written,
 *     and no comment, type, unit test or product copy in the app says the announcement should be skipped with it.
 * 11. **A colour the API refuses (400) is said in a toast, and the editor keeps what was typed.** `MutationErrorToaster`
 *     titles it `toasts.MUTATION_FAILED` with `toasts.REASONS.INVALID` (`mutation-error-toaster.tsx:36-60`), and
 *     `PropertyEditorRow.submit` leaves the row open with what was typed (`:123-135`). Measured: the app toast "That change
 *     was not saved / Some values were not accepted. Check them and try again." beside one dev-only `DEV … Copy details`
 *     toast; the hex field still held `#7C3AED`, its chip was still painted with it, the editor was open, and the edited
 *     row was *not* one of the `[data-property-row]` rows (2 of 3 left) (`-probe6-1.log` lines 14,:18-21). The dev run logs
 *     the refusal twice — `[HttpClient] HTTP Error: PUT /task-priorities/<id> 400 …` (`logger-adapter.service.ts:186-199`)
 *     and `Mutation failed: ApiError: <the message this file armed>` (`mutation-error-toaster.tsx:47-48`) (`-probe6-1.log`
 *     line 15) — and only those two lines, by their exact text, are excused.
 * 12. **A held write: the editor holds still while the call is unanswered.** With the first `PUT` held: the call is
 *     recorded with `answered: false`, `Save` and `Cancel` both carry `disabled` and `Save` carries the spinner
 *     (`property-editor-row.tsx:220-226` with `isSaving`), the row being edited is not a `[data-property-row]` (its editor
 *     took its place, `property-list.tsx:492-495`) so 2 rows remain, and the live region is empty (`-probe5-1.log` lines
 *     32-38). Released: the answer lands, the announcement is `high saved.`, 3 rows again with the row painted
 *     `rgb(15, 118, 110)`, the editor gone, and one `GET /api/task-metadata/bootstrap` after that answer (`-probe5-1.log`
 *     lines 39-43).
 *
 * ## Selector facts worth knowing before editing this file
 *
 * - A row whose editor is open is not a `[data-property-row]` while it is open (`property-list.tsx:492-495`); asking for
 *   one then waits out the whole test budget (`-probe3-1.log` and `-probe6-1.log` each died exactly that way).
 * - The menu's `BUILT_IN_MOVE` / `BUILT_IN_DELETE` lines are `DropdownMenuLabel`s: they sit inside `[role="menu"]` with no
 *   role of their own, so they are read from the menu, never from `[role="menuitem"]` (`-probe3-1.log` line 11).
 * - Base UI menus and popovers are document-level portals: close a menu with Escape and wait for 0 `menuitem` before the
 *   next row's trigger, and reopen it before each item.
 * - The shell puts its own `<output>` notice on these pages (the UTC / time-zone one), so the read-failure Notice is found
 *   by its own text, never by the `output` tag (`-probe4-1.log` line 13).
 * - A dev lane may mount each query twice (React Strict Mode): `-probe1-1.log` line 6 printed 2 identical bootstrap
 *   carries and `-probe4-1.log` line 7 printed 1. No case here counts reads.
 * - The preview chip renders its name title-cased through the `capitalize` class of `PROPERTY_PREVIEW_CHIP`
 *   (`property-list-recipes.ts:17-18`): measured `High` and `No Priority` for rows served named `high` and `no-priority`
 *   (`-probe6-1.log` lines 5,:7), so the chip is matched case-insensitively.
 * - The same `capitalize` trick sits on the row label (`KINDS_IN_TITLE_CASE` `property-row.tsx:27,:155`, the span at
 *   `:177`), so the row's *rendered* text is "Urgent" while its DOM text and its trigger's `aria-label` — built from
 *   `item.label` at `:86` — stay "urgent" / "Actions for urgent". Every label expectation here therefore reads
 *   `textContent`, never `innerText` (`-s3-lane-b-propertyedges-diag-1.log` line 32 caught the difference: expected
 *   "Actions for Urgent", received "Actions for urgent").
 * - A cold Turbopack compile of `/settings/team/versions` or `/settings/team/issue-types` costs seconds on a lane, so
 *   `test.use({ navigationTimeout })` below raises the *navigation* allowance; no assertion waits on a duration.
 *
 * ## What this file does not cover
 *
 * The ordinary add / edit / delete flows of the four ungrouped kinds and of statuses, the status type picker, the drag
 * routes, and the refused-reorder toast — `suites/lane-b/task-property-settings-ui.spec.ts` and
 * `suites/lane-a/task-statuses-settings-ui.spec.ts` already pin them. Also not covered: the *contents* of the
 * `react-colorful` popover (a third-party picker; this file proves only that the entry opens it); a `Make default` write on
 * an `isSystem` issue type (the item is measured as offered, never clicked); the drag route to the refused position (the
 * menu route is measured; the lane-a statuses spec owns the drag); which moves a row offers *after* a saved move (the
 * numbers that save hands back change the arithmetic, and no run measured the answer — the refused move is asserted on the
 * pristine list only); a row a person who may not write sees (`use-task-settings-access.ts`, the `readOnlyHint` branch of
 * `property-row.tsx:93-99`, owned by the lane-a statuses spec `:139-145`); icon upload; and Next's own `app/api/**` twins,
 * which a browser on a lane never reaches.
 */

/** The copy every expectation below is built from, read from the locale file the app itself renders. */
const LOCALE = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: Record<string, string>;
	pages: { about: { COPY_DETAILS: string }; unauthorized: { TRY_AGAIN: string } };
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string> };
	settings: { taskProperties: Record<string, string> & { groups: Record<string, string> } };
};
const PROPERTIES = LOCALE.settings.taskProperties;
const GROUPS = PROPERTIES.groups;

/**
 * `{kind, select, status {…} priority {…} … other {…}}` is how these keys carry one sentence for every kind; this
 * returns the branch for `value` (or the `other` branch) so no sentence below is typed by hand
 * (`suites/lane-b/task-property-settings-ui.spec.ts:227-263`).
 */
function selectBranch(template: string, value: string): string {
	const marker = 'select,';
	const start = template.indexOf(marker);
	if (start < 0) {
		throw new Error(`not a select template: ${template}`);
	}
	let index = start + marker.length;
	let fallback = '';
	while (index < template.length) {
		// next-intl writes a space after `select,` and after every `}`, so skip leading whitespace
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

const copyOf = {
	menuEdit: LOCALE.common.EDIT!,
	menuDelete: LOCALE.common.DELETE!,
	menuMakeDefault: PROPERTIES.MAKE_DEFAULT!,
	menuMoveUp: PROPERTIES.MOVE_UP!,
	menuMoveDown: PROPERTIES.MOVE_DOWN!,
	builtInMove: PROPERTIES.BUILT_IN_MOVE!,
	builtInDelete: PROPERTIES.BUILT_IN_DELETE!,
	drag: PROPERTIES.DRAG!,
	customColor: PROPERTIES.CUSTOM_COLOR!,
	hexHint: PROPERTIES.HEX_HINT!,
	rowActions: (name: string) => PROPERTIES.ROW_ACTIONS!.replace('{name}', name),
	editorCancel: LOCALE.common.CANCEL!,
	errorTitle: (kind: string) => selectBranch(PROPERTIES.ERROR_TITLE!, kind),
	errorDescription: PROPERTIES.ERROR_DESCRIPTION!,
	retry: LOCALE.pages.unauthorized.TRY_AGAIN!,
	namePlaceholder: (kind: string) => selectBranch(PROPERTIES.NAME_PLACEHOLDER!, kind),
	announceSaved: (name: string) => PROPERTIES.ANNOUNCE_SAVED!.replace('{name}', name),
	announceMoved: (name: string, position: number) =>
		PROPERTIES.ANNOUNCE_MOVED!.replace('{name}', name).replace('{position}', String(position)),
	groupTodo: GROUPS.todo!,
	groupInProgress: GROUPS.inProgress!,
	groupDone: GROUPS.done!,
	groupOther: GROUPS.other!,
	mutationFailed: LOCALE.toasts.MUTATION_FAILED!,
	reason: (key: string) => LOCALE.toasts.REASONS[key]!,
	copyDetails: LOCALE.pages.about.COPY_DETAILS!
};

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const BOOTSTRAP_ROUTE = '/api/task-metadata/bootstrap';
const STATUSES_API = 'task-statuses';
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

/** A cold compile of `/settings/team/versions` or `/settings/team/issue-types` is slow on a lane; no assertion waits on a duration. */
test.use({ navigationTimeout: 120_000 });

const report = (label: string, value: unknown) =>
	console.log(`[lane-b property edges] MEASURE ${label} ${JSON.stringify(value)}`);

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * The shell's own `GET /api/health` timing out on a loaded lane — `core/services/client/api/default.ts:42` logs it.
 * Shell noise like `SHELL_STORE_NOISE`: excused by this whole line, never by a shorter prefix.
 */
const HEALTH_CHECK_NOISE = 'Local API Health Check Error: AxiosError: timeout of 30000ms exceeded';

/**
 * The client's own HTTP error line for a refusal this file armed (`logger-adapter.service.ts:186-199`): the logged `url`
 * is the axios `config.url`, so a `GET` carries its whole query string and neither carries `/api`. A line is excused only
 * when it names the verb, the armed path **and** that status (`-probe4-1.log` line 16, `-probe6-1.log` line 15).
 */
const armedRefusal = (verb: string, path: string, status: number) => {
	const loggedPath = path.replace(/^\/api/, '');
	return (line: string) =>
		line.includes(`HTTP Error: ${verb} ${loggedPath}`) && line.includes(`${status} {statusCode: ${status}`);
};
/**
 * `mutation-error-toaster.tsx:47-48`, printed in dev for every failed mutation, with the message the stub answered.
 * Excused only by that exact message, never by the bare `Mutation failed:` prefix.
 */
const armedMutation = (message: string) => (line: string) => line.includes(`Mutation failed: ApiError: ${message}`);

const consoleFindings = (shield: Shield, expected: Array<(line: string) => boolean> = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(HEALTH_CHECK_NOISE))
		.filter((line) => !expected.some((isArmed) => isArmed(line)));

const toastsOf = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasText: /\S/ });
/** The app's own toasts, kept apart from the dev-only `DEV … failed … Copy details` toast (`dev-error-toaster.tsx`). */
const appToastsOf = (page: Page) => toastsOf(page).filter({ hasNotText: copyOf.copyDetails });
/** The pointer must rest away from the toaster before a toast is waited out: a hover pauses every countdown. */
const parkPointer = (page: Page) => page.mouse.move(2, 2);

const UUID_LEAD = {
	priority: '7f4c0000',
	size: '7f4d0000',
	version: '7f4e0000',
	issueType: '7f4f0000',
	status: '7f1a0000'
};
/** A uuid the client's `uuIdSchema` accepts (`core/types/schemas/common/base.schema.ts:7`). */
const uuid = (kind: keyof typeof UUID_LEAD, index: number) =>
	`${UUID_LEAD[kind]}-0000-4000-8000-${String(index).padStart(12, '0')}`;

/**
 * A row as this file serves it. Priorities, sizes and versions pass a `.strict()` zod schema on the way in
 * (`task-metadata-bootstrap.service.ts:62-95`, `task-priority.schema.ts:10-24`, `task-size.schema.ts:8-22`,
 * `task-version.schema.ts:8-21`), so only keys those schemas know are served; statuses add `order` and the workflow flags
 * (`task-status.schema.ts:14-41`), and the issueTypes section is handed through unvalidated (`:85-86`).
 */
type ServedRow = {
	id: string;
	name: string;
	value: string;
	color: string | null;
	icon: string | null;
	order?: number | null;
	isSystem: boolean;
	isDefault?: boolean;
	isTodo?: boolean;
	isInProgress?: boolean;
	isDone?: boolean;
	tenantId: string;
	organizationId: string;
	organizationTeamId: string;
};

type Refusal = { status: number; message: string };

type KindKey = 'priority' | 'size' | 'version' | 'issueType' | 'status';

interface KindSpec {
	kind: KindKey;
	/** The `kind` value the `{kind, select, …}` copy is asked for. */
	branch: string;
	path: string;
	/** The path under the mock origin the browser writes to. */
	api: string;
	/** The bootstrap section this list is served in. */
	section: string;
}

const KINDS: Record<KindKey, KindSpec> = {
	priority: {
		kind: 'priority',
		branch: 'priority',
		path: '/settings/team/priorities',
		api: 'task-priorities',
		section: 'taskPriorities'
	},
	size: { kind: 'size', branch: 'size', path: '/settings/team/sizes', api: 'task-sizes', section: 'taskSizes' },
	version: {
		kind: 'version',
		branch: 'version',
		path: '/settings/team/versions',
		api: 'task-versions',
		section: 'taskVersions'
	},
	issueType: {
		kind: 'issueType',
		branch: 'issueType',
		path: '/settings/team/issue-types',
		api: 'issue-types',
		section: 'issueTypes'
	},
	status: {
		kind: 'status',
		branch: 'status',
		path: '/settings/team/statuses',
		api: STATUSES_API,
		section: 'taskStatuses'
	}
};

interface ServedScript {
	kind: KindKey;
	items: ServedRow[];
	/** What the `taskStatuses` section answers on a page that is not the statuses page. */
	statuses: ServedRow[];
	readRefusal?: Refusal;
	editRefusal?: Refusal;
	/** Hold the first write of this method until `releaseWrites()` is called. */
	holdFirstWriteOf?: string;
}

type ServedCall = {
	method: string;
	path: string;
	search: string;
	body: Record<string, unknown> | null;
	/** false while the answer is being held (`holdFirstWriteOf`). */
	answered: boolean;
};

type PropertyApi = {
	calls: ServedCall[];
	reads: () => ServedCall[];
	writes: () => ServedCall[];
	writesOf: (method: string) => ServedCall[];
	/** Answer the reads again (the Try again case). */
	allowReads: () => void;
	releaseWrites: () => void;
};

/**
 * This file's stand-in for the task-properties API, on the mock origin only: the whole bootstrap bundle and every write
 * are answered here. The list answer is always the current store, so a saved write changes what the next read answers and
 * a refusal changes nothing. `route.fetch()` is never called.
 */
async function servePropertyList(page: Page, script: ServedScript): Promise<PropertyApi> {
	const spec = KINDS[script.kind];
	const store = { items: [...script.items] };
	const calls: ServedCall[] = [];
	const state = { editRefusal: script.editRefusal };
	let refuseReads = Boolean(script.readRefusal);

	const base = `/api/${spec.api}`;
	let releaseFirstWrite: (() => void) | null = null;
	const firstWriteGate = script.holdFirstWriteOf
		? new Promise<void>((resolve) => {
				releaseFirstWrite = resolve;
			})
		: null;
	const held = new Set<string>();

	const matcher = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		(url.pathname === BOOTSTRAP_ROUTE ||
			url.pathname === REORDER_ROUTE ||
			url.pathname === base ||
			url.pathname.startsWith(`${base}/`));

	const answer = (route: Route, status: number, body?: unknown) =>
		route.fulfill({
			status,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: body === undefined ? '' : JSON.stringify(body)
		});
	const pagination = <T>(items: T[]) => ({ items, total: items.length });
	const sectionOf = (section: string) => (section === spec.section ? store.items : []);

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		// The mock answers a preflight itself (`mock-gauzy-server.mjs:1097-1101`); this route replaced it, so it must.
		if (method === 'OPTIONS') return answer(route, 204);

		const post = request.postData();
		const body = post ? (JSON.parse(post) as Record<string, unknown>) : null;
		const call: ServedCall = {
			method,
			path: url.pathname,
			search: decodeURIComponent(url.search),
			body,
			answered: true
		};
		calls.push(call);

		const holdFirstWrite = async () => {
			if (!firstWriteGate || script.holdFirstWriteOf !== method || held.has(method)) return;
			held.add(method);
			call.answered = false;
			await firstWriteGate;
			call.answered = true;
		};

		if (url.pathname === BOOTSTRAP_ROUTE && method === 'GET') {
			if (refuseReads && script.readRefusal) return answer(route, script.readRefusal.status, script.readRefusal);
			return answer(route, 200, {
				taskStatuses: pagination(spec.section === 'taskStatuses' ? store.items : script.statuses),
				taskPriorities: pagination(sectionOf('taskPriorities')),
				taskSizes: pagination(sectionOf('taskSizes')),
				taskLabels: pagination([]),
				taskVersions: pagination(sectionOf('taskVersions')),
				issueTypes: pagination(sectionOf('issueTypes')),
				relatedIssueTypes: pagination([])
			});
		}

		const id = url.pathname.startsWith(`${base}/`) ? decodeURIComponent(url.pathname.slice(base.length + 1)) : '';

		if (url.pathname === REORDER_ROUTE && method === 'PATCH') {
			await holdFirstWrite();
			const entries = (body?.reorder as Array<{ id: string; order: number }>) ?? [];
			const orderById = new Map(entries.map((entry) => [entry.id, entry.order]));
			store.items = store.items.map((item) =>
				orderById.has(item.id) ? { ...item, order: orderById.get(item.id) as number } : item
			);
			// `taskStatusOrderAPIResponseSchema` (`task-status.schema.ts:74-82`) is what the client validates here.
			return answer(route, 200, { success: true, list: entries.map((entry) => ({ ...entry })) });
		}

		if (id && method === 'PUT') {
			if (state.editRefusal) return answer(route, state.editRefusal.status, state.editRefusal);
			await holdFirstWrite();
			const current = store.items.find((item) => item.id === id);
			if (!current) return answer(route, 404, { statusCode: 404, message: `no ${spec.kind} ${id} here` });
			const merged = { ...current, ...(body as object) } as ServedRow;
			store.items = store.items.map((item) => (item.id === id ? merged : item));
			// `editTaskPriority`/`editTaskSize` validate the answer as the row (`task-priority.service.ts:60-81`);
			// `editTaskStatus` validates Gauzy's TypeORM answer instead (`task-status.service.ts:96-101`).
			if (spec.api === STATUSES_API) return answer(route, 200, { generatedMaps: [], raw: [], affected: 1 });
			return answer(route, 200, merged);
		}

		return answer(route, 599, {
			statusCode: 599,
			message: `this file served no answer for ${method} ${url.pathname}`
		});
	});

	return {
		calls,
		reads: () => calls.filter((call) => call.method === 'GET'),
		writes: () => calls.filter((call) => call.method !== 'GET'),
		writesOf: (method) => calls.filter((call) => call.method === method),
		allowReads: () => {
			refuseReads = false;
		},
		releaseWrites: () => releaseFirstWrite?.()
	};
}

/** The mock's own two built-in statuses (`mock-gauzy-server.mjs:157-181`), restated in the bootstrap this file serves. */
function mockStatuses(fixture: BootstrapFixture): ServedRow[] {
	const { ids } = fixture;
	return [
		{
			id: ids.todoStatus,
			name: 'open',
			value: 'open',
			color: '#94a3b8',
			icon: null,
			order: 1,
			isSystem: true,
			isDefault: true,
			isTodo: true,
			tenantId: ids.tenantA,
			organizationId: ids.organizationA,
			organizationTeamId: ids.teamA
		},
		{
			id: ids.inProgressStatus,
			name: 'in-progress',
			value: 'in-progress',
			color: '#6366f1',
			icon: null,
			order: 2,
			isSystem: true,
			isInProgress: true,
			tenantId: ids.tenantA,
			organizationId: ids.organizationA,
			organizationTeamId: ids.teamA
		}
	];
}

const rowOf = (
	fixture: BootstrapFixture,
	kind: keyof typeof UUID_LEAD,
	index: number,
	name: string,
	extra: Partial<ServedRow> = {}
): ServedRow => ({
	id: uuid(kind, index),
	name,
	value: name,
	color: null,
	icon: null,
	isSystem: false,
	tenantId: fixture.ids.tenantA,
	organizationId: fixture.ids.organizationA,
	organizationTeamId: fixture.ids.teamA,
	...extra
});

/** One `isSystem` row and two of the team's own, per kind; the built-in row first, so it is the first row listed. */
function listFixture(fixture: BootstrapFixture, kind: KindKey): ServedRow[] {
	const rowsByKind: Record<KindKey, ServedRow[]> = {
		priority: [
			rowOf(fixture, 'priority', 1, 'urgent', { color: '#EF4444', isSystem: true }),
			rowOf(fixture, 'priority', 2, 'high', { color: '#6366F1' }),
			rowOf(fixture, 'priority', 3, 'no-priority')
		],
		size: [
			rowOf(fixture, 'size', 1, 'extra-small', { color: '#22C55E', isSystem: true }),
			rowOf(fixture, 'size', 2, 'large'),
			rowOf(fixture, 'size', 3, 'no-size')
		],
		version: [
			rowOf(fixture, 'version', 1, '2.4', { color: '#FFFFFF', isSystem: true }),
			rowOf(fixture, 'version', 2, '3.0-beta', { color: '#0EA5E9' }),
			rowOf(fixture, 'version', 3, 'Legacy one')
		],
		issueType: [
			rowOf(fixture, 'issueType', 1, 'bug', { color: '#923535', isDefault: true }),
			rowOf(fixture, 'issueType', 2, 'security-scan', { isSystem: true }),
			rowOf(fixture, 'issueType', 3, 'story', { color: '#22C55E' })
		],
		status: []
	};
	return rowsByKind[kind];
}

/**
 * The statuses list this file serves, in the order each group's `order` puts it (`statusItemsOf`
 * `settings-task-properties.ts:165-168`): the built-in `open` is stored with `order: 0` at the head of "To do" and the
 * team's own `triage` (1) and `queue` (2) follow, so the only move Gauzy cannot write is the one that would pass `open`;
 * the In progress built-in keeps `order: 10`, high enough for the own row under it to move up past it.
 */
function statusFixture(fixture: BootstrapFixture) {
	const open = rowOf(fixture, 'status', 1, 'open', {
		id: fixture.ids.todoStatus,
		name: 'open',
		value: 'open',
		color: '#94a3b8',
		order: 0,
		isSystem: true,
		isDefault: true,
		isTodo: true
	});
	const triage = rowOf(fixture, 'status', 2, 'triage', { color: '#0EA5E9', order: 1, isTodo: true });
	const queue = rowOf(fixture, 'status', 3, 'queue', { color: '#6366F1', order: 2, isTodo: true });
	const doing = rowOf(fixture, 'status', 4, 'in-progress', {
		id: fixture.ids.inProgressStatus,
		name: 'in-progress',
		value: 'in-progress',
		color: '#6366f1',
		order: 10,
		isSystem: true,
		isInProgress: true
	});
	const blocked = rowOf(fixture, 'status', 5, 'blocked', { color: '#EF4444', order: 11, isInProgress: true });
	const signed = rowOf(fixture, 'status', 6, 'signed-off', { color: '#22C55E', order: 12, isDone: true });
	const obsolete = rowOf(fixture, 'status', 7, 'obsolete', { order: 13 });
	return {
		all: [open, triage, queue, doing, blocked, signed, obsolete],
		open,
		triage,
		queue,
		doing,
		blocked,
		signed,
		obsolete
	};
}

/** Routes first, cookies second, navigation last (`helpers.ts:417-451`, the order the settings spec `:550-553` uses). */
const openPropertyPage = async (page: Page, fixture: BootstrapFixture, spec: KindSpec): Promise<void> => {
	await signInWithFixture(page.context(), fixture);
	await hardVisit(page, spec.path);
};

const serveAndOpen = async (
	page: Page,
	fixture: BootstrapFixture,
	kind: KindKey,
	items: ServedRow[],
	patch: Partial<ServedScript> = {}
): Promise<PropertyApi> => {
	const api = await servePropertyList(page, { kind, items, statuses: mockStatuses(fixture), ...patch });
	await openPropertyPage(page, fixture, KINDS[kind]);
	await expect(page.locator('[data-property-row]')).toHaveCount(items.length, { timeout: 60_000 });
	return api;
};

const rowLocator = (page: Page, id: string): Locator => page.locator(`[data-property-row="${id}"]`);
const rowIconOf = (page: Page, id: string) => rowLocator(page, id).locator('[data-slot="task-property-icon"]');
const rowHandleOf = (page: Page, id: string) => rowLocator(page, id).locator(`span[title="${copyOf.drag}"]`);
const announceOf = (page: Page) => page.locator('p[aria-live="polite"]').last();
const editorOf = (page: Page, kind: KindKey) =>
	page
		.locator('form')
		.filter({ has: page.locator(`input[placeholder="${copyOf.namePlaceholder(KINDS[kind].branch)}"]`) });
const hexFieldOf = (page: Page, kind: KindKey) => editorOf(page, kind).locator('input[title]').first();
const swatchesOf = (page: Page, kind: KindKey) => editorOf(page, kind).locator('button[aria-label^="#"]');
const swatchOf = (page: Page, kind: KindKey, hex: string) =>
	editorOf(page, kind).getByRole('button', { name: hex, exact: true });
const customColorOf = (page: Page, kind: KindKey) =>
	editorOf(page, kind).getByRole('button', { name: copyOf.customColor });
const previewChipOf = (page: Page, kind: KindKey) => editorOf(page, kind).locator('span.chip-3d');
const saveButtonOf = (page: Page, kind: KindKey) => editorOf(page, kind).locator('button[type="submit"]');
const cancelButtonOf = (page: Page, kind: KindKey) =>
	editorOf(page, kind).getByRole('button', { name: copyOf.editorCancel });
const menuItemsOf = (page: Page) => page.locator('[role="menuitem"]');
const menuItemOf = (page: Page, text: string) => menuItemsOf(page).filter({ hasText: text }).first();
/** The names this file's rows are printed with: `propertyLabelOf` turns a stored dash into a space (`settings-task-properties.ts:92-95`). */
const printed = (name: string) => name.split('-').join(' ');

/**
 * The label as the DOM holds it. `innerText` would read the rendering instead: `KINDS_IN_TITLE_CASE`
 * (`property-row.tsx:27,:155`) puts a `capitalize` class on the label span (`:177`), so `urgent` renders "Urgent" there
 * while the trigger's `aria-label` is built from `item.label` (`:86`) and stays "Actions for urgent"
 * (`-s3-lane-b-propertyedges-diag-1.log` line 32: expected "Actions for Urgent", received "Actions for urgent").
 */
const rowLabelOf = async (page: Page, id: string): Promise<string> =>
	(await rowLocator(page, id).locator('span.min-w-0').textContent()) ?? '';

const openRowMenu = async (page: Page, id: string): Promise<void> => {
	const trigger = rowLocator(page, id).locator('[data-row-menu]');
	await expect(trigger).toBeVisible({ timeout: 15_000 });
	await expect(trigger).toHaveAttribute('aria-label', copyOf.rowActions((await rowLabelOf(page, id)).trim()));
	await trigger.click({ timeout: 15_000 });
	await expect(menuItemsOf(page).first()).toBeVisible({ timeout: 15_000 });
};

/** Base UI menus are document-level portals: they hold pointer events until they are closed. */
const closeRowMenu = async (page: Page): Promise<void> => {
	await page.keyboard.press('Escape');
	await expect(menuItemsOf(page)).toHaveCount(0, { timeout: 15_000 });
};

const openEditorOf = async (page: Page, id: string, kind: KindKey): Promise<void> => {
	await openRowMenu(page, id);
	await menuItemOf(page, copyOf.menuEdit).click({ timeout: 15_000 });
	await expect(editorOf(page, kind)).toBeVisible({ timeout: 15_000 });
};

const menuItems = async (page: Page): Promise<Array<{ text: string; disabled: boolean }>> =>
	menuItemsOf(page).evaluateAll((nodes) =>
		nodes.map((node) => ({
			text: (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
			disabled: node.getAttribute('aria-disabled') === 'true'
		}))
	);

/** The menu's own text, read as the DOM holds it (the copy lines are `DropdownMenuLabel`s, not items). */
const menuText = async (page: Page): Promise<string> => (await page.locator('[role="menu"]').textContent()) ?? '';

/** Each row as `group heading :: printed label`; the group is the heading of the surface the list draws it under. */
const rowsShape = async (page: Page): Promise<string[]> =>
	page.$$eval('[data-property-row]', (nodes) =>
		nodes.map((node) => {
			const surface = node.closest('div.rounded-xl');
			const group = (surface?.querySelector('h2')?.textContent ?? '(no group)').trim();
			const label = (node.querySelector('span.min-w-0')?.textContent ?? '').trim();
			return `${group} :: ${label}`;
		})
	);

/** The swatches of an open editor that read as pressed, by their hex label. */
const pressedSwatches = async (page: Page, kind: KindKey): Promise<string[]> =>
	swatchesOf(page, kind).evaluateAll((nodes) =>
		nodes
			.filter((node) => node.getAttribute('aria-pressed') === 'true')
			.map((node) => node.getAttribute('aria-label') ?? '')
	);

/** `dataColorHue`'s `oklch(from <hex> …)` reaches Chrome's `style` attribute as `rgb(…)` on a glyph (settings spec `:362-370`). */
const rgbOf = (hex: string): string => {
	const digits = hex.replace('#', '');
	const parts = [0, 2, 4].map((index) => parseInt(digits.slice(index, index + 2), 16));
	return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
};
const glyphStyle = (hex: string): string => `color: oklch(from ${rgbOf(hex)} 0.62 min(3 * c, 0.16) h);`;
/** The preview chip carries `--chip`, where Chrome keeps the hex as written (`task-data-color.ts:8-10,:22-25`). */
const chipStyle = (hex: string): string => `--chip: oklch(from ${hex} 0.62 min(c * 3, 0.16) h);`;

const CUSTOM_HEX = '#7C3AED';
const NOT_A_HEX = '#12XY8';
/** A refusal message this file invents: it is what the stub answers, never copy the page shows. */
const COLOUR_REFUSAL = { status: 400, message: 'that colour is not accepted' };

test('an isSystem row of each kind: which menu items the list keeps and which it hides', async ({
	page,
	fixture,
	shield
}) => {
	// priority, size and issueType are in `KINDS_WITH_PROTECTED_ROWS` (`settings-task-properties.ts:534-539`) and lose the
	// Delete item for a built-in row; version is not in it and keeps it (finding 2). No kind here offers a move (finding 3).
	const cases: Array<{
		kind: KindKey;
		builtInItems: Array<{ text: string; disabled: boolean }>;
		builtInDeleteShown: boolean;
	}> = [
		{ kind: 'priority', builtInItems: [{ text: copyOf.menuEdit, disabled: false }], builtInDeleteShown: true },
		{ kind: 'size', builtInItems: [{ text: copyOf.menuEdit, disabled: false }], builtInDeleteShown: true },
		{
			kind: 'issueType',
			builtInItems: [
				{ text: copyOf.menuEdit, disabled: false },
				{ text: copyOf.menuMakeDefault, disabled: false }
			],
			builtInDeleteShown: true
		},
		{
			kind: 'version',
			builtInItems: [
				{ text: copyOf.menuEdit, disabled: false },
				{ text: copyOf.menuDelete, disabled: false }
			],
			builtInDeleteShown: false
		}
	];

	for (const testCase of cases) {
		const rows = listFixture(fixture, testCase.kind);
		await serveAndOpen(page, fixture, testCase.kind, rows);
		const builtIn = rows.find((row) => row.isSystem) as ServedRow;
		const own = rows.find((row) => !row.isSystem && !row.isDefault) as ServedRow;
		const ownItems =
			testCase.kind === 'issueType'
				? [
						{ text: copyOf.menuEdit, disabled: false },
						{ text: copyOf.menuMakeDefault, disabled: false },
						{ text: copyOf.menuDelete, disabled: false }
					]
				: [
						{ text: copyOf.menuEdit, disabled: false },
						{ text: copyOf.menuDelete, disabled: false }
					];

		report(`${testCase.kind} built-in label vs trigger aria-label`, {
			domLabel: await rowLabelOf(page, builtIn.id),
			renderedLabel: await rowLocator(page, builtIn.id).locator('span.min-w-0').innerText(),
			ariaLabel: await rowLocator(page, builtIn.id).locator('[data-row-menu]').getAttribute('aria-label')
		});
		await openRowMenu(page, builtIn.id);
		report(`${testCase.kind} built-in ${printed(builtIn.name)} menu`, {
			items: await menuItems(page),
			text: await menuText(page)
		});
		await expect.poll(() => menuItems(page)).toEqual(testCase.builtInItems);
		if (testCase.builtInDeleteShown) {
			await expect.poll(() => menuText(page)).toContain(copyOf.builtInDelete);
		} else {
			await expect.poll(() => menuText(page)).not.toContain(copyOf.builtInDelete);
		}
		// no move item and no `BUILT_IN_MOVE` line either: `TaskPropertySettingsBody` hands these pages no `onMove`
		await expect.poll(() => menuText(page)).not.toContain(copyOf.builtInMove);
		await closeRowMenu(page);

		await openRowMenu(page, own.id);
		await expect.poll(() => menuItems(page)).toEqual(ownItems);
		await closeRowMenu(page);

		// and no drag handle on that page either (`property-row.tsx:150,:163-175`)
		await expect(page.locator(`span[title="${copyOf.drag}"]`)).toHaveCount(0);
	}

	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

const statusRowsShape = (
	statuses: ReturnType<typeof statusFixture>,
	order: Array<'open' | 'triage' | 'queue' | 'doing' | 'blocked' | 'signed' | 'obsolete'>
) => {
	const groupOf = {
		open: copyOf.groupTodo,
		triage: copyOf.groupTodo,
		queue: copyOf.groupTodo,
		doing: copyOf.groupInProgress,
		blocked: copyOf.groupInProgress,
		signed: copyOf.groupDone,
		obsolete: copyOf.groupOther
	};
	return order.map((key) => `${groupOf[key]} :: ${printed(statuses[key].name)}`);
};

test('a built-in status: the two Built in lines in place of a move item and a Delete item', async ({
	page,
	fixture,
	shield
}) => {
	const statuses = statusFixture(fixture);
	const api = await serveAndOpen(page, fixture, 'status', statuses.all);

	// each group is drawn under its own heading (`property-list.tsx:596-603`), and `statusItemsOf` sorts a group by `order`
	await expect
		.poll(() => rowsShape(page))
		.toEqual(statusRowsShape(statuses, ['open', 'triage', 'queue', 'doing', 'blocked', 'signed', 'obsolete']));

	for (const builtIn of [statuses.open, statuses.doing]) {
		await openRowMenu(page, builtIn.id);
		report(`built-in ${printed(builtIn.name)} menu`, { items: await menuItems(page), text: await menuText(page) });
		// `offersMove` false and `isDeleteRefused` true → one item and two labels (`property-row.tsx:109-131`)
		await expect.poll(() => menuItems(page)).toEqual([{ text: copyOf.menuEdit, disabled: false }]);
		await expect.poll(() => menuText(page)).toContain(copyOf.builtInMove);
		await expect.poll(() => menuText(page)).toContain(copyOf.builtInDelete);
		await closeRowMenu(page);
	}

	// a built-in row still takes a drop but never drags: `canDrag` is false for it (`property-row.tsx:150,:163-175`)
	for (const builtIn of [statuses.open, statuses.doing]) {
		await expect(rowHandleOf(page, builtIn.id)).toHaveCount(0);
	}
	for (const own of [statuses.triage, statuses.queue, statuses.blocked, statuses.signed, statuses.obsolete]) {
		await expect(rowHandleOf(page, own.id)).toHaveCount(1);
	}

	report(
		'reads',
		api.reads().map((call) => `${call.method} ${call.path}`)
	);
	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

test('the move past the built-in status is refused: the disabled item and no request; the saved one sends one PATCH', async ({
	page,
	fixture,
	shield
}) => {
	const statuses = statusFixture(fixture);
	const api = await serveAndOpen(page, fixture, 'status', statuses.all);
	const asServed = statusRowsShape(statuses, ['open', 'triage', 'queue', 'doing', 'blocked', 'signed', 'obsolete']);
	await expect.poll(() => rowsShape(page)).toEqual(asServed);

	// The refused move, on the list as served: `triage` is neither first nor last of its group, so the disabled `Move up`
	// is the collision and the enabled `Move down` beside it proves it (finding 5).
	await openRowMenu(page, statuses.triage.id);
	report('triage menu', await menuItems(page));
	await expect
		.poll(() => menuItems(page))
		.toEqual([
			{ text: copyOf.menuEdit, disabled: false },
			{ text: copyOf.menuMoveUp, disabled: true },
			{ text: copyOf.menuMoveDown, disabled: false },
			{ text: copyOf.menuDelete, disabled: false }
		]);
	// Playwright cannot click it at all (the item is `data-disabled` with its pointer events off), so the proof is the
	// attribute plus the call log: `moveTo` returns before `onMove` when `offeredOrderOf` is `null`.
	await expect(menuItemOf(page, copyOf.menuMoveUp)).toHaveAttribute('aria-disabled', 'true');
	await closeRowMenu(page);
	await page.waitForTimeout(2_000); // quiet window: proves that menu caused no reorder request
	expect(api.writesOf('PATCH')).toEqual([]);
	await expect.poll(() => rowsShape(page)).toEqual(asServed);

	// The saved move: `queue` is the group's last row, so `Move up` is offered and enabled and `Move down` is out of place.
	await openRowMenu(page, statuses.queue.id);
	await expect
		.poll(() => menuItems(page))
		.toEqual([
			{ text: copyOf.menuEdit, disabled: false },
			{ text: copyOf.menuMoveUp, disabled: false },
			{ text: copyOf.menuMoveDown, disabled: true },
			{ text: copyOf.menuDelete, disabled: false }
		]);
	await menuItemOf(page, copyOf.menuMoveUp).click({ timeout: 15_000 });
	await expect(menuItemsOf(page)).toHaveCount(0, { timeout: 15_000 });
	await expect.poll(() => api.writesOf('PATCH').length, { timeout: 30_000 }).toBe(1);
	const patch = api.writesOf('PATCH')[0];
	report('reorder body', { path: patch.path, body: patch.body });

	// The team's own statuses only (finding 6); the built-ins keep the orders Gauzy stored for them.
	const entries = (patch.body?.reorder as Array<{ id: string; order: number }>).map(
		(entry) => `${entry.id} ${entry.order}`
	);
	expect(entries).toEqual([
		`${statuses.queue.id} 1`,
		`${statuses.triage.id} 2`,
		`${statuses.blocked.id} 11`,
		`${statuses.signed.id} 12`,
		`${statuses.obsolete.id} 13`
	]);
	expect(JSON.stringify(patch.body)).not.toContain(statuses.open.id);
	expect(JSON.stringify(patch.body)).not.toContain(statuses.doing.id);
	expect(patch.body?.organizationId).toBe(fixture.ids.organizationA);
	expect(patch.body?.tenantId).toBe(fixture.ids.tenantA);
	expect(patch.path).toBe(REORDER_ROUTE);

	// the answer is followed by the re-read, and the group is listed in the saved order
	await expect
		.poll(() => api.calls.slice(api.calls.indexOf(patch) + 1).some((call) => call.method === 'GET'), {
			timeout: 60_000
		})
		.toBe(true);
	report('rows after the saved move', await rowsShape(page));
	await expect(announceOf(page)).toHaveText(copyOf.announceMoved(printed(statuses.queue.name), 2));
	await expect
		.poll(() => rowsShape(page))
		.toEqual(statusRowsShape(statuses, ['open', 'queue', 'triage', 'doing', 'blocked', 'signed', 'obsolete']));

	report(
		'calls',
		api.calls.map((call) => `${call.method} ${call.path}`)
	);
	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

/** The list's own failure Notice on one kind's page, then the rows back once Try again is answered (`-probe4-1.log`). */
const refusedReadCase = async (page: Page, fixture: BootstrapFixture, shield: Shield, kind: KindKey): Promise<void> => {
	const spec = KINDS[kind];
	const rows = listFixture(fixture, kind);
	const api = await servePropertyList(page, {
		kind,
		items: rows,
		statuses: mockStatuses(fixture),
		readRefusal: { status: 500, message: `the ${spec.branch} read did not answer` }
	});
	await openPropertyPage(page, fixture, spec);

	// at least one read was asked for (the client retries a failed read once on its own, `core/query/config/index.ts:31`,
	// and a dev lane mounts the query twice), and while it does the list is a skeleton, not a Notice
	await expect.poll(() => api.reads().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
	// the Notice waits for those retries, so it is polled for; 45 s covers the armed read plus the client's own retry
	await expect(page.getByText(copyOf.errorTitle(spec.branch), { exact: true })).toBeVisible({ timeout: 45_000 });
	report(`${kind} notice`, await page.getByText(copyOf.errorTitle(spec.branch), { exact: true }).innerText());
	await expect(page.getByText(copyOf.errorTitle(spec.branch), { exact: true })).toHaveCount(1);
	await expect(page.getByText(copyOf.errorDescription, { exact: true })).toHaveCount(1);
	await expect(page.getByRole('button', { name: copyOf.retry, exact: true })).toHaveCount(1);
	await expect(page.locator('[data-property-row]')).toHaveCount(0);
	report(
		`${kind} refused reads`,
		api.reads().map((call) => `${call.method} ${call.path}`)
	);
	report(`${kind} console`, consoleFindings(shield, [armedRefusal('GET', BOOTSTRAP_ROUTE, 500)]));
	expect(consoleFindings(shield, [armedRefusal('GET', BOOTSTRAP_ROUTE, 500)])).toEqual([]);

	api.allowReads();
	await page.getByRole('button', { name: copyOf.retry, exact: true }).click({ timeout: 15_000 });
	report(
		`${kind} labels after Try again`,
		await page.$$eval('[data-property-row] span.min-w-0', (nodes) =>
			nodes.map((node) => node.textContent?.trim() ?? '')
		)
	);
	await expect(page.locator('[data-property-row] span.min-w-0')).toHaveText(
		rows.map((row) => printed(row.name)),
		{
			timeout: 60_000
		}
	);
	await expect(page.getByText(copyOf.errorTitle(spec.branch), { exact: true })).toHaveCount(0);
};

test('the read refused on /settings/team/priorities: the Notice, Try again, and the rows back', async ({
	page,
	fixture,
	shield
}) => {
	await refusedReadCase(page, fixture, shield, 'priority');
});

test('the same refusal on sizes and on issue types, each with its own title', async ({ page, fixture, shield }) => {
	for (const kind of ['size', 'issueType'] as KindKey[]) {
		await refusedReadCase(page, fixture, shield, kind);
	}
});

test('the custom colour: the entry, its picker, a hex accepted, and the save that carries it', async ({
	page,
	fixture,
	shield
}) => {
	const rows = listFixture(fixture, 'priority');
	const api = await serveAndOpen(page, fixture, 'priority', rows);
	const high = rows[1];

	await openEditorOf(page, high.id, 'priority');
	await expect(swatchesOf(page, 'priority')).toHaveCount(10);
	await expect(swatchOf(page, 'priority', '#6366F1')).toHaveAttribute('aria-pressed', 'true');
	await expect.poll(() => customColorOf(page, 'priority').getAttribute('aria-pressed')).toBe('false');
	await expect.poll(() => customColorOf(page, 'priority').getAttribute('style')).toBeNull();
	await expect(hexFieldOf(page, 'priority')).toHaveValue('#6366F1');
	await expect(hexFieldOf(page, 'priority')).toHaveAttribute('title', copyOf.hexHint);
	await expect(hexFieldOf(page, 'priority')).toHaveAttribute('maxlength', '7');
	await expect.poll(() => hexFieldOf(page, 'priority').getAttribute('aria-invalid')).toBeNull();
	await expect(previewChipOf(page, 'priority')).toHaveCount(1);
	await expect(previewChipOf(page, 'priority')).toHaveAttribute('style', chipStyle('#6366F1'));

	// the custom entry opens its picker in a popover (`property-color-field.tsx:98-120`) …
	await customColorOf(page, 'priority').click({ timeout: 15_000 });
	await expect(page.locator('.react-colorful')).toHaveCount(1, { timeout: 20_000 });
	// … and Escape closes the picker without closing the editor (`property-editor-row.tsx:46-51`)
	await page.keyboard.press('Escape');
	report('after Escape over the picker', {
		pickers: await page.locator('.react-colorful').count(),
		editors: await editorOf(page, 'priority').count()
	});
	await expect(page.locator('.react-colorful')).toHaveCount(0, { timeout: 15_000 });
	await expect(editorOf(page, 'priority')).toHaveCount(1);

	await hexFieldOf(page, 'priority').fill(CUSTOM_HEX);
	await expect(hexFieldOf(page, 'priority')).toHaveValue(CUSTOM_HEX);
	await expect.poll(() => hexFieldOf(page, 'priority').getAttribute('aria-invalid')).toBeNull();
	await expect.poll(() => pressedSwatches(page, 'priority')).toEqual([]);
	await expect.poll(() => customColorOf(page, 'priority').getAttribute('aria-pressed')).toBe('true');
	await expect.poll(() => customColorOf(page, 'priority').getAttribute('style')).toContain(rgbOf(CUSTOM_HEX));
	await expect(previewChipOf(page, 'priority')).toHaveAttribute('style', chipStyle(CUSTOM_HEX));
	// the chip renders the name title-cased (`PROPERTY_PREVIEW_CHIP`'s `capitalize`, `property-list-recipes.ts:17-18`)
	await expect(previewChipOf(page, 'priority')).toHaveText(new RegExp(printed(high.name), 'i'));

	await saveButtonOf(page, 'priority').click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT').length, { timeout: 30_000 }).toBe(1);
	const put = api.writesOf('PUT')[0];
	report('PUT', { path: put.path, answered: put.answered, body: put.body });
	expect(put.path).toBe(`/api/task-priorities/${high.id}`);
	expect(put.body).toEqual({
		name: high.name,
		color: CUSTOM_HEX,
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA
	});
	await expect(announceOf(page)).toHaveText(copyOf.announceSaved(printed(high.name)));
	await expect(page.locator('[data-property-row]')).toHaveCount(rows.length, { timeout: 30_000 });
	await expect
		.poll(() => api.calls.slice(api.calls.indexOf(put) + 1).some((call) => call.method === 'GET'), {
			timeout: 60_000
		})
		.toBe(true);
	// the stored colour reaches the glyph (`task-property-icon.tsx:118-122`, `task-data-color.ts:8-10`)
	await expect.poll(() => rowIconOf(page, high.id).getAttribute('style')).toContain(glyphStyle(CUSTOM_HEX));

	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

test('an invalid hex is refused on the field, and a save that changed nothing sends nothing', async ({
	page,
	fixture,
	shield
}) => {
	const rows = listFixture(fixture, 'priority');
	const api = await serveAndOpen(page, fixture, 'priority', rows);
	const plain = rows[2];

	await openEditorOf(page, plain.id, 'priority');
	// the row was served `color: null`: the field is empty (empty counts as accepted) and the chip is unpainted
	await expect(hexFieldOf(page, 'priority')).toHaveValue('');
	await expect.poll(() => hexFieldOf(page, 'priority').getAttribute('aria-invalid')).toBeNull();
	await expect.poll(() => previewChipOf(page, 'priority').getAttribute('style')).toBeNull();
	await expect.poll(() => pressedSwatches(page, 'priority')).toEqual([]);

	await hexFieldOf(page, 'priority').fill(NOT_A_HEX);
	await expect(hexFieldOf(page, 'priority')).toHaveValue(NOT_A_HEX);
	await expect(hexFieldOf(page, 'priority')).toHaveAttribute('aria-invalid', 'true');
	await expect.poll(() => customColorOf(page, 'priority').getAttribute('aria-pressed')).toBe('false');
	await expect.poll(() => pressedSwatches(page, 'priority')).toEqual([]);
	await expect.poll(() => previewChipOf(page, 'priority').getAttribute('style')).toBeNull();

	await saveButtonOf(page, 'priority').click({ timeout: 15_000 });
	// the colour never entered the draft, so the draft was unchanged and `update` returned before any request
	// (`use-property-actions.ts:35-42`); the editor still closed and the live region still announced
	// (`property-list.tsx:447-449`)
	await expect(editorOf(page, 'priority')).toHaveCount(0, { timeout: 15_000 });
	report('announcement of a save that changed nothing', await announceOf(page).innerText());
	await expect(announceOf(page)).toHaveText(copyOf.announceSaved(printed(plain.name)));
	expect(api.writes()).toEqual([]);
	await expect(page.locator('[data-property-row] span.min-w-0')).toHaveText(rows.map((row) => printed(row.name)));

	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

test('a colour the API refuses (400): the toast says it, and the editor keeps the typed hex', async ({
	page,
	fixture,
	shield
}) => {
	const rows = listFixture(fixture, 'priority');
	const high = rows[1];
	const storedColour = high.color as string;
	const api = await serveAndOpen(page, fixture, 'priority', rows, { editRefusal: COLOUR_REFUSAL });

	await openEditorOf(page, high.id, 'priority');
	await hexFieldOf(page, 'priority').fill(CUSTOM_HEX);
	await saveButtonOf(page, 'priority').click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT').length, { timeout: 30_000 }).toBe(1);
	const put = api.writesOf('PUT')[0];
	expect(put.body?.color).toBe(CUSTOM_HEX);
	expect(put.answered).toBe(true);

	await parkPointer(page);
	await expect(appToastsOf(page)).toHaveCount(1, { timeout: 30_000 });
	report('toasts', await toastsOf(page).allInnerTexts());
	await expect(appToastsOf(page)).toContainText(copyOf.mutationFailed);
	await expect(appToastsOf(page)).toContainText(copyOf.reason('INVALID'));

	// the row stays open holding what was typed (`property-editor-row.tsx:123-135`), and the edited row is not a
	// `[data-property-row]` while its editor is open (`property-list.tsx:492-495`)
	await expect(editorOf(page, 'priority')).toHaveCount(1);
	await expect(hexFieldOf(page, 'priority')).toHaveValue(CUSTOM_HEX);
	await expect(previewChipOf(page, 'priority')).toHaveAttribute('style', chipStyle(CUSTOM_HEX));
	await expect(rowLocator(page, high.id)).toHaveCount(0);
	await expect(page.locator('[data-property-row]')).toHaveCount(rows.length - 1);

	await cancelButtonOf(page, 'priority').click({ timeout: 15_000 });
	await expect(page.locator('[data-property-row]')).toHaveCount(rows.length, { timeout: 30_000 });
	report('row style after the refusal and Cancel', await rowIconOf(page, high.id).getAttribute('style'));
	await expect.poll(() => rowIconOf(page, high.id).getAttribute('style')).toContain(glyphStyle(storedColour));

	const armed = [armedRefusal('PUT', `/api/task-priorities/${high.id}`, 400), armedMutation(COLOUR_REFUSAL.message)];
	report('console', consoleFindings(shield, armed));
	expect(consoleFindings(shield, armed)).toEqual([]);
});

test('a held write: the row and the editor while the call is unanswered, then answered', async ({
	page,
	fixture,
	shield
}) => {
	const rows = listFixture(fixture, 'priority');
	const high = rows[1];
	const HELD_HEX = '#0F766E';
	const api = await serveAndOpen(page, fixture, 'priority', rows, { holdFirstWriteOf: 'PUT' });

	await openEditorOf(page, high.id, 'priority');
	await hexFieldOf(page, 'priority').fill(HELD_HEX);
	await saveButtonOf(page, 'priority').click({ timeout: 15_000 });

	try {
		await expect.poll(() => api.writesOf('PUT').length, { timeout: 30_000 }).toBe(1);
		const held = api.writesOf('PUT')[0];
		report('held write', { method: held.method, path: held.path, answered: held.answered, body: held.body });
		expect(held.answered).toBe(false);

		// the editor waits for the answer: both buttons disabled, the spinner in Save, no announcement yet
		await expect(saveButtonOf(page, 'priority')).toBeDisabled();
		await expect(cancelButtonOf(page, 'priority')).toBeDisabled();
		await expect(saveButtonOf(page, 'priority').locator('svg')).toHaveCount(1);
		await expect(announceOf(page)).toBeEmpty();
		// the row being edited has become its editor: 2 `[data-property-row]` remain, and neither is that row
		await expect(page.locator('[data-property-row]')).toHaveCount(rows.length - 1);
		await expect(rowLocator(page, high.id)).toHaveCount(0);
		await expect(page.locator('[data-property-row] span.min-w-0')).toHaveText(
			rows.filter((row) => row.id !== high.id).map((row) => printed(row.name))
		);
	} finally {
		api.releaseWrites();
	}

	const held = api.writesOf('PUT')[0];
	await expect.poll(() => held.answered, { timeout: 60_000 }).toBe(true);
	await expect(announceOf(page)).toHaveText(copyOf.announceSaved(printed(high.name)));
	await expect(editorOf(page, 'priority')).toHaveCount(0, { timeout: 15_000 });
	await expect(page.locator('[data-property-row]')).toHaveCount(rows.length, { timeout: 30_000 });
	report(
		'calls after the answer',
		api.calls.slice(api.calls.indexOf(held) + 1).map((call) => `${call.method} ${call.path}`)
	);
	await expect.poll(() => rowIconOf(page, high.id).getAttribute('style')).toContain(glyphStyle(HELD_HEX));
	await expect
		.poll(() => api.calls.slice(api.calls.indexOf(held) + 1).some((call) => call.method === 'GET'), {
			timeout: 60_000
		})
		.toBe(true);

	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});
