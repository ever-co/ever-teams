import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type MockControl, type Page, type Shield, type StubRequest } from '../../fixtures';
import { APP_ORIGIN, hardVisit, signInWithFixture, type BootstrapFixture } from '../../helpers';

/**
 * Settings › Team › Priorities / Sizes / Versions / Issue types: what a team manager sees on those four pages and
 * which requests the browser sends there. All four render the same shared property list
 * (`core/components/settings/pages/task-properties/property-list.tsx`), so one file covers them as a table of kinds.
 * Until today the four routes were only smoke-visited (`suites/mock/routes.spec.ts`).
 *
 * Lane: **lane-b** (app `http://localhost:3032`, mock `127.0.0.1:3996`, control `3998`, `playwright/test-servers.ts`).
 * This file's own runs: `E:\Coding\.tmp\s3-lane-b-taskprops-2.log` and `-3.log` — two consecutive whole-file runs,
 * `31 passed (4.0m)` and `31 passed (4.3m)`, nothing skipped or flaky. `-1.log` before them was the diagnostic run:
 * 27 passed / 4 failed, and those four failures are findings 14 and 15 and the two selector traps under "Selector
 * facts". (After `-3.log` only the prose of this header was reworded — no test, assertion or helper changed.) The measurements it was written from are the probe runs `s2-lane-b-taskprops-probe1-1.log`,
 * `-probe2-3.log`, `-probe2-5.log`, `-probe3-1.log`, `-probe3b-1.log`, `-probe4-1.log`, `-probe5-1.log` and
 * `-probe6-1.log` in the same folder (probes: `E:\Coding\.tmp\probe-taskprops\`).
 *
 * ## Status of this file (every claim below names the log it came from)
 *
 * All of it (31 tests) is live and measured on lane-b: the empty list and the reads behind it (all four kinds), the
 * served 3-row list and its colour/glyph/order rendering, the editor each kind opens, the add flow, the edit flow, the
 * delete flow, the refused writes (400 / 500 / 409 / 403, on add, on edit and on delete), and the Default section of
 * issue types from both paths. There is no `test.fixme` left; what is *not* covered is listed at the end, with the
 * reason.
 *
 * ## Where the browser actually sends these calls
 *
 * `playwright/test-servers.ts` hands the served document `NEXT_PUBLIC_GAUZY_API_SERVER_URL = <mock origin>`,
 * `core/constants/config/constants.tsx` turns that into `GAUZY_API_BASE_SERVER_URL`, and
 * `core/services/client/axios.ts:108-112` makes the axios base `<mock origin>/api`. Measured: the one property read a
 * settings page made was `GET http://127.0.0.1:3996/api/task-metadata/bootstrap?organizationId=…&organizationTeamId=…
 * &projectId=…&include=issueTypes,relatedIssueTypes,taskLabels,taskPriorities,taskSizes,taskStatuses,taskVersions`
 * (`-probe1-1.log`), and every write this file caused went to `http://127.0.0.1:3996/api/<kind>…`, never to
 * `http://localhost:3032/api/…` (`-probe2-3.log`). So the routes below are installed on the browser's own requests to
 * the mock, exactly as `suites/mock/labels.spec.ts:46-96` does for labels: the mock keeps no priorities, sizes,
 * versions or issue types (`cypress/support/mock-gauzy-server.mjs:338-342`, `:688-691` answer those four lists as
 * empty), so the list is patched into the mock's own bootstrap bundle and the write routes answer as Gauzy would —
 * which also makes the request bodies readable straight off the handlers.
 *
 * The read is the bootstrap bundle, never the per-kind list: `useTaskPrioritiesQuery`
 * (`core/hooks/tasks/use-task-priorities-query.ts:35-49`), `useTaskSizesQuery`, `useTaskVersionsQuery`,
 * `useIssueTypesQuery` all take `taskMetadataQuery.data?.<section>` while `useBootstrap` is true
 * (`useBootstrap = !publicTeam`, `core/hooks/tasks/use-task-metadata-bootstrap-query.ts:37`), and measured no
 * `GET /api/task-priorities` happened on any of the four pages (`-probe1-1.log`).
 *
 * ## Components driven (file:line)
 *
 * `app/[locale]/(main)/settings/team/{priorities,sizes,versions,issue-types}/page.tsx` →
 * `core/components/settings/pages/task-properties/{priorities,sizes,versions,issue-types}-settings-page.tsx:9-30`
 * (issue types: `issue-types-settings-page.tsx:145-172`) → `task-property-settings-body.tsx:22-58` →
 * `property-list.tsx:261` (`EmptyState` `:194-229`, `AddRow` `:160-190`, `PropertyRow` via `:490-522`),
 * `property-row.tsx:143-193` (row menu `:57-141`), `property-editor-row.tsx:53-231`,
 * `property-color-field.tsx:53-133`, `property-icon-picker.tsx:57-95`, `property-preview.tsx:24-56`,
 * `property-delete-dialog.tsx:53-112` over `core/components/settings/kit/danger.tsx:76-199`, and
 * `core/components/tasks/task-property-icon.tsx:403-460` for the glyph its colour paints.
 *
 * ## Measured, with the source line that decides it
 *
 * 1. **The list is in served order, and the row shows `label`, not `name`.** `propertyItemsOf`
 *    (`core/lib/utils/settings-task-properties.ts:161-163`) keeps the array order and maps `name` through
 *    `propertyLabelOf` (`:92-95`, dashes → spaces). Measured for priorities: served `urgent`, `high`, `no-priority`
 *    rendered as `urgent`, `high`, `no priority` (`-probe2-3.log`). The label span also carries `capitalize` —
 *    `property-row.tsx:27` names priority, size, status and issue type as slug kinds, `:177` applies the class.
 * 2. **A served colour paints the glyph; no colour leaves it unstyled.** `task-property-icon.tsx:421-460` puts
 *    `glyphColorStyle(color)` on the icon span (`:118-122` → `dataColorHue`, `core/components/tasks/task-data-color.ts:8-10`).
 *    Measured: `#EF4444` → `color: oklch(from rgb(239, 68, 68) 0.62 min(3 * c, 0.16) h)` in the span's `style`, and an
 *    empty `style` for the row served with `color: null` (`-probe2-3.log`; Chrome canonicalises the hex to `rgb(…)`).
 * 3. **No reorder here at all — for any of the four kinds.** `TaskPropertySettingsBody` passes `onDelete` only, never
 *    `onMove` (`task-property-settings-body.tsx:47-53`), and the issue-types page passes `onMakeDefault` and
 *    `onDelete` only (`issue-types-settings-page.tsx:163-170`). `PropertyList` offers a move only when `onMove` exists
 *    (`property-list.tsx:307-322`, `:399`), so `canMoveUp`/`canMoveDown` are false, the drag handle is not rendered
 *    (`property-row.tsx:163-175` `canDrag`), and `Move up`/`Move down` never appear in the row menu
 *    (`property-row.tsx:114-125`). Measured: `dragHandle: false` on every served row of all four kinds
 *    (`-probe2-3.log`, `-probe2-5.log`). Reorder is on `/settings/team/statuses` only
 *    (`statuses-settings-page.tsx:60-62`), which `suites/mock/team-settings.spec.ts` and the status-move unit test
 *    cover; these four pages have no reorder to test.
 * 4. **An empty name is refused on the field, before any request.** `property-editor-row.tsx:114-117` →
 *    `isPropertyNameFilled` (`settings-task-properties.ts:97-99`). Measured: `[role="alert"]` = "Give it a name to
 *    save it.", the name input `aria-invalid="true"`, and zero POSTs (`-probe2-3.log`).
 * 5. **A duplicate name is NOT refused on these four kinds — it is sent, and the list adds it.** `PropertyList` hands
 *    `isNameTaken` only for labels (`property-list.tsx:472-484`, `kind === 'label' ? isNameTakenByAnother : undefined`)
 *    because, as its comment says, tasks/filters/pickers tell a team's *labels* apart by name; the editor's duplicate
 *    branch (`property-editor-row.tsx:118-121`) therefore never runs here. Measured: typing `high`, a name the served
 *    list already had, produced `POST /api/task-priorities` and the row was added with the announcement "high added."
 *    (`-probe2-3.log`, and the same on sizes, versions and issue types in `-probe2-5.log`). Not a defect: the intent
 *    the code states is labels-only. What the four kinds do get is the API's own 409 saying so on the field
 *    (`property-editor-row.tsx:126-132` + `isNameTakenError`, `core/lib/utils/error-feedback.ts:104-119`) — measured
 *    in finding 13 (`-probe3-1.log`).
 * 6. **The create body, measured on all four kinds:** `{"name":"high","color":"#22C55E","organizationId":"22222222-…",
 *    "tenantId":"11111111-…","organizationTeamId":"33333333-…"}` — `organizationId`/`tenantId` from `useUserQuery`
 *    (`use-property-actions.ts:24-33`), `organizationTeamId` added by the mutation hook
 *    (`use-create-task-priority.ts:26-31`), and **no `icon` key** because a new row of an ungrouped list starts with
 *    `icon: null` (`property-list.tsx:133-140` `newDraftOf` → `templateOfGroup(null)` → `iconPathOfTemplate(null)`,
 *    `settings-task-properties.ts:242-247`, `:317-328`) and `propertyLookBodyOf` drops a null as `undefined`
 *    (`:384-397`). Its colour is the swatch at index `items.length % 10` (`defaultSwatchFor`, `:71-74`): with 3 served
 *    rows the editor opened on `#22C55E`, with 4 on `#EAB308` (`-probe2-3.log`, `-probe2-5.log`). The same five keys
 *    came back on all four kinds — a create body never carries `value` and never carries `isDefault` (`-probe2-5.log`).
 * 7. **A cold dev compile of these routes is slow, and one page exceeded the default 30 s navigation timeout twice**
 *    (`-probe1-1.log`, `-probe2-1.log`: `page.goto … Timeout 30000ms exceeded` on `/settings/team/versions`). Measured
 *    with an allowance raised (`-probe4-1.log`): versions 12.2 s cold / 11.3 s warm, issue types 15.3 s cold /
 *    1.7 s warm, priorities 3.2 s / 0.5 s, sizes 3.5 s / 0.9 s. `test.use({ navigationTimeout })` below raises the
 *    *navigation* allowance for that compile; no assertion in this file waits on a duration.
 * 8. **Two controls carry each Add label** (the page header's and the empty state's / the add row's) —
 *    `task-property-settings-body.tsx:36-40` + `property-list.tsx:221-224`. Measured 2 "Add priority" and 2 "Add size"
 *    buttons on the empty pages (`-probe1-1.log`). With rows present there is exactly one `[data-add-row="all"]`
 *    (`property-list.tsx:177`, `:534-542`), and that attribute — not the label — is what the cases below click, for
 *    the same reason `suites/mock/labels.spec.ts:210-213` gives. Measured on all four empty pages, with the empty
 *    state instead of an add row (`-probe5-1.log`).
 * 9. **The kinds differ in the editor they open, and nowhere else.** Priorities, sizes and issue types open 10
 *    swatches, a hex field (`settings.taskProperties.HEX_HINT` as its title), `Custom color`, `Choose an icon` and a
 *    `Preview` (`hasIconPicker`, `settings-task-properties.ts:309-311`); versions open the name input and nothing
 *    else — 0 swatches, no picker, no preview, its buttons only `Cancel` and `Add version` / `Save`
 *    (`hasIconLibrary('version')` false, `property-editor-row.tsx:74,153-204`). Measured on all four kinds, and the
 *    version create body still carries `color: "#FFFFFF"` from cookies (`use-version-settings.ts:24-33`) even though
 *    no colour was offered (`-probe2-5.log`).
 * 10. **An edit is a `PUT <kind path>/<id>` whose body is per kind, and it sends the stored `name` back.** With 3
 *    served rows the draft opened on nothing (the row had no colour yet) and after clicking `#0EA5E9` the body was
 *    `{"name":"no-priority","color":"#0EA5E9",…tenantId…organizationId}` for priorities, the same plus
 *    `organizationTeamId` for sizes (`use-edit-task-size.ts:20-23` adds it; the priorities, versions and issue-types
 *    hooks do not), and `{"name":…,"tenantId":…,"organizationId":…}` for versions, whose editor has no colour and no
 *    icon. `organizationId`/`tenantId` are added by the client's own `put` (`api.service.ts:690-710`); a null `color`
 *    or `icon` is dropped (`definedOrUndefined`, `settings-task-properties.ts:379-382`). A row served as `no-priority`
 *    sends `no-priority` even though the field showed `no priority` (`editedNameOf`, `:349-362`) — the label is not a
 *    name, and renaming it would rename the property tasks still carry. All measured (`-probe2-5.log`).
 * 11. **A Save that changed nothing, and an Escape, send nothing.** `usePropertyActions.update` returns before the
 *    request when `isDraftChanged` is false (`use-property-actions.ts:35-42`), and Escape closes the editor without
 *    saving. Measured on all four kinds: the PUT count stayed at 1 across a re-open + Save and a re-open + type +
 *    Escape, and the editor was closed both times (`-probe2-5.log`). A row that is being edited is not a
 *    `[data-property-row]` while the editor is open — it is the editor row (`-probe3-1.log` read 2 rows while the
 *    third was open for editing). The Escape measured here was pressed while typing in the field — see finding 15 for
 *    what Escape does *not* close.
 * 12. **Delete: the dialog is the kind's own copy, Cancel sends nothing, Confirm sends `DELETE <kind path>/<id>`.**
 *    `property-delete-dialog.tsx:53-112` over `kit/danger.tsx:76-199`: title `delete.TITLE`, `delete.DESCRIPTION`, the
 *    row named by its label ("High", "Large", "Legacy one", "Custom type"), `delete.CHOICES_GONE`,
 *    `delete.TASKS_KEEP_VALUE`, then `Cancel` and `delete.CONFIRM`. Measured on all four kinds, with the row gone and
 *    "<label> deleted." after the confirm (`-probe2-5.log`).
 * 13. **A refused write says itself where the refusal was about.** A 409 whose `details.field` is `name` puts
 *    `taskProperties.NAME_TAKEN` under the field with `aria-invalid="true"` and an `aria-describedby` pointing at it
 *    (`error-feedback.ts:104-119`, `property-editor-row.tsx:126-132`) — measured on an add and on an edit. Every other
 *    refusal (400, 500, a 409 that names no field) says nothing on the field and leaves the reason to
 *    `MutationErrorToaster`: title `toasts.MUTATION_FAILED`, description `toasts.REASONS.INVALID|SERVER|CONFLICT`
 *    (`mutation-error-toaster.tsx:36-60`), while the editor stays open holding what was typed and the list stays as it
 *    was. A refused delete instead keeps its dialog open and shows `toasts.REASONS.SERVER|PERMISSION` in a
 *    `role="alert"` line inside the dialog (`property-delete-dialog.tsx:72-85`, `:90-101`). A dev run also logs each
 *    failure twice — the client's own `[ERROR] [HttpClient] HTTP Error: <verb> /<kind path> <status>` (logged without
 *    the `/api` prefix the axios base adds) and `Mutation failed: …`, and for a 403 the critical branch instead:
 *    `🚨 CRITICAL: HTTP 403 Forbidden - … - Permission Denied`. Those exact lines are what the console assertions
 *    below allow. All measured (`-probe3-1.log`, `-probe3b-1.log`).
 * 14. **Issue types keep a default, and making one is two `PUT`s.** `issue-types-settings-page.tsx:96-128` draws the
 *    `Default` and `Types` sections (also on an empty list, where the picker renders nothing and the row says
 *    `issueTypes.NO_DEFAULT`, `-probe5-1.log`), the trigger's accessible name is `issueTypes.DEFAULT_TRIGGER` with the
 *    default's label, and only the default row carries the `Default` chip. `makeDefault` PUTs the picked row as the
 *    client holds it plus `isDefault: true`, then PUTs the former default with `isDefault: false`
 *    (`use-issue-type-settings.ts:70-90`); the row menu of the row that is already the default has no `Make default`
 *    item (`property-row.tsx:57-141`). The two paths announce on different live regions, and each leaves the other
 *    empty: from the row menu it is the list's `p[aria-live="polite"].sr-only` (`property-list.tsx:619`) that reads
 *    "<label> is now the default." while the Default section's own `<span>` stays empty, and from the picker it is the
 *    other way round (`issue-types-settings-page.tsx:76`, `:123`). Opened from the trigger, the picker is a
 *    `role="menu"` named by the trigger's own label with one `role="menuitem"` (`data-slot="dropdown-menu-item"`) per
 *    type, and only the current default's item carries the `Selected` mark (`selected-mark.tsx:19`). All measured
 *    (`-probe2-5.log`, `-probe6-1.log`).
 * 15. **Escape closes the editor only while the key lands inside it.** The handler is the editor form's own
 *    `onKeyDown` (`property-editor-row.tsx:46-50,:139,:149`); typing in the name field, Escape closes it (finding 11).
 *    After a click on `Save` the key no longer reaches that form: in `-s3-lane-b-taskprops-1.log` the editor of a
 *    refused 409 edit was still open, holding `Renamed refused`, through 33 polls over 15 s after
 *    `page.keyboard.press('Escape')`. The case below leaves such an editor by its `Cancel` button, which sends nothing
 *    second time.
 *
 * ## Selector facts worth knowing before editing this file
 *
 * - The page mounts other `<form>`s (the sidebar newsletter, whose submit is named "Subscribe"), so `form
 *   button[type="submit"]` is ambiguous: `-probe2-1.log` died on exactly that strict-mode violation. The editor form
 *   is found by the input its `NAME_PLACEHOLDER` gives it.
 * - Rows are `[data-property-row="<id>"]`, their menu `[data-row-menu]`, the add row `[data-add-row="<group>"]`, the
 *   icon `[data-slot="task-property-icon"]`, the label `span.min-w-0`.
 * - **A dev lane has two kinds of `role="dialog"`**: the app's own, and the Next error overlay's
 *   "Console Error" dialog, which appears the moment a test causes a console error — `-probe3-1.log` died on
 *   `[role="dialog"]` resolving to both. Every dialog below is taken by its accessible name.
 * - Two live regions, different tags, and which one a write fills depends on where the write was started: the list
 *   announces on `p[aria-live="polite"].sr-only` (`property-list.tsx:619`), the Default section on its own
 *   `span[aria-live="polite"].sr-only` (`issue-types-settings-page.tsx:123`); asserting the wrong one reads as an
 *   element that is there and stays empty forever (`-s3-lane-b-taskprops-1.log`, finding 14).
 * - A served colour reaches the DOM as one whole declaration, and it is compared as a string: `glyphStyle` builds the
 *   grouped kinds' `color: oklch(from rgb(…) 0.62 min(3 * c, 0.16) h);`, `gemStyle` the issue types'
 *   `--gem: oklch(from #HEX 0.62 min(c * 3, 0.16) h);`. A `new RegExp(rgbOf(hex))` matched nothing, because the
 *   parentheses of `rgb(…)` became capture groups.
 *
 * ## What is not covered here
 *
 * Reorder (finding 3: these four pages offer none); icon *upload* (`property-icon-upload.tsx`, needs Gauzy's image
 * asset routes the mock does not answer); the *contents* of the icon library panel — `property-icon-panel.tsx` is its
 * own component and its own suite's business, and the probe only recorded that its option count differs per kind (100
 * for priorities, 104 for sizes, `-probe2-5.log`); a row the manager may not write (`use-task-settings-access.ts`
 * read-only hint, a role the fixture is not); `isSystem` rows, whose delete and move the menu hides
 * (`settings-task-properties.ts:529-544`); the read-failure Notice (`property-list.tsx:569-581`); a `Make default`
 * click on the row that is already the default (`issue-types-settings-page.tsx:69-72` returns before the request — the
 * code says so, no test measures it); and the Next `app/api/task-priorities|task-sizes|task-versions|issue-types`
 * route handlers — the browser never reaches them on a lane (paragraph "Where the browser actually sends these
 * calls"), so they are a contract-suite question, not a browser one.
 */

/** The copy every expectation below is built from, read from the locale file the app itself renders. */
const LOCALE = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: Record<string, string>;
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string> };
	settings: {
		entries: Record<string, { TITLE: string; DESCRIPTION: string }>;
		taskProperties: Record<string, string> & {
			delete: Record<string, string>;
			issueTypes: Record<string, string>;
		};
	};
};
const PROPERTIES = LOCALE.settings.taskProperties;
/** `settings.taskProperties.issueTypes.*`: the Default section of `/settings/team/issue-types` only. */
const ISSUE_TYPES = PROPERTIES.issueTypes;
/** A `{name}` sentence with its placeholder taken out, for an `aria-label` matched by prefix. */
const TRIGGER_PREFIX = ISSUE_TYPES.DEFAULT_TRIGGER.split('{name}')[0];

/**
 * `{kind, select, status {…} priority {…} other {…}}` is how these keys carry one sentence for every kind; this
 * returns the branch for `value` (or the `other` branch) so no English sentence below is typed by hand.
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
		// next-intl writes the branches with a space after `select,` and after every `}`, so skip leading whitespace
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

type PropertyKind = 'priority' | 'size' | 'version' | 'issueType';

interface KindSpec {
	kind: PropertyKind;
	path: string;
	/** The `settings.entries.*` key that carries this page's heading and description. */
	entry: 'priorities' | 'sizes' | 'versions' | 'issueTypes';
	/** The path under the mock origin the browser writes to (measured: `…/api/task-priorities…`, `-probe2-3.log`). */
	api: string;
	/** The bootstrap section the page's list is patched into. */
	section: string;
	/** `false` for versions: `hasIconLibrary('version')` is false (`settings-task-properties.ts:301-303`). */
	hasLook: boolean;
	/** The versions create body is built in its own hook, from cookies, not from the draft (`use-version-settings.ts:24-33`). */
	fromCookies: boolean;
	/**
	 * Whether the client validates this bootstrap section: `selectAndValidate` runs `validatePaginationResponse` with a
	 * `.strict()` schema for statuses, priorities, sizes and versions, and hands `issueTypes` through untouched
	 * (`task-metadata-bootstrap.service.ts:62-95`). A served row carrying a key the schema does not know — `isDefault`
	 * among them — fails the whole bootstrap query, and the page shows the failure Notice instead of the list.
	 */
	validated: boolean;
}

const KINDS: Record<PropertyKind, KindSpec> = {
	priority: {
		kind: 'priority',
		path: '/settings/team/priorities',
		entry: 'priorities',
		api: 'task-priorities',
		section: 'taskPriorities',
		hasLook: true,
		fromCookies: false,
		validated: true
	},
	size: {
		kind: 'size',
		path: '/settings/team/sizes',
		entry: 'sizes',
		api: 'task-sizes',
		section: 'taskSizes',
		hasLook: true,
		fromCookies: false,
		validated: true
	},
	version: {
		kind: 'version',
		path: '/settings/team/versions',
		entry: 'versions',
		api: 'task-versions',
		section: 'taskVersions',
		hasLook: false,
		fromCookies: true,
		validated: true
	},
	issueType: {
		kind: 'issueType',
		path: '/settings/team/issue-types',
		entry: 'issueTypes',
		api: 'issue-types',
		section: 'issueTypes',
		hasLook: true,
		fromCookies: false,
		validated: false
	}
};

const copyOf = (spec: KindSpec) => ({
	title: LOCALE.settings.entries[spec.entry].TITLE,
	description: LOCALE.settings.entries[spec.entry].DESCRIPTION,
	add: selectBranch(PROPERTIES.ADD!, spec.kind),
	emptyTitle: selectBranch(PROPERTIES.EMPTY_TITLE!, spec.kind),
	emptyDescription: selectBranch(PROPERTIES.EMPTY_DESCRIPTION!, spec.kind),
	errorTitle: selectBranch(PROPERTIES.ERROR_TITLE!, spec.kind),
	namePlaceholder: selectBranch(PROPERTIES.NAME_PLACEHOLDER!, spec.kind),
	nameRequired: PROPERTIES.NAME_REQUIRED!,
	nameTaken: selectBranch(PROPERTIES.NAME_TAKEN!, spec.kind),
	deleteTitle: selectBranch(PROPERTIES.delete.TITLE!, spec.kind),
	deleteDescription: PROPERTIES.delete.DESCRIPTION!,
	deleteChoicesGone: PROPERTIES.delete.CHOICES_GONE!,
	deleteConfirm: selectBranch(PROPERTIES.delete.CONFIRM!, spec.kind),
	deletedConsequence: PROPERTIES.delete.TASKS_KEEP_VALUE!,
	/** The row menu's own verbs (`common.EDIT`, `common.DELETE`) and the editor's `common.SAVE` / `common.CANCEL`. */
	menuEdit: LOCALE.common.EDIT,
	menuDelete: LOCALE.common.DELETE,
	menuMakeDefault: PROPERTIES.MAKE_DEFAULT!,
	editorSave: LOCALE.common.SAVE,
	editorCancel: LOCALE.common.CANCEL,
	defaultChip: PROPERTIES.DEFAULT!,
	dragTitle: PROPERTIES.DRAG!,
	announceAdded: (name: string) => PROPERTIES.ANNOUNCE_ADDED!.replace('{name}', name),
	announceSaved: (name: string) => PROPERTIES.ANNOUNCE_SAVED!.replace('{name}', name),
	announceDeleted: (name: string) => PROPERTIES.ANNOUNCE_DELETED!.replace('{name}', name),
	announceDefault: (name: string) => PROPERTIES.ANNOUNCE_DEFAULT!.replace('{name}', name),
	defaultTrigger: (name: string) => ISSUE_TYPES.DEFAULT_TRIGGER.replace('{name}', name)
});

/** `dataColorHue`'s `oklch(from <hex> …)` reaches Chrome's `style` attribute as `rgb(…)`; this is the rgb it becomes. */
const rgbOf = (hex: string): string => {
	const digits = hex.replace('#', '');
	const parts = [0, 2, 4].map((index) => parseInt(digits.slice(index, index + 2), 16));
	return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
};

/** A coloured row of a grouped kind: `glyphColorStyle(color)` on the icon span (`task-property-icon.tsx:118-122`). */
const glyphStyle = (hex: string): string => `color: oklch(from ${rgbOf(hex)} 0.62 min(3 * c, 0.16) h);`;
/** An issue type paints a gem instead, and there Chrome keeps the hex as written (`-probe2-5.log`). */
const gemStyle = (hex: string): string => `--gem: oklch(from ${hex} 0.62 min(c * 3, 0.16) h);`;
/** The gem of an issue type served without a colour: the kind's own colour of its name (`task-property-icon.tsx:24`). */
const STORY_GEM = gemStyle('#66BB97');
/** `TASK_PROPERTY_COLOR_SWATCHES`, in the order the editor draws them (`settings-task-properties.ts:58-69`). */
const COLOR_SWATCHES = [
	'#6366F1',
	'#0EA5E9',
	'#14B8A6',
	'#22C55E',
	'#EAB308',
	'#F97316',
	'#EF4444',
	'#EC4899',
	'#A855F7',
	'#64748B'
];

/** A row as this file serves it. `id` must be a uuid: `taskPrioritySchema` merges `uuIdSchema` (`base.schema.ts:11`). */
interface ServedItem {
	id: string;
	name: string;
	value: string;
	color: string | null;
	icon: string | null;
	isSystem: boolean;
	isDefault?: boolean;
	organizationTeamId: string;
}

interface WriteRequest {
	method: string;
	path: string;
	body: unknown;
}

interface PropertyHarness {
	items: ServedItem[];
	posts: WriteRequest[];
	puts: WriteRequest[];
	deletes: WriteRequest[];
	/** Armed refusal per verb: the handler answers this instead of Gauzy's success. */
	arm: Partial<Record<'POST' | 'PUT' | 'DELETE', { status: number; body: unknown }>>;
}

/**
 * `isDefault` is given only when the caller asks for it, and only for a kind whose section the client does not
 * validate (see `KindSpec.validated`): `taskPrioritySchema`/`taskSizeSchema`/`taskVersionSchema` are `.strict()` and
 * carry no `isDefault`, so even `isDefault: false` on such a row turns the bootstrap read into a failure.
 */
const servedItem = (
	fixture: BootstrapFixture,
	id: string,
	name: string,
	color: string | null,
	icon: string | null,
	isDefault?: boolean
): ServedItem => ({
	id,
	name,
	value: name,
	color,
	icon,
	isSystem: false,
	organizationTeamId: fixture.ids.teamA,
	...(isDefault === undefined ? {} : { isDefault })
});

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated on every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/**
 * Serves one kind's list, as `suites/mock/labels.spec.ts:36-99` serves labels: the mock's own bootstrap answer is
 * fetched and patched, and the three write verbs answer as Gauzy would, keeping the list in this array and recording
 * every body. The zod validation the client runs on these answers is real (`task-priority.service.ts`
 * `validateApiResponse(taskPrioritySchema, …)`; `task-version.service.ts` validates its PUT against
 * `updateTaskVersionResultSchema` and its DELETE against `deleteTaskVersionResultSchema`), so the shapes below are the
 * ones the client accepts.
 */
async function serveTaskPropertyList(
	page: Page,
	spec: KindSpec,
	fixture: BootstrapFixture,
	initial: ServedItem[],
	arm: PropertyHarness['arm'] = {}
): Promise<PropertyHarness> {
	const harness: PropertyHarness = { items: [...initial], posts: [], puts: [], deletes: [], arm };
	const base = `/api/${spec.api}`;

	await page.route(/\/api\/task-metadata\/bootstrap(\?.*)?$/, async (route) => {
		const upstream = await route.fetch();
		const body = (await upstream.json()) as Record<string, unknown>;
		await route.fulfill({
			status: 200,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: JSON.stringify({ ...body, [spec.section]: { items: harness.items, total: harness.items.length } })
		});
	});

	await page.route(new RegExp(`/api/${spec.api}(/[^/?]+)?(\\?.*)?$`), async (route) => {
		const request = route.request();
		const method = request.method() as 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
		const url = new URL(request.url());
		const id = url.pathname.slice(base.length + 1);
		const fulfill = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});
		// The mock answers a preflight itself (`mock-gauzy-server.mjs:1097-1101`); this route replaced it, so it must.
		if (method === 'OPTIONS') {
			await fulfill(204);
			return;
		}
		const refusal = harness.arm[method as keyof PropertyHarness['arm']];
		if (refusal) {
			harness[method === 'POST' ? 'posts' : method === 'DELETE' ? 'deletes' : 'puts'].push({
				method,
				path: url.pathname,
				body: request.postDataJSON()
			});
			await fulfill(refusal.status, refusal.body);
			return;
		}
		if (method === 'POST') {
			const body = request.postDataJSON();
			harness.posts.push({ method, path: url.pathname, body });
			// No `isDefault` on a created row: a kind whose section is validated would reject the key (see `KindSpec.validated`).
			const created: ServedItem = {
				id: `a9000000-0000-4000-8000-${String(harness.posts.length).padStart(12, '0')}`,
				name: String(body.name),
				value: String(body.name),
				color: body.color ?? null,
				icon: body.icon ?? null,
				isSystem: false,
				organizationTeamId: fixture.ids.teamA
			};
			harness.items.push(created);
			await fulfill(201, created);
			return;
		}
		if (method === 'PUT' || method === 'PATCH') {
			const body = request.postDataJSON() as Partial<ServedItem>;
			harness.puts.push({ method, path: url.pathname, body });
			harness.items = harness.items.map((item) => (item.id === id ? { ...item, ...body } : item));
			if (spec.api === 'task-versions') {
				// Gauzy's TypeORM answer, which `updateTaskVersionResultSchema` is the client's shape of.
				await fulfill(200, { generatedMaps: [], raw: [], affected: 1 });
				return;
			}
			await fulfill(
				200,
				harness.items.find((item) => item.id === id)
			);
			return;
		}
		if (method === 'DELETE') {
			harness.deletes.push({ method, path: url.pathname, body: null });
			harness.items = harness.items.filter((item) => item.id !== id);
			if (spec.api === 'task-versions') {
				await fulfill(200, { raw: [], affected: 1 });
				return;
			}
			await fulfill(200, { id });
		}
	});

	return harness;
}

/** Routes first, cookies second, navigation last — `helpers.ts:439-451` states this order for a spec that must intercept a read. */
const openPropertyPage = async (page: Page, fixture: BootstrapFixture, path: string): Promise<void> => {
	await signInWithFixture(page.context(), fixture);
	await hardVisit(page, path);
};

const editorOf = (page: Page, placeholder: string) =>
	page.locator('form').filter({ has: page.locator(`input[placeholder="${placeholder}"]`) });
const editorInput = (page: Page, placeholder: string) => editorOf(page, placeholder).locator('input').first();
const rowIds = async (page: Page): Promise<string[]> =>
	page.$$eval('[data-property-row]', (rows) => rows.map((row) => row.getAttribute('data-property-row') ?? ''));
const announceOf = (page: Page) => page.locator('p[aria-live="polite"].sr-only');

/** The reads the mock was actually asked for: the only witness for a page that reads through the bootstrap bundle. */
const bootstrapReads = async (mock: MockControl, section: string) =>
	(await mock.requests()).filter(
		(request: StubRequest) => request.path === '/api/task-metadata/bootstrap' && request.query.includes(section)
	);

interface ServedRow {
	id: string;
	name: string;
	color: string | null;
	icon: string | null;
	isDefault?: boolean;
}

/**
 * The rows every case below serves: one coloured row carrying a stored library icon, one coloured row with no icon,
 * one row with neither. Where the kind is stored as a slug the name holds a dash, so the row shows it as a space
 * (`propertyLabelOf`); issue types get one default row, which only their own bootstrap section may carry
 * (`KindSpec.validated`). These are the rows `-probe2-5.log` served, under the same ids.
 */
const PRIORITY_ROWS: ServedRow[] = [
	{
		id: 'a1000000-0000-4000-8000-000000000001',
		name: 'urgent',
		color: '#EF4444',
		icon: 'ever-icons/task-priorities/urgent.svg'
	},
	{
		id: 'a1000000-0000-4000-8000-000000000002',
		name: 'high',
		color: '#6366F1',
		icon: 'ever-icons/task-priorities/high.svg'
	},
	{ id: 'a1000000-0000-4000-8000-000000000003', name: 'no-priority', color: null, icon: null }
];
const SIZE_ROWS: ServedRow[] = [
	{
		id: 'a2000000-0000-4000-8000-000000000001',
		name: 'extra-small',
		color: '#22C55E',
		icon: 'ever-icons/task-sizes/tiny.svg'
	},
	{ id: 'a2000000-0000-4000-8000-000000000002', name: 'large', color: '#F97316', icon: null },
	{ id: 'a2000000-0000-4000-8000-000000000003', name: 'no-size', color: null, icon: null }
];
const VERSION_ROWS: ServedRow[] = [
	{ id: 'a3000000-0000-4000-8000-000000000001', name: '2.4', color: '#FFFFFF', icon: null },
	{ id: 'a3000000-0000-4000-8000-000000000002', name: '3.0-beta', color: '#0EA5E9', icon: null },
	{ id: 'a3000000-0000-4000-8000-000000000003', name: 'Legacy one', color: null, icon: null }
];
const ISSUE_TYPE_ROWS: ServedRow[] = [
	{ id: 'a4000000-0000-4000-8000-000000000001', name: 'bug', color: '#923535', icon: null, isDefault: true },
	{ id: 'a4000000-0000-4000-8000-000000000002', name: 'story', color: null, icon: 'ever-icons/task-sizes/large.svg' },
	{ id: 'a4000000-0000-4000-8000-000000000003', name: 'custom type', color: '#22C55E', icon: null }
];

const ROWS_BY_KIND: Record<PropertyKind, ServedRow[]> = {
	priority: PRIORITY_ROWS,
	size: SIZE_ROWS,
	version: VERSION_ROWS,
	issueType: ISSUE_TYPE_ROWS
};

/**
 * What the probe read off those rows (`-probe2-5.log`, the "rows:" dumps). A `null` in `muted` marks a row the probe
 * served differently than this file does, so nothing is asserted about it.
 */
interface ShownRows {
	labels: string[];
	/** `capitalize` on the label span: priority, size, status and issue type are slug kinds (`property-row.tsx:27,:177`). */
	capitalize: boolean;
	/** Only issue types paint the gem plate (`task-property-icon.tsx:403-460`). */
	gemPlate: boolean;
	/** The exact `style` attribute of each row's glyph, in served order. */
	styles: string[];
	muted: (boolean | null)[];
	/** The add editor's preview carries the name typed (or the placeholder): true for priorities and sizes, false for
	 *  issue types (their preview is the gem, measured `chipText: null`) and for versions, which have no preview. */
	previewShowsName: boolean;
}

const SHOWN: Record<PropertyKind, ShownRows> = {
	priority: {
		labels: ['urgent', 'high', 'no priority'],
		capitalize: true,
		gemPlate: false,
		styles: [glyphStyle('#EF4444'), glyphStyle('#6366F1'), ''],
		muted: [false, false, true],
		previewShowsName: true
	},
	size: {
		labels: ['extra small', 'large', 'no size'],
		capitalize: true,
		gemPlate: false,
		styles: [glyphStyle('#22C55E'), glyphStyle('#F97316'), ''],
		// the probe served this kind's colourless row *with* an icon, so its greying is not a measured fact here
		muted: [false, false, null],
		previewShowsName: true
	},
	version: {
		labels: ['2.4', '3.0 beta', 'Legacy one'],
		capitalize: false,
		gemPlate: false,
		styles: [glyphStyle('#FFFFFF'), glyphStyle('#0EA5E9'), ''],
		muted: [false, false, true],
		previewShowsName: false
	},
	issueType: {
		labels: ['bug', 'story', 'custom type'],
		capitalize: true,
		gemPlate: true,
		styles: [gemStyle('#923535'), STORY_GEM, gemStyle('#22C55E')],
		muted: [false, false, false],
		previewShowsName: false
	}
};

/** The verbs a row menu offers. `Make default` appears only on an issue type that is not the default one. */
const menuVerbsOf = (spec: KindSpec, copy: ReturnType<typeof copyOf>): string[] =>
	spec.kind === 'issueType'
		? [copy.menuEdit, copy.menuMakeDefault, copy.menuDelete]
		: [copy.menuEdit, copy.menuDelete];

/**
 * The edit-body key sets, measured per kind (`-probe2-5.log` step 7). Only the sizes hook adds `organizationTeamId`
 * to an edit (`use-edit-task-size.ts:20-23`); priorities, versions and issue types send what `propertyEditBodyOf`
 * built, with `tenantId`/`organizationId` added by the client's own `put` (`api.service.ts:690-710`). A null `color`
 * or `icon` is dropped (`definedOrUndefined`, `settings-task-properties.ts:379-382`), and the versions editor has
 * neither field at all.
 */
const EDIT_BODY_KEYS: Record<PropertyKind, string[]> = {
	priority: ['color', 'name', 'organizationId', 'tenantId'],
	size: ['color', 'name', 'organizationId', 'organizationTeamId', 'tenantId'],
	version: ['name', 'organizationId', 'tenantId'],
	issueType: ['color', 'name', 'organizationId', 'tenantId']
};

/** The create body, measured identical on all four kinds (`-probe2-5.log` steps 5-6). */
const CREATE_BODY_KEYS = ['color', 'name', 'organizationId', 'organizationTeamId', 'tenantId'];

const servedRows = (fixture: BootstrapFixture, rows: ServedRow[]): ServedItem[] =>
	rows.map((row) => servedItem(fixture, row.id, row.name, row.color, row.icon, row.isDefault));

/** A row as the list draws it: its id, the label the row shows, and what its glyph carries. */
const rowRecords = async (page: Page) =>
	page.$$eval('[data-property-row]', (rows) =>
		rows.map((row) => {
			const icon = row.querySelector('[data-slot="task-property-icon"]');
			const label = row.querySelector('span.min-w-0');
			return {
				id: row.getAttribute('data-property-row') ?? '',
				label: label?.textContent ?? '',
				capitalized: (label?.className ?? '').includes('capitalize'),
				gemPlate: (icon?.className ?? '').includes('gem-plate'),
				mutedIcon: (icon?.className ?? '').includes('text-muted-foreground'),
				style: icon?.getAttribute('style') ?? ''
			};
		})
	);

const iconOf = (page: Page, id: string) => page.locator(`[data-property-row="${id}"] [data-slot="task-property-icon"]`);
/** The `Default` chip is a `<span>` directly inside its `<li>` (`property-row.tsx:178`). */
const chipOf = (page: Page, id: string, chipCopy: string) =>
	page.locator(`[data-property-row="${id}"] > span`, { hasText: chipCopy });
const openRowMenu = async (page: Page, id: string) => {
	await page.locator(`[data-property-row="${id}"] [data-row-menu]`).click({ timeout: 25_000 });
	await expect(page.locator('[role="menuitem"]').first()).toBeVisible();
};
const menuTexts = async (page: Page) =>
	page.$$eval('[role="menuitem"]', (items) => items.map((item) => item.textContent?.trim() ?? ''));
/** A toast carrying `text` (`MutationErrorToaster` renders one `data-sonner-toast` per message). */
const toastOf = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
const editorSaveButton = (page: Page, placeholder: string, label: string) =>
	editorOf(page, placeholder).getByRole('button', { name: label, exact: true });
/** The `Default` section announces on its own `<span>`, not on the list's `<p>` (`issue-types-settings-page.tsx:126`). */
const defaultAnnounceOf = (page: Page) => page.locator('span[aria-live="polite"].sr-only');
/** The row menu button of one row (`property-row.tsx:143-193`). */
const rowMenuOf = (page: Page, id: string) => page.locator(`[data-property-row="${id}"] [data-row-menu]`);

/** `mutation-error-toaster.tsx:47-49`: dev mode logs every failed mutation, whoever handles it. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** React's dev-mode store warning of the app shell, named in `security-two-factor-ui.spec.ts:392-397`. */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * The client's own line for a refusal this file armed (`api.service.ts` `logError`), logged with the path *without*
 * the `/api` prefix — that is what the axios base adds (`-probe3-1.log`).
 */
const armedHttpError = (verb: string, api: string, status: number, id?: string) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} /${api}${id ? `/${id}` : ''} ${status}`;
/** A 403 goes down the client's critical branch instead of the plain one (`-probe3b-1.log`). */
const armedForbidden = (verb: string, api: string, id: string) =>
	`🚨 CRITICAL: HTTP 403 Forbidden - ${verb} /${api}/${id} - Permission Denied`;
/** What a silence assertion may be empty about: only these exact, named lines. */
const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b taskprops] MEASURE ${label} ${JSON.stringify(value)}`);

// A cold Turbopack compile of these four routes measured 3.2-15.3 s, and `/settings/team/versions` once passed the
// 30 s Playwright default twice (see the header, finding 7). This raises the navigation allowance only; no assertion
// below waits on a duration.
test.use({ navigationTimeout: 120_000 });

test.describe('lane-b · Settings › Team task properties: the empty list and what it reads', () => {
	for (const spec of Object.values(KINDS)) {
		const copy = copyOf(spec);
		test(`${spec.kind} · an empty list shows its heading, its own empty copy and two Add controls, over one bootstrap read`, async ({
			page,
			fixture,
			mock,
			shield
		}) => {
			await serveTaskPropertyList(page, spec, fixture, []);
			await openPropertyPage(page, fixture, spec.path);

			await expect(page.getByRole('heading', { level: 1, name: copy.title })).toBeVisible({ timeout: 25_000 });
			await expect(page.getByText(copy.description, { exact: true })).toBeVisible();
			await expect(page.getByText(copy.emptyTitle, { exact: true })).toBeVisible();
			await expect(page.getByText(copy.emptyDescription, { exact: true })).toBeVisible();
			// Measured: 2 for the header's and the empty state's (`-probe1-1.log`).
			await expect(page.getByRole('button', { name: copy.add })).toHaveCount(2);
			// The empty state is not an add row: with no items `PropertyList` renders `EmptyState` instead of the
			// surface with its `AddRow` (`property-list.tsx:566`, `:584-589`).
			await expect(page.locator('[data-property-row]')).toHaveCount(0);
			await expect(page.locator('[data-add-row]')).toHaveCount(0);
			// And the failure copy is absent: an empty list is not shown as a failed read.
			await expect(page.getByText(selectBranch(PROPERTIES.ERROR_TITLE!, spec.kind), { exact: true })).toHaveCount(
				0
			);
			if (spec.kind === 'issueType') {
				// Measured on the empty page as well (`-probe5-1.log`): both sections are drawn, the Default one says
				// there is no default, and with no type at all the picker renders nothing.
				await expect(page.getByRole('heading', { level: 2, name: ISSUE_TYPES.DEFAULT_SECTION! })).toBeVisible();
				await expect(page.getByRole('heading', { level: 2, name: ISSUE_TYPES.TYPES_SECTION! })).toBeVisible();
				await expect(page.getByText(ISSUE_TYPES.NO_DEFAULT!, { exact: true })).toBeVisible();
				await expect(page.locator(`button[aria-label^="${TRIGGER_PREFIX}"]`)).toHaveCount(0);
			}

			await expect
				.poll(async () => (await bootstrapReads(mock, spec.section)).length > 0, {
					message: `the ${spec.kind} list was rendered without asking for it`
				})
				.toBe(true);
			const listCalls = (await mock.requests()).filter((request) => request.path === `/api/${spec.api}`);
			expect(listCalls, `the page asked for /api/${spec.api} directly, not through the bootstrap bundle`).toEqual(
				[]
			);

			console.log(
				`[lane-b taskprops] MEASURE empty ${spec.kind} ${JSON.stringify({
					heading: await page.getByRole('heading', { level: 1 }).innerText(),
					addButtons: await page.getByRole('button', { name: copy.add }).count(),
					bootstrapReads: await bootstrapReads(mock, spec.section),
					kindCalls: listCalls,
					consoleErrors: shield.consoleErrors(),
					pageErrors: shield.pageErrors()
				})}`
			);
			expect(shield.consoleErrors(), 'the empty list logged a console error').toEqual([]);
			expect(shield.pageErrors(), 'the empty list threw in the page').toEqual([]);
		});
	}
});

test.describe('lane-b · the priorities list a team is served', () => {
	const spec = KINDS.priority;
	const copy = copyOf(spec);
	const URGENT = { id: 'a1000000-0000-4000-8000-000000000001', name: 'urgent', color: '#EF4444' };
	const HIGH = { id: 'a1000000-0000-4000-8000-000000000002', name: 'high', color: '#6366F1' };
	const NONE = { id: 'a1000000-0000-4000-8000-000000000003', name: 'no-priority', color: null };

	const served = (fixture: BootstrapFixture) => [
		servedItem(fixture, URGENT.id, URGENT.name, URGENT.color, 'ever-icons/task-priorities/urgent.svg'),
		servedItem(fixture, HIGH.id, HIGH.name, HIGH.color, 'ever-icons/task-priorities/high.svg'),
		servedItem(fixture, NONE.id, NONE.name, NONE.color, null)
	];

	test('rows come in served order, name shown with its dashes as spaces, colour on the glyph, no colour as plain', async ({
		page,
		fixture,
		shield
	}) => {
		await serveTaskPropertyList(page, spec, fixture, served(fixture));
		await openPropertyPage(page, fixture, spec.path);

		await expect(page.locator('[data-property-row]')).toHaveCount(3, { timeout: 25_000 });
		expect(await rowIds(page), 'the rows did not come in the order the list was served').toEqual([
			URGENT.id,
			HIGH.id,
			NONE.id
		]);

		const labels = await page.$$eval('[data-property-row] span.min-w-0', (rows) =>
			rows.map((row) => ({
				text: row.textContent ?? '',
				capitalized: (row.className ?? '').includes('capitalize')
			}))
		);
		expect(
			labels.map((label) => label.text),
			'the row shows `label`, dashes as spaces (`propertyLabelOf`)'
		).toEqual(['urgent', 'high', 'no priority']);
		expect(
			labels.every((label) => label.capitalized),
			'a slug kind lost its `capitalize` (`property-row.tsx:27,:177`)'
		).toBe(true);

		const icon = (id: string) => page.locator(`[data-property-row="${id}"] [data-slot="task-property-icon"]`);
		// `-probe2-3.log` / `-s3-lane-b-taskprops-1.log`: the glyph carries the served colour as the exact
		// `oklch(from rgb(…) 0.62 min(3 * c, 0.16) h);` declaration; the colourless row's style reads as an empty string.
		const glyphStyles = await page.$$eval('[data-property-row] [data-slot="task-property-icon"]', (rows) =>
			rows.map((row) => row.getAttribute('style') ?? '')
		);
		expect(
			glyphStyles,
			'the served colour reaches the glyph, no colour leaves it plain (`task-property-icon.tsx:118-122`)'
		).toEqual([glyphStyle(URGENT.color!), glyphStyle(HIGH.color!), '']);
		await expect(icon(URGENT.id).locator('svg')).toBeVisible();

		// Finding 3: none of the four kinds offers a move, and a non-default row shows no Default chip.
		await expect(page.locator(`[title="${PROPERTIES.DRAG}"]`)).toHaveCount(0);
		await expect(page.getByText(PROPERTIES.DEFAULT!, { exact: true })).toHaveCount(0);
		await expect(page.locator('[data-row-menu]')).toHaveCount(3);
		// The one add row a filled list carries (`property-list.tsx:534-542`).
		await expect(page.locator('[data-add-row="all"]')).toHaveCount(1);

		console.log(
			`[lane-b taskprops] MEASURE rows priority ${JSON.stringify({
				labels,
				styles: await page.$$eval('[data-property-row] [data-slot="task-property-icon"]', (rows) =>
					rows.map((r) => r.getAttribute('style') ?? '')
				),
				consoleErrors: shield.consoleErrors(),
				pageErrors: shield.pageErrors()
			})}`
		);
		expect(shield.consoleErrors(), 'the served list logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the served list threw in the page').toEqual([]);
	});

	test('the add row opens the editor: its own placeholder, 10 swatches, a picker, and a preview named by the placeholder', async ({
		page,
		fixture
	}) => {
		await serveTaskPropertyList(page, spec, fixture, served(fixture));
		await openPropertyPage(page, fixture, spec.path);

		await page.locator('[data-add-row="all"]').click({ timeout: 25_000 });
		const editor = editorOf(page, copy.namePlaceholder);
		await expect(editor).toBeVisible();
		await expect(editor.locator('input').first()).toHaveAttribute('placeholder', copy.namePlaceholder);
		await expect(editor.getByRole('button', { name: PROPERTIES.ICON_CHOOSE! })).toBeVisible();
		// `TASK_PROPERTY_COLOR_SWATCHES` is 10 long (`settings-task-properties.ts:58-69`) and each is its own aria-label.
		for (const swatch of [
			'#6366F1',
			'#0EA5E9',
			'#14B8A6',
			'#22C55E',
			'#EAB308',
			'#F97316',
			'#EF4444',
			'#EC4899',
			'#A855F7',
			'#64748B'
		]) {
			await expect(editor.getByRole('button', { name: swatch, exact: true })).toHaveCount(1);
		}
		await expect(editor.getByRole('button', { name: PROPERTIES.CUSTOM_COLOR! })).toBeVisible();
		await expect(editor.getByText(PROPERTIES.COLOR!, { exact: true })).toBeVisible();
		await expect(editor.getByText(PROPERTIES.PREVIEW!, { exact: true })).toBeVisible();
		// With nothing typed the preview chip carries the placeholder (`property-preview.tsx:28-32,52`).
		await expect(page.locator('span[class*="chip-3d"]')).toContainText(copy.namePlaceholder);
		// Finding 6: with 3 served rows the new draft opens on swatch index 3 (`defaultSwatchFor`).
		await expect(editor.getByRole('button', { name: '#22C55E', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(editor.locator('input[title]').first()).toHaveValue('#22C55E');
		// A status would also offer its type picker; these kinds do not (`property-editor-row.tsx:75,184-202`).
		await expect(editor.getByText(PROPERTIES.TYPE!, { exact: true })).toHaveCount(0);
	});

	test('add: empty name refused on the field with nothing sent; a name already in the list is sent anyway; the accepted one lands', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveTaskPropertyList(page, spec, fixture, served(fixture));
		await openPropertyPage(page, fixture, spec.path);

		await page.locator('[data-add-row="all"]').click({ timeout: 25_000 });
		const save = editorOf(page, copy.namePlaceholder).getByRole('button', { name: copy.add });

		// Finding 4: empty name.
		await save.click();
		await expect(page.getByText(copy.nameRequired, { exact: true })).toBeVisible();
		await expect(editorOf(page, copy.namePlaceholder).locator('input').first()).toHaveAttribute(
			'aria-invalid',
			'true'
		);
		expect(harness.posts, 'an empty name reached the API').toEqual([]);
		await expect(page.locator('[data-property-row]')).toHaveCount(3);

		// Finding 5: the duplicate is refused for labels only, so here it is sent.
		await editorInput(page, copy.namePlaceholder).fill(HIGH.name);
		await save.click();
		await expect(page.locator('[data-property-row]')).toHaveCount(4, { timeout: 25_000 });
		expect(
			harness.posts,
			'a name the list already has must still be sent on these kinds (`property-list.tsx:484`)'
		).toHaveLength(1);
		const duplicate = harness.posts[0].body as Record<string, unknown>;
		expect(duplicate.name, 'the typed name was sent as typed').toBe(HIGH.name);
		expect(duplicate.organizationTeamId, 'the row was not filed under the fixture team').toBe(fixture.ids.teamA);
		expect(typeof duplicate.organizationId, 'no organizationId in the body').toBe('string');
		expect(typeof duplicate.tenantId, 'no tenantId in the body').toBe('string');
		expect(Object.keys(duplicate).sort(), 'finding 6: a new row of an ungrouped list sends no icon').toEqual([
			'color',
			'name',
			'organizationId',
			'organizationTeamId',
			'tenantId'
		]);
		await expect(announceOf(page)).toHaveText(copy.announceAdded(HIGH.name));

		// And a genuinely new name.
		await page.locator('[data-add-row="all"]').click();
		await editorInput(page, copy.namePlaceholder).fill('Probe added');
		await editorOf(page, copy.namePlaceholder).getByRole('button', { name: copy.add }).click();
		await expect(page.locator('[data-property-row]')).toHaveCount(5, { timeout: 25_000 });
		expect(harness.posts.at(-1)?.body, 'the new name was not sent as typed').toMatchObject({ name: 'Probe added' });
		await expect(announceOf(page)).toHaveText(copy.announceAdded('Probe added'));
		await expect(editorOf(page, copy.namePlaceholder)).toHaveCount(0);

		console.log(
			`[lane-b taskprops] MEASURE add priority ${JSON.stringify({
				posts: harness.posts,
				consoleErrors: shield.consoleErrors(),
				pageErrors: shield.pageErrors()
			})}`
		);
		expect(shield.consoleErrors(), 'the add flow logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the add flow threw in the page').toEqual([]);
	});
});

/**
 * Everything below replaced the `test.fixme` list of the first pass. Its numbers come from
 * `E:\Coding\.tmp\s2-lane-b-taskprops-probe2-5.log` (rows, editor shape, add, edit, delete, the Default section),
 * `-probe3-1.log` and `-probe3b-1.log` (the refused writes) and `-probe5-1.log` (the four empty pages).
 */

test.describe('lane-b · the same list on sizes, versions and issue types', () => {
	for (const spec of [KINDS.size, KINDS.version, KINDS.issueType]) {
		const copy = copyOf(spec);
		const rows = ROWS_BY_KIND[spec.kind];
		const shown = SHOWN[spec.kind];

		test(`${spec.kind} · its served rows, and the editor its add row opens`, async ({ page, fixture, shield }) => {
			await serveTaskPropertyList(page, spec, fixture, servedRows(fixture, rows));
			await openPropertyPage(page, fixture, spec.path);

			await expect(page.locator('[data-property-row]')).toHaveCount(3, { timeout: 25_000 });
			expect(await rowIds(page), 'the rows did not come in the order they were served').toEqual(
				rows.map((row) => row.id)
			);

			const records = await rowRecords(page);
			expect(
				records.map((record) => record.label),
				'the row shows `label`, dashes as spaces (`propertyLabelOf`)'
			).toEqual(shown.labels);
			expect(
				records.map((record) => record.capitalized),
				'`capitalize` is the class of the slug kinds'
			).toEqual(rows.map(() => shown.capitalize));
			expect(
				records.map((record) => record.gemPlate),
				'only issue types paint the gem plate'
			).toEqual(rows.map(() => shown.gemPlate));
			expect(
				records.map((record) => record.style),
				'the served colour reaches the glyph; no colour leaves it plain'
			).toEqual(shown.styles);
			records.forEach((record, index) => {
				if (shown.muted[index] === null) {
					return;
				}
				expect(record.mutedIcon, `the greying of the glyph of ${record.id}`).toBe(shown.muted[index]);
			});

			// A stored classic library icon (`ever-icons/…`) is drawn as the kind's own inline glyph, not as a picture:
			// every served row measured `hasSvg: true, hasImg: false`, with the icon requested or not
			// (`task-property-icon.tsx:403-460`, `-probe2-5.log`).
			for (const row of rows) {
				await expect(iconOf(page, row.id).locator('svg')).not.toHaveCount(0);
				await expect(iconOf(page, row.id).locator('img')).toHaveCount(0);
			}

			// Finding 3: no drag handle on any of these four pages. `Default` chips: only the row an issue-type list
			// served as the default one.
			await expect(page.locator(`[title="${copy.dragTitle}"]`)).toHaveCount(0);
			for (const [index, row] of rows.entries()) {
				await expect(chipOf(page, row.id, copy.defaultChip)).toHaveCount(row.isDefault === true ? 1 : 0);
				await expect(rowMenuOf(page, row.id)).toHaveAttribute(
					'aria-label',
					PROPERTIES.ROW_ACTIONS!.replace('{name}', shown.labels[index])
				);
			}
			await expect(page.locator('[data-add-row="all"]')).toHaveCount(1);
			if (spec.kind === 'issueType') {
				await expect(page.getByRole('heading', { level: 2, name: ISSUE_TYPES.DEFAULT_SECTION! })).toBeVisible();
				await expect(page.getByRole('heading', { level: 2, name: ISSUE_TYPES.TYPES_SECTION! })).toBeVisible();
			}

			// The editor the add row opens. Priorities (pinned above), sizes and issue types get the colour field, the
			// icon picker and the preview; versions get the name input and nothing else
			// (`hasIconLibrary('version')` false, `property-editor-row.tsx:74,153-204`).
			await page.locator('[data-add-row="all"]').click({ timeout: 25_000 });
			const editor = editorOf(page, copy.namePlaceholder);
			await expect(editor).toBeVisible();
			await expect(editor.locator('input')).toHaveCount(spec.hasLook ? 2 : 1);
			await expect(editor.getByRole('button', { name: PROPERTIES.ICON_CHOOSE!, exact: true })).toHaveCount(
				spec.hasLook ? 1 : 0
			);
			await expect(editor.getByRole('button', { name: PROPERTIES.CUSTOM_COLOR!, exact: true })).toHaveCount(
				spec.hasLook ? 1 : 0
			);
			await expect(editor.getByText(PROPERTIES.COLOR!, { exact: true })).toHaveCount(spec.hasLook ? 1 : 0);
			await expect(editor.getByText(PROPERTIES.PREVIEW!, { exact: true })).toHaveCount(spec.hasLook ? 1 : 0);
			for (const swatch of COLOR_SWATCHES) {
				await expect(editor.getByRole('button', { name: swatch, exact: true })).toHaveCount(
					spec.hasLook ? 1 : 0
				);
			}
			if (spec.hasLook) {
				// With 3 served rows the new draft opens on swatch index 3 (`defaultSwatchFor`), and the hex field shows it.
				await expect(editor.getByRole('button', { name: '#22C55E', exact: true })).toHaveAttribute(
					'aria-pressed',
					'true'
				);
				await expect(editor.locator(`input[title="${PROPERTIES.HEX_HINT!}"]`)).toHaveValue('#22C55E');
			}
			if (shown.previewShowsName) {
				await expect(page.locator('span[class*="chip-3d"]').first()).toContainText(copy.namePlaceholder);
			}

			report(`rows ${spec.kind}`, {
				labels: records.map((record) => record.label),
				styles: records.map((record) => record.style),
				consoleErrors: shield.consoleErrors()
			});
			expect(consoleFindings(shield), `the ${spec.kind} list logged a console error`).toEqual([]);
			expect(shield.pageErrors(), `the ${spec.kind} list threw in the page`).toEqual([]);
		});
	}
});

test.describe('lane-b · adding to the three remaining kinds', () => {
	for (const spec of [KINDS.size, KINDS.version, KINDS.issueType]) {
		const copy = copyOf(spec);
		const rows = ROWS_BY_KIND[spec.kind];

		test(`${spec.kind} · an empty name is refused on the field, a name the list already has is sent anyway, a new one lands`, async ({
			page,
			fixture,
			shield
		}) => {
			const harness = await serveTaskPropertyList(page, spec, fixture, servedRows(fixture, rows));
			await openPropertyPage(page, fixture, spec.path);

			await page.locator('[data-add-row="all"]').click({ timeout: 25_000 });
			const save = editorSaveButton(page, copy.namePlaceholder, copy.add);

			// Finding 4: nothing typed, nothing sent.
			await save.click();
			await expect(page.getByText(copy.nameRequired, { exact: true })).toBeVisible();
			await expect(editorInput(page, copy.namePlaceholder)).toHaveAttribute('aria-invalid', 'true');
			expect(harness.posts, 'an empty name reached the API').toEqual([]);
			await expect(page.locator('[data-property-row]')).toHaveCount(3);

			// Finding 5: a duplicate is refused on labels only, so here it is sent, with the colour of the swatch a
			// 3-row list opens on — except on versions, whose create body is built from cookies (`use-version-settings.ts:24-33`).
			const duplicate = rows[1].name;
			await editorInput(page, copy.namePlaceholder).fill(duplicate);
			await save.click();
			await expect(page.locator('[data-property-row]')).toHaveCount(4, { timeout: 25_000 });
			expect(harness.posts, `a name the list already has is sent, not refused (${spec.kind})`).toHaveLength(1);
			expect(harness.posts[0].path, 'the POST goes to the kind path, with no query string').toBe(
				`/api/${spec.api}`
			);
			const first = harness.posts[0].body as Record<string, unknown>;
			expect(first.name, 'the typed name was sent as typed').toBe(duplicate);
			expect(first.color, 'the colour the draft opened on').toBe(spec.fromCookies ? '#FFFFFF' : '#22C55E');
			expect(Object.keys(first).sort(), 'the create body keys, identical on all four kinds').toEqual(
				CREATE_BODY_KEYS
			);
			await expect(announceOf(page)).toHaveText(copy.announceAdded(duplicate));
			// The accepted add closes the editor: every later case re-opens it from the add row or the row menu.
			await expect(editorOf(page, copy.namePlaceholder)).toHaveCount(0);

			// And a genuinely new name, on the colour a 4-row list opens on.
			await page.locator('[data-add-row="all"]').click();
			await editorInput(page, copy.namePlaceholder).fill('Probe added');
			await editorSaveButton(page, copy.namePlaceholder, copy.add).click();
			await expect(page.locator('[data-property-row]')).toHaveCount(5, { timeout: 25_000 });
			expect(harness.posts.at(-1)?.body, 'the new name was not sent as typed').toMatchObject({
				name: 'Probe added',
				color: spec.fromCookies ? '#FFFFFF' : '#EAB308'
			});
			expect(await rowIds(page), 'the two new rows came last, in the order the mock created them').toEqual([
				...rows.map((row) => row.id),
				'a9000000-0000-4000-8000-000000000001',
				'a9000000-0000-4000-8000-000000000002'
			]);
			await expect(announceOf(page)).toHaveText(copy.announceAdded('Probe added'));

			report(`add ${spec.kind}`, { posts: harness.posts, consoleErrors: shield.consoleErrors() });
			expect(consoleFindings(shield), `the ${spec.kind} add flow logged a console error`).toEqual([]);
			expect(shield.pageErrors(), `the ${spec.kind} add flow threw in the page`).toEqual([]);
		});
	}
});

test.describe('lane-b · editing a row', () => {
	for (const spec of Object.values(KINDS)) {
		const copy = copyOf(spec);
		const rows = ROWS_BY_KIND[spec.kind];
		const row = rows[2];
		const shownLabel = SHOWN[spec.kind].labels[2];
		const renamed = 'Renamed one';

		test(`${spec.kind} · the PUT path and body, the stored name rather than the shown label, and a Save that changes nothing`, async ({
			page,
			fixture,
			shield
		}) => {
			const harness = await serveTaskPropertyList(page, spec, fixture, servedRows(fixture, rows));
			await openPropertyPage(page, fixture, spec.path);
			await expect(page.locator('[data-property-row]')).toHaveCount(3, { timeout: 25_000 });

			await openRowMenu(page, row.id);
			expect(await menuTexts(page), 'the verbs of the row menu').toEqual(menuVerbsOf(spec, copy));
			await page.getByRole('menuitem', { name: copy.menuEdit, exact: true }).click();

			const editor = editorOf(page, copy.namePlaceholder);
			await expect(editor).toBeVisible();
			// The field is seeded with what the row shows; the dashed stored name is not typed back (`property-row.tsx:196`).
			await expect(editor.locator('input').first()).toHaveValue(shownLabel);

			if (spec.hasLook) {
				await editor.getByRole('button', { name: '#0EA5E9', exact: true }).click();
			} else {
				await editor.locator('input').first().fill(renamed);
			}
			await editorSaveButton(page, copy.namePlaceholder, copy.editorSave).click();

			await expect(page.locator('[data-property-row]')).toHaveCount(3, { timeout: 25_000 });
			expect(harness.puts, 'an accepted edit sent exactly one PUT').toHaveLength(1);
			expect(harness.puts[0].method, 'an edit is a PUT').toBe('PUT');
			expect(harness.puts[0].path, 'PUT <kind path>/<id>, no query string').toBe(`/api/${spec.api}/${row.id}`);
			const body = harness.puts[0].body as Record<string, unknown>;
			expect(Object.keys(body).sort(), 'the edit body keys of this kind').toEqual(EDIT_BODY_KEYS[spec.kind]);
			expect(body.name, 'finding 10: `propertyEditBodyOf` sends the stored name back, not the shown label').toBe(
				spec.hasLook ? row.name : renamed
			);
			if (spec.hasLook) {
				expect(body.color, 'the swatch that was clicked is the colour sent').toBe('#0EA5E9');
			}
			const savedLabel = spec.hasLook ? shownLabel : renamed;
			await expect(announceOf(page)).toHaveText(copy.announceSaved(savedLabel));

			// Re-open the row and Save without touching anything: `isDraftChanged` is false, so no request is made
			// (`use-property-actions.ts:35-42`).
			await openRowMenu(page, row.id);
			await page.getByRole('menuitem', { name: copy.menuEdit, exact: true }).click();
			await expect(editorOf(page, copy.namePlaceholder).locator('input').first()).toHaveValue(savedLabel);
			await editorSaveButton(page, copy.namePlaceholder, copy.editorSave).click();
			await expect(editorOf(page, copy.namePlaceholder)).toHaveCount(0);
			expect(harness.puts, 'a Save that changed nothing sent a request').toHaveLength(1);

			// Escape closes it with nothing saved.
			await openRowMenu(page, row.id);
			await page.getByRole('menuitem', { name: copy.menuEdit, exact: true }).click();
			await editorInput(page, copy.namePlaceholder).fill('Typed then escaped');
			await page.keyboard.press('Escape');
			await expect(editorOf(page, copy.namePlaceholder)).toHaveCount(0);
			expect(harness.puts, 'Escape saved something').toHaveLength(1);
			await expect(announceOf(page)).toHaveText(copy.announceSaved(savedLabel));
			expect(await rowIds(page), 'the row is an ordinary row again after Escape').toContain(row.id);

			report(`edit ${spec.kind}`, { puts: harness.puts, consoleErrors: shield.consoleErrors() });
			expect(consoleFindings(shield), `the ${spec.kind} edit flow logged a console error`).toEqual([]);
			expect(shield.pageErrors(), `the ${spec.kind} edit flow threw in the page`).toEqual([]);
		});
	}
});

test.describe('lane-b · deleting a row', () => {
	/** Which served row each kind deletes. */
	const TARGETS: Record<PropertyKind, number> = { priority: 1, size: 1, version: 2, issueType: 2 };

	for (const spec of Object.values(KINDS)) {
		const copy = copyOf(spec);
		const rows = ROWS_BY_KIND[spec.kind];
		const index = TARGETS[spec.kind];
		const row = rows[index];
		const label = SHOWN[spec.kind].labels[index];

		test(`${spec.kind} · its dialog, Cancel sending nothing, Confirm sending DELETE <kind path>/<id> and dropping the row`, async ({
			page,
			fixture,
			shield
		}) => {
			const harness = await serveTaskPropertyList(page, spec, fixture, servedRows(fixture, rows));
			await openPropertyPage(page, fixture, spec.path);
			await expect(page.locator('[data-property-row]')).toHaveCount(3, { timeout: 25_000 });

			await openRowMenu(page, row.id);
			await page.getByRole('menuitem', { name: copy.menuDelete, exact: true }).click();
			// The Next dev overlay opens a `role="dialog"` of its own as soon as the page logs a console error, so the
			// property dialog is always found by its accessible name (`-probe3b-1.log`).
			const dialog = page.getByRole('dialog', { name: copy.deleteTitle });
			await expect(dialog).toBeVisible();
			for (const text of [
				copy.deleteTitle,
				copy.deleteDescription,
				copy.deleteChoicesGone,
				copy.deletedConsequence
			]) {
				await expect(dialog.getByText(text, { exact: true })).toBeVisible();
			}
			// The dialog names the row by the label the row shows (`property-delete-dialog.tsx:53-112`): "High", "Large",
			// "Legacy one", "Custom type" (`-probe2-5.log` read the whole dialog text).
			const dialogText = (await dialog.innerText()).replace(/\s+/g, ' ').trim();
			expect(dialogText.toLowerCase(), 'the dialog does not name the row it is about').toContain(
				label.toLowerCase()
			);
			await expect(dialog.getByRole('button', { name: copy.editorCancel, exact: true })).toBeVisible();
			await expect(dialog.getByRole('button', { name: copy.deleteConfirm, exact: true })).toBeVisible();

			await dialog.getByRole('button', { name: copy.editorCancel, exact: true }).click();
			await expect(dialog).toHaveCount(0);
			expect(harness.deletes, 'Cancel sent a request').toEqual([]);
			await expect(page.locator('[data-property-row]')).toHaveCount(3);

			await openRowMenu(page, row.id);
			await page.getByRole('menuitem', { name: copy.menuDelete, exact: true }).click();
			await page
				.getByRole('dialog', { name: copy.deleteTitle })
				.getByRole('button', { name: copy.deleteConfirm, exact: true })
				.click();
			await expect(page.locator('[data-property-row]')).toHaveCount(2, { timeout: 25_000 });
			expect(harness.deletes, 'the confirm sent one DELETE').toHaveLength(1);
			expect(harness.deletes[0].path, 'DELETE <kind path>/<id>, no query string').toBe(
				`/api/${spec.api}/${row.id}`
			);
			expect(await rowIds(page), 'the row left the list').not.toContain(row.id);
			await expect(announceOf(page)).toHaveText(copy.announceDeleted(label));

			report(`delete ${spec.kind}`, { deletes: harness.deletes, consoleErrors: shield.consoleErrors() });
			expect(consoleFindings(shield), `the ${spec.kind} delete flow logged a console error`).toEqual([]);
			expect(shield.pageErrors(), `the ${spec.kind} delete flow threw in the page`).toEqual([]);
		});
	}
});

test.describe('lane-b · issue types: the Default section', () => {
	const spec = KINDS.issueType;
	const copy = copyOf(spec);
	const BUG = ISSUE_TYPE_ROWS[0];
	const STORY = ISSUE_TYPE_ROWS[1];
	const CUSTOM = ISSUE_TYPE_ROWS[2];
	/** The two PUTs `makeDefault` sends: the picked row with `isDefault: true`, then the former default cleared
	 *  (`use-issue-type-settings.ts:70-90`), measured in the order `-probe2-5.log` recorded them. */
	const expectMakeDefaultPuts = (harness: PropertyHarness, picked: ServedRow, former: ServedRow) => {
		expect(harness.posts, 'Make default is an update, not a create').toEqual([]);
		expect(harness.deletes, 'Make default deleted something').toEqual([]);
		expect(
			harness.puts.map((put) => put.path),
			'the picked row first, then the former default'
		).toEqual([`/api/issue-types/${picked.id}`, `/api/issue-types/${former.id}`]);
		const pickedBody = harness.puts[0].body as Record<string, unknown>;
		expect(Object.keys(pickedBody).sort(), 'Make default sends the whole stored row back with `isDefault`').toEqual(
			[
				'color',
				'icon',
				'id',
				'isDefault',
				'isSystem',
				'name',
				'organizationId',
				'organizationTeamId',
				'tenantId',
				'value'
			]
		);
		expect(pickedBody).toMatchObject({
			id: picked.id,
			name: picked.name,
			value: picked.name,
			color: picked.color,
			icon: picked.icon,
			isSystem: false,
			isDefault: true
		});
		const clearedBody = harness.puts[1].body as Record<string, unknown>;
		expect(clearedBody).toMatchObject({ id: former.id, name: former.name, isDefault: false });
	};

	test('the section names one type, its chip sits on that row, and only the other rows offer Make default', async ({
		page,
		fixture,
		shield
	}) => {
		await serveTaskPropertyList(page, spec, fixture, servedRows(fixture, ISSUE_TYPE_ROWS));
		await openPropertyPage(page, fixture, spec.path);
		await expect(page.locator('[data-property-row]')).toHaveCount(3, { timeout: 25_000 });

		await expect(page.getByRole('heading', { level: 2, name: ISSUE_TYPES.DEFAULT_SECTION! })).toBeVisible();
		await expect(page.getByRole('heading', { level: 2, name: ISSUE_TYPES.TYPES_SECTION! })).toBeVisible();
		await expect(page.getByText(ISSUE_TYPES.DEFAULT_LABEL!, { exact: true })).toBeVisible();
		await expect(page.getByText(ISSUE_TYPES.DEFAULT_DESCRIPTION!, { exact: true })).toBeVisible();
		await expect(page.getByText(ISSUE_TYPES.NO_DEFAULT!, { exact: true })).toHaveCount(0);

		// the trigger's accessible name carries the default's label (`issue-types-settings-page.tsx:96`)
		await expect(page.getByRole('button', { name: copy.defaultTrigger(BUG.name) })).toBeVisible();

		await expect(chipOf(page, BUG.id, copy.defaultChip)).toHaveCount(1);
		await expect(chipOf(page, STORY.id, copy.defaultChip)).toHaveCount(0);
		await expect(chipOf(page, CUSTOM.id, copy.defaultChip)).toHaveCount(0);

		await openRowMenu(page, BUG.id);
		expect(await menuTexts(page), 'the row that is already the default offers no Make default').toEqual([
			copy.menuEdit,
			copy.menuDelete
		]);
		await page.keyboard.press('Escape');
		await openRowMenu(page, STORY.id);
		expect(await menuTexts(page), 'the rows that are not, do').toEqual([
			copy.menuEdit,
			copy.menuMakeDefault,
			copy.menuDelete
		]);
		await page.keyboard.press('Escape');

		report('issue types default section', { rows: await rowIds(page), consoleErrors: shield.consoleErrors() });
		expect(consoleFindings(shield), 'the Default section logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the Default section threw in the page').toEqual([]);
	});

	test('Make default from the row menu: the picked row is PUT with isDefault, the former default is cleared', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveTaskPropertyList(page, spec, fixture, servedRows(fixture, ISSUE_TYPE_ROWS));
		await openPropertyPage(page, fixture, spec.path);
		await expect(page.locator('[data-property-row]')).toHaveCount(3, { timeout: 25_000 });

		await openRowMenu(page, STORY.id);
		await page.getByRole('menuitem', { name: copy.menuMakeDefault, exact: true }).click();

		await expect
			.poll(async () => harness.puts.length, { message: 'Make default did not send the two PUTs' })
			.toBe(2);
		expectMakeDefaultPuts(harness, STORY, BUG);

		// The row menu announces on the list's live region; the Default section's own `<span>` stays empty
		// (`property-list.tsx:619` vs `issue-types-settings-page.tsx:123,76`, `-probe6-1.log` case A).
		await expect(announceOf(page)).toHaveText(copy.announceDefault(STORY.name));
		await expect(defaultAnnounceOf(page)).toHaveText('');
		await expect(chipOf(page, STORY.id, copy.defaultChip)).toHaveCount(1);
		await expect(chipOf(page, BUG.id, copy.defaultChip)).toHaveCount(0);
		await expect(page.getByRole('button', { name: copy.defaultTrigger(STORY.name) })).toBeVisible();

		report('issue types make default (row menu)', {
			puts: harness.puts,
			listAnnounce: await announceOf(page).innerText(),
			pickerAnnounce: await defaultAnnounceOf(page).innerText(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'Make default logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'Make default threw in the page').toEqual([]);
	});

	test('the Default picker lists every type, marks the current one, and Make default from it sends the same two PUTs', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveTaskPropertyList(page, spec, fixture, servedRows(fixture, ISSUE_TYPE_ROWS));
		await openPropertyPage(page, fixture, spec.path);
		await expect(page.locator('[data-property-row]')).toHaveCount(3, { timeout: 25_000 });

		const trigger = page.getByRole('button', { name: copy.defaultTrigger(BUG.name) });
		await trigger.click({ timeout: 25_000 });

		// Base UI renders the open picker as a `role="menu"` named by the trigger's own label, holding one
		// `role="menuitem"` per type (`data-slot="dropdown-menu-item"`, `-probe6-1.log` case B).
		const menu = page.getByRole('menu', { name: copy.defaultTrigger(BUG.name) });
		await expect(menu).toHaveCount(1);
		const items = menu.getByRole('menuitem');
		await expect(items).toHaveCount(3);
		// only the current default carries the `SelectedMark` (`issue-types-settings-page.tsx:116`, `common.SELECTED`)
		await expect(items.filter({ hasText: LOCALE.common.SELECTED! })).toHaveCount(1);
		await expect(items.filter({ hasText: LOCALE.common.SELECTED! })).toContainText(BUG.name);

		await page.getByRole('menuitem', { name: STORY.name }).click({ timeout: 25_000 });
		await expect
			.poll(async () => harness.puts.length, {
				message: 'Make default from the picker did not send the two PUTs'
			})
			.toBe(2);
		expectMakeDefaultPuts(harness, STORY, BUG);

		// …and the picker announces on its own `<span>`, not on the list's (`issue-types-settings-page.tsx:76,:123`,
		// `-probe6-1.log` case B: the `<p>` stayed empty while the `<span>` carried the sentence).
		await expect(defaultAnnounceOf(page)).toHaveText(copy.announceDefault(STORY.name));
		await expect(announceOf(page)).toHaveText('');
		await expect(chipOf(page, STORY.id, copy.defaultChip)).toHaveCount(1);
		await expect(page.getByRole('button', { name: copy.defaultTrigger(STORY.name) })).toBeVisible();

		report('issue types make default (picker)', {
			puts: harness.puts,
			pickerAnnounce: await defaultAnnounceOf(page).innerText(),
			listAnnounce: await announceOf(page).innerText(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the picker Make default logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the picker Make default threw in the page').toEqual([]);
	});
});

test.describe('lane-b · a write the API refuses', () => {
	const spec = KINDS.priority;
	const copy = copyOf(spec);
	const HIGH = PRIORITY_ROWS[1];
	const TYPED = 'Probe refused';

	/** Refusals the create answers with, and the reason `MutationErrorToaster` shows for each (`-probe3-1.log`). */
	const ADD_REFUSALS: Array<{ label: string; status: number; body: unknown; reason: string }> = [
		{
			label: '400',
			status: 400,
			body: { statusCode: 400, message: 'bad name' },
			reason: LOCALE.toasts.REASONS.INVALID!
		},
		{
			label: '500',
			status: 500,
			body: { statusCode: 500, message: 'boom' },
			reason: LOCALE.toasts.REASONS.SERVER!
		},
		{
			label: '409 that does not name the field',
			status: 409,
			body: { statusCode: 409, code: 'UNIQUE_CONSTRAINT_VIOLATION', message: 'taken' },
			reason: LOCALE.toasts.REASONS.CONFLICT!
		}
	];

	for (const refusal of ADD_REFUSALS) {
		test(`add refused with ${refusal.label}: what was typed stays in the editor, the list stays, the reason is a toast`, async ({
			page,
			fixture,
			shield
		}) => {
			const harness = await serveTaskPropertyList(page, spec, fixture, servedRows(fixture, PRIORITY_ROWS), {
				POST: { status: refusal.status, body: refusal.body }
			});
			await openPropertyPage(page, fixture, spec.path);
			await page.locator('[data-add-row="all"]').click({ timeout: 25_000 });
			await editorInput(page, copy.namePlaceholder).fill(TYPED);
			await editorSaveButton(page, copy.namePlaceholder, copy.add).click();

			await expect(toastOf(page, LOCALE.toasts.MUTATION_FAILED!)).toBeVisible({ timeout: 25_000 });
			await expect(toastOf(page, refusal.reason)).toBeVisible();
			await expect(editorInput(page, copy.namePlaceholder)).toHaveValue(TYPED);
			await expect(page.locator('[data-property-row]')).toHaveCount(3);
			expect(harness.posts, `the refused POST was sent, and sent once (${refusal.label})`).toHaveLength(1);
			expect(harness.posts[0].path).toBe(`/api/${spec.api}`);
			// nothing on the field: these refusals do not say which field they are about
			await expect(editorOf(page, copy.namePlaceholder).getByText(copy.nameTaken, { exact: true })).toHaveCount(
				0
			);
			await expect(editorInput(page, copy.namePlaceholder)).not.toHaveAttribute('aria-invalid', 'true');

			report(`add refused ${refusal.label}`, { posts: harness.posts, consoleErrors: shield.consoleErrors() });
			expect(
				consoleFindings(shield, [armedHttpError('POST', spec.api, refusal.status)]),
				`a refused add logged more than the client logs itself (${refusal.label})`
			).toEqual([]);
		});
	}

	test('add refused with 409 UNIQUE_CONSTRAINT_VIOLATION on the name: it says so on the field', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveTaskPropertyList(page, spec, fixture, servedRows(fixture, PRIORITY_ROWS), {
			POST: {
				status: 409,
				body: {
					statusCode: 409,
					code: 'UNIQUE_CONSTRAINT_VIOLATION',
					message: '"High" is taken',
					details: { field: 'name' }
				}
			}
		});
		await openPropertyPage(page, fixture, spec.path);
		await page.locator('[data-add-row="all"]').click({ timeout: 25_000 });
		await editorInput(page, copy.namePlaceholder).fill(TYPED);
		await editorSaveButton(page, copy.namePlaceholder, copy.add).click();

		// `isNameTakenError` + the editor's own branch (`error-feedback.ts:104-119`, `property-editor-row.tsx:126-132`)
		await expect(editorOf(page, copy.namePlaceholder).getByText(copy.nameTaken, { exact: true })).toBeVisible();
		await expect(editorInput(page, copy.namePlaceholder)).toHaveAttribute('aria-invalid', 'true');
		expect(
			await editorInput(page, copy.namePlaceholder).getAttribute('aria-describedby'),
			'the field error is announced to the input'
		).toBeTruthy();
		await expect(toastOf(page, LOCALE.toasts.REASONS.NAME_TAKEN!)).toBeVisible();
		await expect(page.locator('[data-property-row]')).toHaveCount(3);
		expect(harness.posts, 'the refused POST was sent, and sent once').toHaveLength(1);

		report('add refused 409 name', { posts: harness.posts, consoleErrors: shield.consoleErrors() });
		expect(
			consoleFindings(shield, [armedHttpError('POST', spec.api, 409)]),
			'a refused add logged more than the client logs itself'
		).toEqual([]);
	});

	test('edit refused with 409 on the name: it says so on the field, and the row keeps the name it had', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveTaskPropertyList(page, spec, fixture, servedRows(fixture, PRIORITY_ROWS), {
			PUT: {
				status: 409,
				body: {
					statusCode: 409,
					code: 'UNIQUE_CONSTRAINT_VIOLATION',
					message: 'taken',
					details: { field: 'name' }
				}
			}
		});
		await openPropertyPage(page, fixture, spec.path);
		await expect(page.locator('[data-property-row]')).toHaveCount(3, { timeout: 25_000 });
		await openRowMenu(page, HIGH.id);
		await page.getByRole('menuitem', { name: copy.menuEdit, exact: true }).click();
		await editorOf(page, copy.namePlaceholder).locator('input').first().fill('Renamed refused');
		await editorSaveButton(page, copy.namePlaceholder, copy.editorSave).click();

		await expect(editorOf(page, copy.namePlaceholder).getByText(copy.nameTaken, { exact: true })).toBeVisible();
		await expect(editorOf(page, copy.namePlaceholder).locator('input').first()).toHaveValue('Renamed refused');
		await expect(toastOf(page, LOCALE.toasts.REASONS.NAME_TAKEN!)).toBeVisible();
		expect(harness.puts, 'the refused PUT was sent, and sent once').toHaveLength(1);
		expect(harness.puts[0].path, 'PUT <kind path>/<id>').toBe(`/api/${spec.api}/${HIGH.id}`);

		// Out of a refused editor by its own Cancel button. Escape is not one here: the key handler is the editor
		// form's `onKeyDown` (`property-editor-row.tsx:46-50,:139,:149`), and after the click on Save the key no
		// longer reaches it — in `-s3-lane-b-taskprops-1.log` the editor was still open 15 s after `Escape`.
		await editorOf(page, copy.namePlaceholder)
			.getByRole('button', { name: copy.editorCancel, exact: true })
			.click();
		await expect(editorOf(page, copy.namePlaceholder)).toHaveCount(0);
		await expect(page.locator('[data-property-row]')).toHaveCount(3);
		await expect(page.locator(`[data-property-row="${HIGH.id}"] span.min-w-0`)).toHaveText(HIGH.name);
		expect(harness.puts, 'closing the refused editor sent a second request').toHaveLength(1);

		report('edit refused 409 name', { puts: harness.puts, consoleErrors: shield.consoleErrors() });
		expect(
			consoleFindings(shield, [armedHttpError('PUT', spec.api, 409, HIGH.id)]),
			'a refused edit logged more than the client logs itself'
		).toEqual([]);
	});

	/** Refusals the delete answers with: the dialog stays open and carries its own reason line (`-probe3b-1.log`). */
	const DELETE_REFUSALS: Array<{ label: string; status: number; body: unknown; reason: string; noise: string[] }> = [
		{
			label: '500',
			status: 500,
			body: { statusCode: 500, message: 'boom' },
			reason: LOCALE.toasts.REASONS.SERVER!,
			noise: [armedHttpError('DELETE', spec.api, 500, HIGH.id)]
		},
		{
			label: '403',
			status: 403,
			body: { statusCode: 403, message: 'nope' },
			reason: LOCALE.toasts.REASONS.PERMISSION!,
			noise: [armedForbidden('DELETE', spec.api, HIGH.id)]
		}
	];

	for (const refusal of DELETE_REFUSALS) {
		test(`delete refused with ${refusal.label}: the dialog stays open and shows its reason inside itself`, async ({
			page,
			fixture,
			shield
		}) => {
			const harness = await serveTaskPropertyList(page, spec, fixture, servedRows(fixture, PRIORITY_ROWS), {
				DELETE: { status: refusal.status, body: refusal.body }
			});
			await openPropertyPage(page, fixture, spec.path);
			await expect(page.locator('[data-property-row]')).toHaveCount(3, { timeout: 25_000 });
			await openRowMenu(page, HIGH.id);
			await page.getByRole('menuitem', { name: copy.menuDelete, exact: true }).click();
			const dialog = page.getByRole('dialog', { name: copy.deleteTitle });
			await expect(dialog).toBeVisible();
			await expect(dialog.locator('[role="alert"]')).toHaveCount(0);

			await dialog.getByRole('button', { name: copy.deleteConfirm, exact: true }).click();
			await expect(dialog).toBeVisible();
			await expect(dialog.getByText(refusal.reason, { exact: true })).toBeVisible();
			await expect(page.locator(`[data-property-row="${HIGH.id}"]`)).toBeVisible();
			expect(harness.deletes, `the refused DELETE was sent, and sent once (${refusal.label})`).toHaveLength(1);
			expect(harness.deletes[0].path, 'DELETE <kind path>/<id>').toBe(`/api/${spec.api}/${HIGH.id}`);
			await expect(toastOf(page, refusal.reason)).toBeVisible();

			// Cancel still closes it, with nothing else sent.
			await dialog.getByRole('button', { name: copy.editorCancel, exact: true }).click();
			await expect(dialog).toHaveCount(0);
			expect(harness.deletes, 'closing the refused dialog sent a second request').toHaveLength(1);

			report(`delete refused ${refusal.label}`, {
				deletes: harness.deletes,
				consoleErrors: shield.consoleErrors()
			});
			expect(
				consoleFindings(shield, refusal.noise),
				`a refused delete logged more than the client logs itself (${refusal.label})`
			).toEqual([]);
		});
	}
});
