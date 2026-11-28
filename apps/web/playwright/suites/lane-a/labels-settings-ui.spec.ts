import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Page, Route } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit, type BootstrapFixture, type MockScenario } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * Settings › Team › Labels (`/settings/team/labels`): what a label row prints, what this page offers to a plain team
 * member, and the four writes the labels send on their own — `POST /tags`, `PUT /tags/:id`, `DELETE /tags/:id` and the
 * catalog's `POST /tags/bulk` with its per-label fallback.
 * `suites/mock/labels.spec.ts` owns the catalog's own screen (the empty list, one bulk request, the added marks, the
 * search, a duplicate name refused before any request); `suites/lane-b/task-property-settings-ui.spec.ts` owns the
 * shared list on priorities, sizes, versions and issue types; `suites/lane-a/task-statuses-settings-ui.spec.ts` owns
 * the status-only half of that list. What is here is the label-only half: a row without a drag handle, a name kept as
 * stored, a glyph that never shows an icon, a list nobody may not write, and the bulk route's absence.
 *
 * Lane: **lane-a** (app `http://localhost:3031`, mock `127.0.0.1:3992`, control `3994`, `playwright/test-servers.ts`).
 * Measurements: `D:\Coding\.tmp\s3-lane-a-labels-probe1.log` (the first attempt: every test lost before its first
 * `MEASURE`, because that draft intercepted `GET /api/organization-team` and answered it 599, so the shell never
 * became ready) and `-probe2.log` (D1: the served bootstrap, and the shell becoming ready on it); `-probe3.log`
 * (P1 the list and its menus, P2 the two Add routes and their POSTs, P3 the editor and its PUT, P4/P4b the delete
 * dialog and a refusal inside it, P5 a refused read, P6/P6b/P6c the catalog's fallback and its three toasts, P7 a
 * plain member, P8 a user with no team, P9 two edits in a row, P10 a create refused 409, P11–P13 a 500 on each
 * write); `-probe4.log` (Q1 the two `Add label` buttons, Q3 an unchanged draft, Q4 the delete dialog and its three
 * answers, Q5 the catalog's own copy, Q6 two edits with one answer held, Q7 a create refused 409 and 500, Q9 the
 * bulk answer); `-probe5.log` (R1 the create editor, R2 the edit editor, R3 a colour-only PUT, R4 the bulk body,
 * R5 a cancelled catalog add); `-probe6.log` (S1 the list-foot Add row, S2/S3 a row that is being edited, S3 an edit
 * refused 500, S4 the delete dialog after its answer, S5 a name refused client-side and server-side); `-probe7.log`
 * (a catalog add where every label is refused). Measurement runs of this file: `-measure1.log` (9 passed / 5
 * failed — all five were wrong expectations of mine, each fixed from what the run printed) and `-measure2.log`
 * (14 passed). Acceptance runs: `D:\Coding\.tmp\s3-lane-a-labels-1.log` and `-2.log`.
 *
 * ## Components this file drives (file:line, each opened before it is named)
 *
 * `app/[locale]/(main)/settings/team/labels/page.tsx` → `core/components/settings/pages/task-properties/labels-settings-page.tsx:14-60`
 * (`LabelsSettingsContent` → `TeamSettingsGate` (`core/components/settings/kit/team-settings-gate.tsx:39-56`,
 * `requiresManager` left at its default `false`) → `TaskPropertySettingsBody kind="label"`
 * (`task-property-settings-body.tsx:23-60`, the header's `Add label` `:43-46` and its `secondaryAction`
 * `:31-36`) → `PropertyList kind="label"` (`core/components/settings/pages/task-properties/property-list.tsx:261-625`,
 * one `all` group `:98-101` `:593-610`, `AddRow:160-190`, `EmptyState:194-229`, rows `:490-522`, the read-failure
 * `Notice:568-581`, the live region `:619-621`) → `PropertyRow` + its `RowMenu` (`property-row.tsx:57-141` `:143-193`),
 * `PropertyEditorRow` (`property-editor-row.tsx:53-231`) with `PropertyColorField`
 * (`property-color-field.tsx:54-137`) and `PropertyPreview` (`property-preview.tsx:25-52`), `PropertyDeleteDialog` /
 * `PropertyDeleteConfirm` (`property-delete-dialog.tsx:26-112` over `core/components/settings/kit/danger.tsx:76-199`),
 * `LabelCatalogDialog` (`label-catalog-dialog.tsx:127-264`) with `useAddCatalogLabels`
 * (`core/hooks/settings/use-add-catalog-labels.ts:34-91`), and `TaskPropertyIcon`
 * (`core/components/tasks/task-property-icon.tsx:403-465`).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's mock and shell. **Served by this file:** the whole read (`GET /api/task-metadata/bootstrap`,
 * whose `taskLabels` section is this file's store) and every write — `POST /api/tags`, `POST /api/tags/bulk`,
 * `PUT /api/tags/<id>`, `DELETE /api/tags/<id>` — because the mock answers `taskLabels` as an empty page
 * (`cypress/support/mock-gauzy-server.mjs:336-343`, `:686`, `:693`) and has no handler for those writes at all (its
 * generic tail echoes and stores nothing). Every answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204), because the page sits on `localhost:3031` and the API on
 * `127.0.0.1:3992`; `route.fetch()` is never called, so the mock's own log proves the page acted on this file.
 * Answers are store-backed: a create, an edit or a delete changes what the next read answers, and a refusal changes
 * nothing. The bootstrap's other six sections are restated as the mock answers them, so the shell reads what it
 * usually reads (`mock-gauzy-server.mjs:336-343` for the seven sections, `:156-181` for its two built-in statuses,
 * which this file keeps so the fixture task still names a real one).
 *
 * **The read is the bootstrap bundle, never `GET /api/tags/level`.** `useLabelSettings` feeds its list from
 * `useTaskLabelsQuery`, which takes `taskMetadataQuery.data?.taskLabels` while `useBootstrap` is true —
 * `useBootstrap = !publicTeam` (`core/hooks/tasks/use-task-metadata-bootstrap-query.ts:35`) — and keeps the per-team
 * `GET /tags/level` query disabled in exactly that case (`core/hooks/tasks/use-task-labels-query.ts:31-43`,
 * `core/services/client/api/tasks/task-label.service.ts:44-65`). Measured on this lane (`-probe1.log` P1): one
 * `GET …/api/task-metadata/bootstrap?organizationId=…&organizationTeamId=…&projectId=…&include=issueTypes,
 * relatedIssueTypes,taskLabels,taskPriorities,taskSizes,taskStatuses,taskVersions` and no `GET …/api/tags/level`. The
 * bootstrap does not validate `taskLabels` against a schema — the `default` branch of `selectAndValidate` passes the
 * section through (`core/services/client/api/tasks/task-metadata-bootstrap.service.ts:56-88`) — so a served row
 * carries the keys `propertyItemOf` reads (`core/lib/utils/settings-task-properties.ts:144-160`) and nothing else.
 *
 * ## Findings (measured; each names the log it came from)
 *
 * 1. **The list prints the served order, the stored case, and dashes as spaces.** `bug`, `Follow up`, `Needs Review`,
 *    `Urgent FIX`, `System ish` for the five rows this file serves (`-probe3.log` P1, `-measure2.log`). The label span
 *    is `item.label` with no `capitalize` class, because `KINDS_IN_TITLE_CASE` excludes `label`
 *    (`property-row.tsx:27` `:155` `:177`).
 * 2. **A label's glyph is a coloured circle, never an icon.** A stored colour reaches the span as
 *    `style="color: oklch(from rgb(215, 58, 74) 0.62 min(3 * c, 0.16) h);"`; `color: null` gets no `style` attribute
 *    at all plus the class `text-muted-foreground`. A label served `icon: 'ever-icons/task-labels/custom-label.svg'`
 *    still paints 0 `<img>`: `TaskPropertyIcon` returns the colour glyph for `kind === 'label'`
 *    (`task-property-icon.tsx:403-408`, "label icons are not part of the design (#5024)"). Every row also has 0 drag
 *    handles and no `draggable` attribute — labels pass no `onMove` (`-probe3.log` P1).
 * 3. **The row menu is `Edit` + `Delete`, neither disabled, on an `isSystem` label too, and never offers `Make
 *    default` / `Move up` / `Move down`.** Labels skip the task-settings rule (`property-list.tsx:44-47`) so
 *    `readOnlyHint` is never set, and `isDeletionRefused` is false for `kind === 'label'` — its guard is
 *    `KINDS_WITH_PROTECTED_ROWS.has(kind) && item.isSystem` (`settings-task-properties.ts:541-544`), so the
 *    `BUILT_IN_DELETE` label that statuses get never appears here (`-probe3.log` P1, `-measure2.log` member run).
 * 4. **The `Default` chip prints on a label row** whenever the read serves `isDefault: true`, and only on that row
 *    (`property-row.tsx:178`); nothing on this page can set it, because no `onMakeDefault` is passed.
 * 5. **Both Add controls carry the same accessible name.** `getByRole('button', { name: 'Add label' })` matches 2 —
 *    the header button (`task-property-settings-body.tsx:43-46`) and the list-foot `AddRow`
 *    (`property-list.tsx:160-190`) — so the header one is taken through `page.locator('header')` and the foot one
 *    through `[data-add-row="all"]` (`-probe4.log` Q1, `-probe6.log` S1).
 * 6. **One read behind the list, but not a fixed number of them.** Every read is the bootstrap bundle
 *    (`GET /api/task-metadata/bootstrap?…&include=issueTypes,relatedIssueTypes,taskLabels,…`), and `GET /api/tags/level`
 *    is never asked (`useBootstrap = !publicTeam`, `use-task-labels-query.ts:31-43`). The count varies with the run —
 *    1 in `-probe3.log` P1, 2 identical carries in `-measure1.log` — so the tests assert "at least one, and every one
 *    of them the same request" plus a per-write delta, never an exact total.
 * 7. **A create draft starts on a colour, not on an empty one:** `defaultSwatchFor(5)` = `#F97316` =
 *    `TASK_PROPERTY_COLOR_SWATCHES[5]` for a five-label list (`settings-task-properties.ts:58-76`), and that swatch is
 *    `aria-pressed="true"`. The POST body is `{name, color, organizationId, tenantId, organizationTeamId}` — no `icon`
 *    key, `propertyLookBodyOf` drops a null one (`settings-task-properties.ts:391-397`), and `organizationTeamId` is
 *    added further down by `mergeTaskLabelData` (`core/lib/helpers/task.ts:23-65`). Same body from the header Add and
 *    from the foot Add row (`-probe5.log` R1, `-probe6.log` S1).
 * 8. **Two name refusals happen before any request:** an empty name (field alert `Give it a name to save it.`,
 *    `aria-invalid="true"`, 0 writes) and a name the read list already carries (`isNameTakenByAnother`,
 *    `property-list.tsx:473-476`, 0 writes). A name only the server knows is taken costs 1 `POST /tags` and then
 *    lands on the same field, with `aria-describedby` equal to that alert's own `id` (`-probe5.log` R1, `-probe6.log`
 *    S5, `-probe4.log` Q7).
 * 9. **A 409 on the name and any other refusal are two different shapes.** The name-taken 409
 *    (`isNameTakenError`, `error-feedback.ts:118-131`) puts the message on the field and re-reads the list
 *    (`use-create-task-label.ts:36-40`, `use-edit-task-label.ts:37-41` `onSettled`); a 500 leaves the editor open with
 *    what was typed, sets no field alert and no `aria-invalid`, and reaches only the shell toast
 *    (`toasts.REASONS.SERVER`: `That change was not saved` / `The server could not complete it. Try again in a
 *    moment.`) — and it re-reads nothing: `-probe6.log` S3 recorded 1 read for the whole page after a refused edit,
 *    where a name-taken 409 recorded 2. The editor never closes on a refusal (`property-editor-row.tsx:109-136`).
 * 10. **A row that is being edited is not in the printed list at all** — 0 `[data-property-row]` nodes and 0 label
 *    spans for it (`-probe6.log` S2/S3) — and `property-list.tsx:52` holds exactly one `editor`, so opening the next
 *    row's editor replaces this one even while its request is still unanswered. Nothing is optimistic: with the first
 *    `PUT` held, its row is a plain row again showing its stored name, and it changes to the new one only after the
 *    answer lands and the re-read arrives (`-probe4.log` Q6, and the held-answer test here).
 * 11. **An unchanged draft sends nothing and still announces.** `usePropertyActions.update` returns early when
 *    `isDraftChanged` is false (`use-property-actions.ts:36-44`, `settings-task-properties.ts:371-376`), while
 *    `saveDraft` announces `ANNOUNCE_SAVED` after that awaited call either way
 *    (`property-list.tsx:447-448`): 0 writes and `Follow up saved.` for a Save that changed nothing
 *    (`-probe4.log` Q3). A refusal announces nothing, because the throw skips both lines (`property-list.tsx:421-451`).
 * 12. **A label served `color: null` is put back with a generated colour.** Editing `Follow-up` sends
 *    `color: '#84CC16'`, which `mergeTaskLabelData` fills from `generateDefaultColor(name)`
 *    (`core/lib/helpers/task.ts:43-46`, `core/lib/helpers/colors.ts:20-34`, `core/constants/data/mock-data.ts:79-90`)
 *    and which is not one of the ten swatches, so the editor shows it as `Custom color` (`-probe6.log` S3).
 * 13. **An edit always sends a name, and when nobody renamed it that name is the stored one** — `Follow-up` with its
 *    dash, not the printed `Follow up` (`editedNameOf`, `settings-task-properties.ts:354-363`; `-probe5.log` R3).
 * 14. **The delete confirmation and its refusal live in the dialog.** Text `Delete this label? This cannot be
 *    undone. <label> It leaves the choices of every task in this team. Tasks that carry it lose it. Cancel Delete
 *    label`; a refused delete puts the reason in a `<p role="alert">` inside the same dialog (`danger.tsx:166`) and
 *    leaves the row listed and the announcement untouched (`-probe4.log` Q4). The dialog node is still mounted at the
 *    instant its answer arrives and only reaches 0 on a poll (`-probe6.log` S4).
 * 15. **The catalog's bulk route and its fallback.** One `POST /api/tags/bulk` whose body is
 *    `{items:[{name,color,organizationId,tenantId,organizationTeamId},…], tenantId, organizationId}`; a 404 (or 405)
 *    is `lacksBulkRoute` (`use-add-catalog-labels.ts:24-27`) and the same items then go as one `POST /api/tags` each,
 *    4 at a time (`:31`), with identical per-item bodies (`-probe3.log` P6, `-probe4.log` Q9, and the 404 test here).
 *    A refusal of the bulk route at any other status sends no fallback at all (`-probe3.log` P6c). A cancelled add
 *    writes nothing (`-probe5.log` R5).
 * 16. **Three catalog outcomes, three toasts, three dialog states** (`label-catalog-dialog.tsx:180-207`): all
 *    accepted → `success` `2 labels added`, dialog closed, both rows printed; one refused → `warning`
 *    `Added: 1. Not added: 1, the team may already have them.`, dialog closed, only the accepted row printed; none
 *    accepted → `error` `The labels could not be added. Try again.`, dialog still open with `2 labels picked` and
 *    `Add 2 labels`, rows unchanged (`-probe7.log`). Each run re-reads the labels even when nothing was filed.
 * 17. **Console shape.** The HttpClient logs `HTTP Error: <VERB> <path> <status>` for every armed refusal this file
 *    causes (and percent-encodes the bootstrap query in its own line, `-probe3.log` P5); the dev-only
 *    `Mutation failed: ApiError: …` line appears only for the three TanStack mutations — never for a catalog add,
 *    which is a direct service call (`-probe7.log` recorded 3 `HTTP Error` lines and no `Mutation failed:`).
 * 18. **A refusal writes two toasts, and they expire.** Sonner is mounted at `bottom-right` with
 *    `duration={5000}`, `closeButton` and `visibleToasts={3}` (`app-toaster.tsx:62-70`), so a dev
 *    `Mutation failed … Copy details` toast and the app's own reason toast are both gone 5 s after they appear;
 *    every toast check below is awaited before the requests and re-reads that outlive it.
 * 19. **`getByRole('alert')` at page level is one more than the page's own errors:** the layout carries a
 *    document-level empty `alert` region, so alerts are scoped to the editor or the dialog here
 *    (`-probe5.log` R1: 1 field alert, 2 page alerts).
 * 20. **A plain team member gets the whole page.** `TeamSettingsGate` is used here without `requiresManager`
 *    (`labels-settings-page.tsx:14-60`, `team-settings-gate.tsx:39-56`), so with `manager: false` there is no
 *    `ManagersOnly` notice, both Add controls and Browse are enabled, the `isSystem` row's menu is the same
 *    enabled `Edit` / `Delete`, and the member's `POST /tags` lands with the same body a manager's gets
 *    (`-probe3.log` P7, `-measure2.log`).
 *
 * ## What this file does not cover
 *
 * - The catalog's own screen — the empty list, the search field, the added marks, a duplicate name refused before any
 *    request — which `suites/mock/labels.spec.ts` owns. Here the dialog is only driven far enough to send its write.
 * - The no-team gate. Measured (`-probe3.log` P8: `Create your team or join existing`, `Create new team`, 0 rows, via
 *    `NoTeam` and the `CreateTeamModal` it opens, `no-team.tsx:24-27`) but not part of this brief's list, and it is a
 *    shell state rather than a labels behaviour.
 * - The read-only and reorder halves of the shared list (drag handles, `Move up` / `Move down`, `Make default`, the
 *    `Built-in` menu labels) — labels never reach any of them; `suites/lane-b/task-property-settings-ui.spec.ts` and
 *    `suites/lane-a/task-statuses-settings-ui.spec.ts` own those on the kinds that do.
 * - A public team, which is the only case where `GET /api/tags/level` replaces the bootstrap
 *    (`use-task-labels-query.ts:31-43`). This file never served a public team, so that read never appears here.
 * - The label icon picker: absent for labels by design (`task-property-icon.tsx:403-408`), so nothing here can prove
 *    it stays absent on the other kinds.
 * - Anything a label does to the task side: the task's label chips, the entry-labels picker, label filters,
 *    timesheet labels. Every write here is verified through this page's own re-read only.
 * - Real Gauzy behaviour: the 409 payload shape, what a real `POST /tags/bulk` answers, and whether the real API has
 *    the bulk route at all are this file's own store's opinions, not measurements of a server.
 * - Other locales, and the page's responsive variants. All copy is read from `locales/en.json` by key.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const LABELS_PATH = '/settings/team/labels';
const BOOTSTRAP_ROUTE = '/api/task-metadata/bootstrap';
const TAGS_ROUTE = '/api/tags';
const TAGS_BULK_ROUTE = '/api/tags/bulk';
const TAGS_LEVEL_ROUTE = '/api/tags/level';
const TEAMS_ROUTE = '/api/organization-team';

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
	pages: { about: { COPY_DETAILS: string }; unauthorized: { TRY_AGAIN: string } };
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string> };
	settings: {
		common: { MANAGERS_ONLY_TITLE: string };
		entries: { labels: { TITLE: string; DESCRIPTION: string } };
		taskProperties: Record<string, string> & { delete: Record<string, string> };
		labelCatalog: Record<string, string> & { categories: Record<string, string> };
	};
};
const PROPERTIES = LOCALE.settings.taskProperties;
const CATALOG = LOCALE.settings.labelCatalog;
const PAGE = LOCALE.settings.entries.labels;

/** The catalog's own names and colours, read from the file the dialog lists (`core/lib/utils/task-label-catalog.json`). */
const CATALOG_DATA = JSON.parse(
	readFileSync(join(__dirname, '../../../core/lib/utils/task-label-catalog.json'), 'utf8')
) as Record<string, Record<string, string>>;

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
	pageTitle: PAGE.TITLE,
	pageDescription: PAGE.DESCRIPTION,
	browse: CATALOG.BROWSE,
	add: selectBranch(PROPERTIES.ADD!, 'label'),
	namePlaceholder: selectBranch(PROPERTIES.NAME_PLACEHOLDER!, 'label'),
	nameRequired: PROPERTIES.NAME_REQUIRED!,
	nameTaken: selectBranch(PROPERTIES.NAME_TAKEN!, 'label'),
	errorTitle: selectBranch(PROPERTIES.ERROR_TITLE!, 'label'),
	errorDescription: PROPERTIES.ERROR_DESCRIPTION!,
	retry: LOCALE.pages.unauthorized.TRY_AGAIN!,
	color: PROPERTIES.COLOR!,
	preview: PROPERTIES.PREVIEW!,
	hexHint: PROPERTIES.HEX_HINT!,
	customColor: PROPERTIES.CUSTOM_COLOR!,
	rowActions: (name: string) => PROPERTIES.ROW_ACTIONS!.replace('{name}', name),
	defaultChip: PROPERTIES.DEFAULT!,
	menuEdit: LOCALE.common.EDIT!,
	menuDelete: LOCALE.common.DELETE!,
	menuMakeDefault: PROPERTIES.MAKE_DEFAULT!,
	menuMoveUp: PROPERTIES.MOVE_UP!,
	menuMoveDown: PROPERTIES.MOVE_DOWN!,
	editorSave: LOCALE.common.SAVE!,
	editorCancel: LOCALE.common.CANCEL!,
	announceAdded: (name: string) => PROPERTIES.ANNOUNCE_ADDED!.replace('{name}', name),
	announceSaved: (name: string) => PROPERTIES.ANNOUNCE_SAVED!.replace('{name}', name),
	announceDeleted: (name: string) => PROPERTIES.ANNOUNCE_DELETED!.replace('{name}', name),
	deleteTitle: selectBranch(PROPERTIES.delete.TITLE!, 'label'),
	deleteDescription: PROPERTIES.delete.DESCRIPTION!,
	deleteConfirm: selectBranch(PROPERTIES.delete.CONFIRM!, 'label'),
	deleteChoicesGone: PROPERTIES.delete.CHOICES_GONE!,
	deleteLabelRemoved: PROPERTIES.delete.LABEL_REMOVED!,
	catalogTitle: CATALOG.TITLE!,
	catalogSearch: CATALOG.SEARCH!,
	catalogAdd: (count: number) => pluralBranch(CATALOG.ADD!, count),
	catalogSelected: (count: number) => pluralBranch(CATALOG.SELECTED!, count),
	catalogAddedToast: (count: number) => pluralBranch(CATALOG.ADDED_TOAST!, count),
	catalogPartialToast: (added: number, failed: number) =>
		CATALOG.PARTIAL_TOAST!.replace('{added}', String(added)).replace('{failed}', String(failed)),
	catalogFailedToast: CATALOG.FAILED_TOAST!,
	managersOnly: LOCALE.settings.common.MANAGERS_ONLY_TITLE!,
	mutationFailed: LOCALE.toasts.MUTATION_FAILED!,
	copyDetails: LOCALE.pages.about.COPY_DETAILS!,
	reason: (key: string) => LOCALE.toasts.REASONS[key]!
};

const report = (label: string, value: unknown) =>
	console.log(`[lane-a labels] MEASURE ${label} ${JSON.stringify(value)}`);

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
const sorted = <T extends string>(items: T[]) => [...items].sort();

/** `dataColorHue`'s `oklch(from <hex> …)` reaches Chrome's `style` attribute as `rgb(…)` (lane-b spec `:362-367`). */
const rgbOf = (hex: string): string => {
	const digits = hex.replace('#', '');
	const parts = [0, 2, 4].map((index) => parseInt(digits.slice(index, index + 2), 16));
	return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
};
/** The whole declaration a served colour paints on the row's glyph (`task-property-icon.tsx:98-103` `:443-455`). */
const glyphStyle = (hex: string): string => `color: oklch(from ${rgbOf(hex)} 0.62 min(3 * c, 0.16) h);`;

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * `mutation-error-toaster.tsx:47-48`, printed for every failed mutation in dev mode with the message the stub answered.
 * Excused only by the exact message a test armed, never by the bare `Mutation failed:` prefix, so a mutation failing
 * anywhere else is a finding.
 */
const armedMutation = (message: string) => (line: string) => line.includes(`Mutation failed: ApiError: ${message}`);

/**
 * The client's own HTTP error line for a refusal this file armed (`logger-adapter.service.ts:186-199`): the logged
 * `url` is the axios `config.url`, so a `GET` carries its whole query string. A line is excused only when it names the
 * verb, the path this file armed **and** that status.
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
/** The app's own toasts, kept apart from the dev-only `DEV … failed … Copy details` toast (`dev-error-toaster.tsx`). */
const appToastsOf = (page: Page) => toastsOf(page).filter({ hasNotText: copyOf.copyDetails });
/** The pointer must rest away from the toaster before a toast is waited out: a hover pauses every countdown. */
const parkPointer = (page: Page) => page.mouse.move(2, 2);

const UUID_LEAD: Record<string, string> = { tag: '7f3c0000' };
/** A uuid the client's `uuIdSchema` accepts (`core/types/schemas/common/base.schema.ts:7`). */
const uuid = (kind: string, index: number) => `${UUID_LEAD[kind]}-0000-4000-8000-${String(index).padStart(12, '0')}`;

/** Gauzy's key for a label name: lower case, dashes and runs of spaces as one space (`task-label-catalog.ts:34-39`). */
const nameKeyOf = (name: string) => name.toLowerCase().replaceAll('-', ' ').replaceAll(/\s+/g, ' ').trim();

/** A label as this file serves it: only the keys `propertyItemOf` reads (`settings-task-properties.ts:144-160`). */
type ServedLabel = {
	id: string;
	name: string;
	color: string | null;
	icon: string | null;
	fullIconUrl: string | null;
	order: number | null;
	isDefault: boolean;
	isSystem: boolean;
	tenantId: string;
	organizationId: string;
	organizationTeamId: string | null;
};

type Refusal = { status: number; message: string; code?: string; details?: Record<string, unknown> };

/** Gauzy's refusal of a name another label of the team already has (`error-feedback.ts:104-116`). */
const nameTakenRefusal = (name: string): Refusal => ({
	status: 409,
	message: `"${name}" is taken`,
	code: 'UNIQUE_CONSTRAINT_VIOLATION',
	details: { field: 'name' }
});

type ServedScript = {
	labels: ServedLabel[];
	/** The mock's own two built-in statuses, restated in the bootstrap this file replaces. */
	statuses: Record<string, unknown>[];
	readRefusal?: Refusal;
	createRefusal?: Refusal;
	editRefusal?: Refusal;
	deleteRefusal?: Refusal;
	/** Answer `POST /tags/bulk` with this refusal (404 / 405) so the per-label fallback runs. */
	bulkRefusal?: Refusal;
	/** Refuse only these names on a single `POST /tags` (a catalog add where some labels fail). */
	refuseNames?: string[];
	/** Hold the first write of this method until `releaseWrites()` is called. */
	holdFirstWriteOf?: string;
	/** Answer `GET /api/organization-team` with no teams at all (the gate's no-team case). */
	noTeams?: boolean;
};

type ServedCall = {
	method: string;
	path: string;
	search: string;
	body: Record<string, unknown> | null;
	/** false while the answer is being held (`holdFirstWriteOf`). */
	answered: boolean;
};

type LabelsApi = {
	calls: ServedCall[];
	labels: ServedLabel[];
	reads: () => ServedCall[];
	writes: () => ServedCall[];
	writesOf: (method: string, path?: string) => ServedCall[];
	releaseWrites: () => void;
	/** Stop refusing the read, so the next one answers the store (the Retry case). */
	allowReads: () => void;
	/** Refuse the next writes of these names too. */
	refuseNamesToo: (names: string[]) => void;
	/** Change what the next create / edit / delete answers. */
	setWriteRefusals: (patch: { create?: Refusal | null; edit?: Refusal | null; delete?: Refusal | null }) => void;
	shapes: () => string[];
};

/**
 * This file's stand-in for the team's labels API, on the mock origin: the mock answers `taskLabels` as an empty page
 * and has no handler for any label write, so the whole read and every write are answered here. The list answer is
 * always the current store, so a create, an edit or a delete changes what the next read answers and a refusal changes
 * nothing. `route.fetch()` is never called.
 */
async function serveLabels(page: Page, script: ServedScript): Promise<LabelsApi> {
	const store = { labels: [...script.labels] };
	const calls: ServedCall[] = [];
	const state = {
		createRefusal: script.createRefusal,
		editRefusal: script.editRefusal,
		deleteRefusal: script.deleteRefusal,
		refuseNames: [...(script.refuseNames ?? [])]
	};
	let refuseReads = Boolean(script.readRefusal);

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
			(script.noTeams && url.pathname === TEAMS_ROUTE) ||
			url.pathname === TAGS_BULK_ROUTE ||
			url.pathname === TAGS_LEVEL_ROUTE ||
			url.pathname.startsWith(`${TAGS_ROUTE}/`) ||
			url.pathname === TAGS_ROUTE);

	const answer = (route: Route, status: number, body?: unknown) =>
		route.fulfill({
			status,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: body === undefined ? '' : JSON.stringify(body)
		});
	const pagination = <T>(items: T[]) => ({ items, total: items.length });
	const refuse = (route: Route, failure: Refusal) =>
		answer(route, failure.status, {
			statusCode: failure.status,
			message: failure.message,
			...(failure.code ? { code: failure.code } : {}),
			...(failure.details ? { details: failure.details } : {})
		});
	const createdLabel = (name: string, body: Record<string, unknown>): ServedLabel => ({
		id: uuid('tag', 900 + store.labels.length),
		name,
		color: (body.color as string) ?? null,
		icon: (body.icon as string) ?? null,
		fullIconUrl: null,
		order: null,
		isDefault: false,
		isSystem: false,
		tenantId: String(body.tenantId ?? ''),
		organizationId: String(body.organizationId ?? ''),
		organizationTeamId: (body.organizationTeamId as string) ?? null
	});
	const isNameTaken = (name: string) =>
		state.refuseNames.map(nameKeyOf).includes(nameKeyOf(name)) ||
		store.labels.some((label) => nameKeyOf(label.name) === nameKeyOf(name));

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		// The mock answers a preflight itself (`mock-gauzy-server.mjs:1097-1101`); this route replaced it, so it must.
		if (method === 'OPTIONS') return answer(route, 204);

		const body = request.postData() ? (JSON.parse(request.postData() as string) as Record<string, unknown>) : null;
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

		if (url.pathname === TEAMS_ROUTE && method === 'GET') {
			return answer(route, 200, pagination([]));
		}

		if (url.pathname === BOOTSTRAP_ROUTE && method === 'GET') {
			if (script.readRefusal && refuseReads) return refuse(route, script.readRefusal);
			return answer(route, 200, {
				taskStatuses: pagination(script.statuses),
				taskPriorities: pagination([]),
				taskSizes: pagination([]),
				taskLabels: pagination(store.labels),
				taskVersions: pagination([]),
				issueTypes: pagination([]),
				relatedIssueTypes: pagination([])
			});
		}

		if (url.pathname === TAGS_LEVEL_ROUTE && method === 'GET') {
			return answer(route, 200, pagination(store.labels));
		}

		const tagId = url.pathname.startsWith(`${TAGS_ROUTE}/`)
			? decodeURIComponent(url.pathname.slice(TAGS_ROUTE.length + 1))
			: '';

		if (url.pathname === TAGS_BULK_ROUTE && method === 'POST') {
			if (script.bulkRefusal) return refuse(route, script.bulkRefusal);
			const items = (body?.items as Array<Record<string, unknown>>) ?? [];
			const succeeded: Array<{ index: number; id: string }> = [];
			const failed: Array<{ index: number; code: string; message: string }> = [];
			items.forEach((item, index) => {
				const name = String(item.name ?? '');
				if (isNameTaken(name)) {
					failed.push({ index, code: 'UNIQUE_CONSTRAINT_VIOLATION', message: `"${name}" is taken` });
					return;
				}
				const created = createdLabel(name, item);
				store.labels = [...store.labels, created];
				succeeded.push({ index, id: created.id });
			});
			return answer(route, 201, {
				succeededCount: succeeded.length,
				failedCount: failed.length,
				total: items.length,
				succeeded,
				failed
			});
		}

		if (url.pathname === TAGS_ROUTE && method === 'POST') {
			if (state.createRefusal) return refuse(route, state.createRefusal);
			const name = String(body?.name ?? '');
			if (isNameTaken(name)) return refuse(route, nameTakenRefusal(name));
			const created = createdLabel(name, body ?? {});
			await holdFirstWrite();
			store.labels = [...store.labels, created];
			return answer(route, 201, created);
		}

		if (tagId && method === 'PUT') {
			if (state.editRefusal) return refuse(route, state.editRefusal);
			const current = store.labels.find((label) => label.id === tagId);
			if (!current) return answer(route, 404, { statusCode: 404, message: `no label ${tagId} here` });
			await holdFirstWrite();
			const merged: ServedLabel = {
				...current,
				name: body?.name === undefined ? current.name : String(body.name),
				color: body?.color === undefined ? current.color : ((body.color as string) ?? null),
				icon: body?.icon === undefined ? current.icon : ((body.icon as string) ?? null)
			};
			store.labels = store.labels.map((label) => (label.id === tagId ? merged : label));
			// Gauzy's TypeORM answer for an update: the row that shows up comes from the re-read, not from this body.
			return answer(route, 200, { generatedMaps: [], raw: [], affected: 1 });
		}

		if (tagId && method === 'DELETE') {
			if (state.deleteRefusal) return refuse(route, state.deleteRefusal);
			const removed = store.labels.find((label) => label.id === tagId);
			if (!removed) return answer(route, 404, { statusCode: 404, message: `no label ${tagId} here` });
			await holdFirstWrite();
			store.labels = store.labels.filter((label) => label.id !== tagId);
			return answer(route, 200, { success: true });
		}

		return answer(route, 599, {
			statusCode: 599,
			message: `this file served no answer for ${method} ${url.pathname}`
		});
	});

	return {
		calls,
		get labels() {
			return store.labels;
		},
		reads: () => calls.filter((call) => call.method === 'GET'),
		writes: () => calls.filter((call) => call.method !== 'GET'),
		writesOf: (method, path) =>
			calls.filter((call) => call.method === method && (path === undefined || call.path === path)),
		releaseWrites: () => releaseFirstWrite?.(),
		allowReads: () => {
			refuseReads = false;
		},
		refuseNamesToo: (names) => {
			state.refuseNames = [...state.refuseNames, ...names];
		},
		setWriteRefusals: (patch) => {
			if (patch.create !== undefined) state.createRefusal = patch.create ?? undefined;
			if (patch.edit !== undefined) state.editRefusal = patch.edit ?? undefined;
			if (patch.delete !== undefined) state.deleteRefusal = patch.delete ?? undefined;
		},
		shapes: () =>
			calls.map(
				(call) => `${call.method} ${call.path}${call.body === null ? '' : ` ${JSON.stringify(call.body)}`}`
			)
	};
}

/**
 * The list this file serves, in the order it is served: a plain name, a stored dash, a two-word name, a name whose
 * case and dash must both survive the row, and a row flagged `isSystem` (which the labels do not protect) plus one
 * flagged `isDefault`. The fourth also carries a stored `icon`, which a label never paints.
 */
function labelsScript(fixture: BootstrapFixture) {
	const { ids } = fixture;
	const labelOf = (index: number, name: string, extra: Partial<ServedLabel> = {}): ServedLabel => ({
		id: uuid('tag', index),
		name,
		color: null,
		icon: null,
		fullIconUrl: null,
		order: index,
		isDefault: false,
		isSystem: false,
		tenantId: ids.tenantA,
		organizationId: ids.organizationA,
		organizationTeamId: ids.teamA,
		...extra
	});
	const bug = labelOf(1, 'bug', { color: '#D73A4A' });
	const followUp = labelOf(2, 'Follow-up');
	const needsReview = labelOf(3, 'Needs Review', { color: '#3B82F6', isDefault: true });
	const urgent = labelOf(4, 'Urgent-FIX', {
		color: '#22C55E',
		icon: 'ever-icons/task-labels/custom-label.svg'
	});
	const systemish = labelOf(5, 'System-ish', { isSystem: true });
	return { all: [bug, followUp, needsReview, urgent, systemish], bug, followUp, needsReview, urgent, systemish };
}

/** The mock's own two built-in statuses (`mock-gauzy-server.mjs:156-181`), restated in the bootstrap served here. */
function statusesScript(fixture: BootstrapFixture) {
	const { ids } = fixture;
	return [
		{
			id: ids.todoStatus,
			name: 'open',
			value: 'open',
			color: '#94a3b8',
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
			order: 2,
			isSystem: true,
			isInProgress: true,
			tenantId: ids.tenantA,
			organizationId: ids.organizationA,
			organizationTeamId: ids.teamA
		}
	];
}

/** Serves this file's labels, signs the fixture person in and lands on the page (routes first, cookies second). */
const openLabelsPage = async (
	page: Page,
	fixture: BootstrapFixture,
	patch: Partial<ServedScript> = {},
	options: { scenario?: MockScenario; requireShell?: boolean } = {}
): Promise<{ api: LabelsApi; labels: ReturnType<typeof labelsScript> }> => {
	const labels = labelsScript(fixture);
	const api = await serveLabels(page, {
		labels: labels.all,
		statuses: statusesScript(fixture),
		...patch
	});
	// Routes first, cookies second, navigation last (`playwright/helpers.ts:434-451`).
	await signInAndVisit(page, fixture, LABELS_PATH, options);
	return { api, labels };
};

const rowOf = (page: Page, id: string): Locator => page.locator(`[data-property-row="${id}"]`);
const labelOf = (page: Page, id: string): Locator => rowOf(page, id).locator('span.min-w-0');
const iconOf = (page: Page, id: string): Locator => rowOf(page, id).locator('[data-slot="task-property-icon"]');
const chipOf = (page: Page, id: string, text: string): Locator => rowOf(page, id).getByText(text, { exact: true });
const announceOf = (page: Page): Locator => page.locator('p[aria-live="polite"]').last();
const announceTextOf = async (page: Page): Promise<string> => (await announceOf(page).innerText()).trim();
const addRowOf = (page: Page): Locator => page.locator('[data-add-row="all"]');
/**
 * Both Add controls answer to `Add label`, so `getByRole('button', { name })` alone is not one element (measured 2 in
 * probe4 `Q1`): the page's header button and the list-foot `AddRow` (`-probe4.log` `Q1 add-label buttons 2`,
 * `Q1 header-scoped 1`).
 */
const headerAddOf = (page: Page): Locator =>
	page.locator('header').getByRole('button', { name: copyOf.add, exact: true });
const browseButtonOf = (page: Page): Locator => page.getByTestId('browse-labels');
/** The editor is found by the name input it gives itself (`NAME_PLACEHOLDER`), as in the lane-b settings spec. */
const editorOf = (page: Page): Locator =>
	page.locator('form').filter({ has: page.locator(`input[placeholder="${copyOf.namePlaceholder}"]`) });
const nameFieldOf = (page: Page): Locator => editorOf(page).locator(`input[placeholder="${copyOf.namePlaceholder}"]`);
const saveButtonOf = (page: Page): Locator => editorOf(page).locator('button[type="submit"]');
const hexFieldOf = (page: Page): Locator => editorOf(page).locator(`input[title="${copyOf.hexHint}"]`);
const swatchOf = (page: Page, hex: string): Locator => editorOf(page).locator(`button[aria-label="${hex}"]`);
const fieldsetOf = (page: Page): Locator => editorOf(page).getByRole('group', { name: copyOf.color });
const deleteDialogOf = (page: Page): Locator => page.getByRole('dialog').filter({ hasText: copyOf.deleteTitle });
const catalogOf = (page: Page): Locator => page.getByRole('dialog').filter({ hasText: copyOf.catalogTitle });
const catalogCheckboxOf = (page: Page, name: string): Locator =>
	catalogOf(page).locator(`[role="checkbox"][aria-label="${name}"]`);

/**
 * Every row as the page prints it: its id, the text of its label span, its glyph's style and class, its `<img>`s, its
 * drag state and its `Default` chip. A row that is being edited is not in this list — the editor replaced its label
 * span (`-probe6.log` S3: 4 labels while one row is open, 5 after Cancel).
 */
const rowsOf = async (page: Page): Promise<Array<Record<string, string>>> =>
	page.$$eval(
		'[data-property-row]',
		(nodes, chipText: string) =>
			nodes.map((node) => {
				const glyph = node.querySelector('[data-slot="task-property-icon"]');
				return {
					id: node.getAttribute('data-property-row') ?? '',
					label: (node.querySelector('span.min-w-0')?.textContent ?? '').trim(),
					glyphStyle: glyph?.getAttribute('style') ?? 'no-style',
					muted: (glyph?.getAttribute('class') ?? '').includes('text-muted-foreground')
						? 'muted'
						: 'coloured',
					images: String(node.querySelectorAll('img').length),
					draggable: node.getAttribute('draggable') ?? 'no-attr',
					handles: String(node.querySelectorAll('span[title]').length),
					defaultChip: Array.from(node.querySelectorAll('span')).some(
						(span) => (span.textContent ?? '').trim() === chipText
					)
						? 'chip'
						: 'none'
				};
			}),
		copyOf.defaultChip
	);

const menuItems = async (page: Page): Promise<Array<{ text: string; disabled: string }>> =>
	page.$$eval('[role="menuitem"]', (nodes) =>
		nodes.map((node) => ({
			text: (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
			disabled: node.getAttribute('aria-disabled') ?? 'no-attr'
		}))
	);

const openRowMenu = async (page: Page, id: string): Promise<void> => {
	const trigger = rowOf(page, id).locator('[data-row-menu]');
	await expect(trigger).toBeVisible({ timeout: 15_000 });
	await trigger.click({ timeout: 15_000 });
	await expect(page.locator('[role="menuitem"]').first()).toBeVisible({ timeout: 15_000 });
};

/**
 * Base UI menus are document-level portals: they hold pointer events until they are gone. After a menu item was chosen
 * the menu closes itself — pressing Escape there would instead cancel the editor row it just opened
 * (`property-editor-row.tsx:138-144`, measured in probe3 where P3/P9/P10 all cancelled the row they had opened).
 */
const menuClosedOf = async (page: Page): Promise<void> => {
	await expect(page.locator('[role="menuitem"]')).toHaveCount(0, { timeout: 15_000 });
};

/** Escape while the menu is still open. */
const closeRowMenu = async (page: Page): Promise<void> => {
	await page.keyboard.press('Escape');
	await menuClosedOf(page);
};

const openEditorOfRow = async (page: Page, id: string): Promise<void> => {
	await openRowMenu(page, id);
	await page.getByRole('menuitem', { name: copyOf.menuEdit, exact: true }).click({ timeout: 15_000 });
	await menuClosedOf(page);
	await expect(editorOf(page)).toBeVisible({ timeout: 15_000 });
};

const openDeleteDialogOfRow = async (page: Page, id: string): Promise<void> => {
	await openRowMenu(page, id);
	await page.getByRole('menuitem', { name: copyOf.menuDelete, exact: true }).click({ timeout: 15_000 });
	await menuClosedOf(page);
	await expect(deleteDialogOf(page)).toBeVisible({ timeout: 15_000 });
};

const toastShapeOf = async (page: Page): Promise<Array<{ type: string; text: string }>> =>
	toastsOf(page).evaluateAll((nodes) =>
		nodes.map((node) => ({
			type: node.getAttribute('data-type') ?? '',
			text: (node.textContent ?? '').replace(/\s+/g, ' ').trim()
		}))
	);

const bodyOf = (call: ServedCall): Record<string, unknown> => call.body ?? {};
const editorAlertsOf = (page: Page): Locator => editorOf(page).getByRole('alert');
const deleteDialogAlertOf = (page: Page): Locator => deleteDialogOf(page).getByRole('alert');
/** The `aria-label` of every colour button the editor marks pressed (`property-color-field.tsx:82-116`). */
const pressedSwatchesOf = async (page: Page): Promise<string[]> =>
	editorOf(page)
		.locator('button[aria-pressed="true"]')
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
/** The labels the list prints, in the order it prints them. */
const rowLabelsOf = async (page: Page): Promise<string[]> =>
	page.locator('[data-property-row] span.min-w-0').allInnerTexts();
/** The name a row prints for a served label: its dashes as spaces, its case kept (finding 1). */
const printedName = (name: string) => name.replaceAll('-', ' ');
/** What the list prints for the labels this file serves, in the served order. */
const printedNames = (labels: ReturnType<typeof labelsScript>) => labels.all.map((label) => printedName(label.name));
const catalogAddButtonOf = (page: Page, count: number): Locator =>
	catalogOf(page).getByRole('button', { name: copyOf.catalogAdd(count), exact: true });
const catalogPickedLineOf = (page: Page, count: number): Locator =>
	catalogOf(page).getByText(copyOf.catalogSelected(count), { exact: true });
/** Picks two catalog labels by their checkbox (`label-catalog-dialog.tsx:96`, the `Checkbox` of each catalog row). */
const pickCatalogLabels = async (page: Page, ...names: string[]): Promise<void> => {
	for (const name of names) {
		await catalogCheckboxOf(page, name).click({ timeout: 15_000 });
	}
	await expect(catalogAddButtonOf(page, names.length)).toBeEnabled({ timeout: 15_000 });
};
/** The catalog's per-label body: the pick's own name and colour plus the three scope keys the client adds. */
const catalogItemBody = (name: string, color: string, fixture: BootstrapFixture) => ({
	name,
	color,
	organizationId: fixture.ids.organizationA,
	tenantId: fixture.ids.tenantA,
	organizationTeamId: fixture.ids.teamA
});

/* ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
   The tests. Every value asserted below was printed by a probe run first (`-probe3.log`, `-probe4.log`,
   `-probe5.log`, `-probe6.log`, `-probe7.log`); each test also re-prints what it asserts, so the log of an
   acceptance run carries the same lines.
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

test('the list as printed: the served order, the label-only row, and the one read behind it', async ({
	page,
	fixture,
	shield
}) => {
	const { api, labels } = await openLabelsPage(page, fixture);

	await expect(page.getByRole('heading', { level: 1, name: copyOf.pageTitle })).toHaveCount(1);
	await expect(page.getByText(copyOf.pageDescription, { exact: true })).toHaveCount(1);
	await expect(page.locator('[data-property-row]')).toHaveCount(5);

	// The full row projection this file reads off each row: label, glyph style, muted or coloured, `<img>`s, drag state, drag-handle spans, the `Default` chip.
	report('rows', await rowsOf(page));
	await expect
		.poll(async () =>
			(await rowsOf(page)).map(
				(row) =>
					`${row.label}|${row.glyphStyle}|${row.muted}|${row.images}|${row.draggable}|${row.handles}|${row.defaultChip}`
			)
		)
		.toEqual([
			`bug|${glyphStyle('#D73A4A')}|coloured|0|no-attr|0|none`,
			'Follow up|no-style|muted|0|no-attr|0|none',
			`Needs Review|${glyphStyle('#3B82F6')}|coloured|0|no-attr|0|chip`,
			`Urgent FIX|${glyphStyle('#22C55E')}|coloured|0|no-attr|0|none`,
			'System ish|no-style|muted|0|no-attr|0|none'
		]);
	// A dash in a stored name shows as a space and the case survives (`propertyLabelOf`), and the row that was served an `icon` still paints no image.
	await expect(labelOf(page, labels.followUp.id)).toHaveText(printedName(labels.followUp.name));
	await expect(labelOf(page, labels.urgent.id)).toHaveText('Urgent FIX');
	await expect(iconOf(page, labels.urgent.id)).toHaveAttribute('style', glyphStyle('#22C55E'));
	await expect(chipOf(page, labels.needsReview.id, copyOf.defaultChip)).toHaveCount(1);
	// Labels are not grouped: no group header, and exactly one list-foot Add row.
	await expect(addRowOf(page)).toHaveCount(1);
	// Both Add controls answer to the same name, so the name alone is two elements (`property-list.tsx:160-190`, `task-property-settings-body.tsx:43-46`).
	await expect(page.getByRole('button', { name: copyOf.add, exact: true })).toHaveCount(2);
	await expect(headerAddOf(page)).toHaveCount(1);
	await expect(browseButtonOf(page)).toHaveCount(1);
	await expect(announceOf(page)).toBeEmpty();

	// The row menu of the `isSystem` label: a label is not protected the way a status is (`isDeletionRefused`, `settings-task-properties.ts:529-543`).
	await openRowMenu(page, labels.systemish.id);
	report('menu of the isSystem label', await menuItems(page));
	await expect
		.poll(async () => menuItems(page))
		.toEqual([
			{ text: copyOf.menuEdit, disabled: 'no-attr' },
			{ text: copyOf.menuDelete, disabled: 'no-attr' }
		]);
	await closeRowMenu(page);

	// One read carries this list: the bootstrap bundle that holds `taskLabels`. No per-team `GET /tags/level` is ever
	// asked for, because `useBootstrap` is true for a private team (`core/hooks/tasks/use-task-labels-query.ts:31-43`,
	// `core/hooks/tasks/use-task-metadata-bootstrap-query.ts:35`).
	report(
		'reads',
		api.reads().map((call) => `${call.method} ${call.path}${call.search}`)
	);
	await expect.poll(() => api.reads().length).toBeGreaterThanOrEqual(1);
	// The page asks for that one read at least once, and every carry of it is identical: the same method, the same path,
	// the same query. (`-measure1.log` printed 2 identical carries for one load — several components on this page mount
	// the same labels query, so the count is not pinned; the *distinct* request is.)
	await expect
		.poll(async () => new Set(api.reads().map((call) => `${call.method} ${call.path}${call.search}`)).size)
		.toBe(1);
	const read = api.reads()[0];
	expect(read.method).toBe('GET');
	expect(read.path).toBe(BOOTSTRAP_ROUTE);
	expect(read.search).toContain(
		'include=issueTypes,relatedIssueTypes,taskLabels,taskPriorities,taskSizes,taskStatuses,taskVersions'
	);
	expect(api.calls.filter((call) => call.path === TAGS_LEVEL_ROUTE)).toHaveLength(0);
	expect(api.writes()).toHaveLength(0);
	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

test('a refused read: the list says it did not load, and Try again brings the rows back', async ({
	page,
	fixture,
	shield
}) => {
	const { api, labels } = await openLabelsPage(page, fixture, {
		readRefusal: { status: 500, message: 'the labels read did not answer' }
	});

	await expect(page.getByText(copyOf.errorTitle, { exact: true })).toBeVisible({ timeout: 30_000 });
	await expect(page.getByText(copyOf.errorDescription, { exact: true })).toHaveCount(1);
	const retry = page.getByRole('button', { name: copyOf.retry, exact: true });
	await expect(retry).toHaveCount(1);
	await expect(page.locator('[data-property-row]')).toHaveCount(0);
	await expect(announceOf(page)).toBeEmpty();

	// The query retries a failed read once on its own (`core/query/config/index.ts:31`), so the attempt count is a lower bound.
	await expect.poll(() => api.reads().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
	report(
		'read attempts',
		api.reads().map((call) => `${call.method} ${call.path}`)
	);
	report('console', consoleFindings(shield, [armedRefusal('GET', BOOTSTRAP_ROUTE, 500)]));
	expect(consoleFindings(shield, [armedRefusal('GET', BOOTSTRAP_ROUTE, 500)])).toEqual([]);

	api.allowReads();
	await retry.click({ timeout: 15_000 });
	await expect(page.locator('[data-property-row]')).toHaveCount(5, { timeout: 30_000 });
	await expect(page.getByText(copyOf.errorTitle, { exact: true })).toHaveCount(0);
	await expect(page.locator('[data-property-row] span.min-w-0')).toHaveText(printedNames(labels));
});

test('create from the header Add: the editor it opens, the POST it sends, the row it adds', async ({
	page,
	fixture,
	shield
}) => {
	const { api, labels } = await openLabelsPage(page, fixture);
	await expect(headerAddOf(page)).toHaveCount(1);
	await headerAddOf(page).click({ timeout: 15_000 });

	const editor = editorOf(page);
	await expect(editor).toBeVisible({ timeout: 15_000 });
	// Two fields: the name and the hex code the colour field keeps (`property-editor-row.tsx:157-176`, `property-color-field.tsx:120-135`).
	report(
		'inputs',
		await editor
			.locator('input')
			.evaluateAll((nodes) =>
				nodes.map(
					(node) =>
						`${node.getAttribute('placeholder') ?? '-'}|${node.getAttribute('title') ?? '-'}|${node.getAttribute('aria-label') ?? '-'}`
				)
			)
	);
	await expect(editor.locator('input')).toHaveCount(2);
	await expect(nameFieldOf(page)).toHaveValue('');
	// A label's colour is chosen from 10 swatches plus a custom-colour popover, all inside one fieldset the `Color` label names; the draft starts on the swatch `defaultSwatchFor(5)` picks (`settings-task-properties.ts:58-76`).
	await expect(fieldsetOf(page)).toBeVisible();
	await expect(editor.locator('fieldset button')).toHaveCount(11);
	await expect(hexFieldOf(page)).toHaveValue('#F97316');
	await expect(swatchOf(page, '#F97316')).toHaveAttribute('aria-pressed', 'true');
	await expect.poll(async () => pressedSwatchesOf(page)).toEqual(['#F97316']);
	// A label has no icon picker: the only button with a popup is the custom-colour one, and the editor holds 13 buttons
	// in total — 10 swatches, the custom-colour trigger, Cancel and the submit (`-measure1.log`).
	await expect(editor.locator('button[aria-haspopup]')).toHaveCount(1);
	await expect(editor.getByRole('button', { name: copyOf.customColor, exact: true })).toHaveCount(1);
	await expect(editor.locator('button')).toHaveCount(13);
	report(
		'buttons',
		await editor
			.locator('button')
			.evaluateAll((nodes) =>
				nodes.map(
					(node) =>
						`${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}|${node.getAttribute('aria-label') ?? '-'}|${node.getAttribute('type')}`
				)
			)
	);
	await expect(editor.getByRole('button', { name: copyOf.add, exact: true })).toHaveCount(1);
	await expect(editor.getByText(copyOf.preview, { exact: true })).toHaveCount(1);

	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect(editorAlertsOf(page)).toHaveCount(1);
	await expect(editorAlertsOf(page)).toHaveText(copyOf.nameRequired);
	await expect(nameFieldOf(page)).toHaveAttribute('aria-invalid', 'true');
	expect(api.writes()).toHaveLength(0);

	const readsBeforeSave = api.reads().length;
	await nameFieldOf(page).fill('Probe from the header', { timeout: 15_000 });
	await expect(editor.getByText('Probe from the header', { exact: true })).toHaveCount(1);
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('POST', TAGS_ROUTE).length, { timeout: 30_000 }).toBe(1);
	const post = api.writesOf('POST', TAGS_ROUTE)[0];
	report('POST', { path: post.path, body: post.body });
	expect(bodyOf(post)).toEqual({
		name: 'Probe from the header',
		color: '#F97316',
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		organizationTeamId: fixture.ids.teamA
	});
	await expect(page.locator('[data-property-row]')).toHaveCount(6, { timeout: 30_000 });
	await expect.poll(async () => rowLabelsOf(page)).toEqual([...printedNames(labels), 'Probe from the header']);
	// The live region says what happened, in the created row's own name (`property-list.tsx:421-433`).
	await expect(announceOf(page)).toHaveText(copyOf.announceAdded('Probe from the header'));
	await expect(editor).toHaveCount(0);
	// A create re-reads the list (`core/hooks/tasks/use-create-task-label.ts:33`), so at least one more carry of the
	// same read arrives after the write.
	report('reads after the create', api.reads().length - readsBeforeSave);
	await expect.poll(() => api.reads().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(readsBeforeSave + 1);
	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

test('create from the list-foot Add row: the same draft, the same POST, the new row last', async ({
	page,
	fixture,
	shield
}) => {
	const { api, labels } = await openLabelsPage(page, fixture);
	const addRow = addRowOf(page);
	await expect(addRow).toHaveCount(1);
	await expect(addRow).toHaveText(copyOf.add);
	await expect(addRow).toBeEnabled();
	await addRow.click({ timeout: 15_000 });

	const editor = editorOf(page);
	await expect(editor).toBeVisible({ timeout: 15_000 });
	// The name field takes the focus the Add row had (`property-editor-row.tsx:163` `autoFocus`).
	await expect(nameFieldOf(page)).toBeFocused({ timeout: 15_000 });
	await expect(hexFieldOf(page)).toHaveValue('#F97316');
	await expect.poll(async () => pressedSwatchesOf(page)).toEqual(['#F97316']);
	await expect(saveButtonOf(page)).toHaveText(copyOf.add);

	await nameFieldOf(page).fill('Added from the foot', { timeout: 15_000 });
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('POST', TAGS_ROUTE).length, { timeout: 30_000 }).toBe(1);
	report('POST', api.writesOf('POST', TAGS_ROUTE)[0].body);
	expect(bodyOf(api.writesOf('POST', TAGS_ROUTE)[0])).toEqual({
		name: 'Added from the foot',
		color: '#F97316',
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		organizationTeamId: fixture.ids.teamA
	});
	await expect(page.locator('[data-property-row]')).toHaveCount(6, { timeout: 30_000 });
	await expect.poll(async () => rowLabelsOf(page)).toEqual([...printedNames(labels), 'Added from the foot']);
	await expect(announceOf(page)).toHaveText(copyOf.announceAdded('Added from the foot'));
	await expect(editor).toHaveCount(0);
	await expect(addRow).toHaveCount(1);
	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

test('a create refused: the taken name lands on the field, a 500 lands in the shell toast', async ({
	page,
	fixture,
	shield
}) => {
	const { api, labels } = await openLabelsPage(page, fixture);
	await headerAddOf(page).click({ timeout: 15_000 });
	const editor = editorOf(page);
	await expect(editor).toBeVisible({ timeout: 15_000 });

	// A name the read list already has is refused before any request goes out (`property-list.tsx:472-476`, `task-label-catalog.ts:57-63`).
	await nameFieldOf(page).fill('Needs review', { timeout: 15_000 });
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect(editorAlertsOf(page)).toHaveCount(1);
	await expect(editorAlertsOf(page)).toHaveText(copyOf.nameTaken);
	await expect(nameFieldOf(page)).toHaveValue('Needs review');
	expect(api.writes()).toHaveLength(0);

	// A name the list does not have, refused by the server: the field says it, and the field still holds it.
	const readsBeforeTaken = api.reads().length;
	api.refuseNamesToo(['Ghost label']);
	await nameFieldOf(page).fill('Ghost label', { timeout: 15_000 });
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('POST', TAGS_ROUTE).length, { timeout: 30_000 }).toBe(1);
	await expect(editor).toBeVisible();
	await expect(editorAlertsOf(page)).toHaveCount(1);
	await expect(editorAlertsOf(page)).toHaveText(copyOf.nameTaken);
	await expect(nameFieldOf(page)).toHaveValue('Ghost label');
	await expect(nameFieldOf(page)).toHaveAttribute('aria-invalid', 'true');
	const alertId = await editorAlertsOf(page).getAttribute('id');
	report('describedby', { describedBy: await nameFieldOf(page).getAttribute('aria-describedby'), alertId });
	expect(await nameFieldOf(page).getAttribute('aria-describedby')).toBe(alertId);
	await expect.poll(async () => rowLabelsOf(page)).toEqual([...printedNames(labels)]);
	await expect(announceOf(page)).toBeEmpty();
	// The 409 also re-reads the list, so the row someone else added shows up (`core/hooks/tasks/use-create-task-label.ts:36-40`).
	report('reads after the refused create', api.reads().length - readsBeforeTaken);
	await expect.poll(() => api.reads().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(readsBeforeTaken + 1);
	report('toasts after the 409', await toastShapeOf(page));
	await expect
		.poll(
			async () =>
				await appToastsOf(page).evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${node.getAttribute('data-type')}|${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
					)
				)
		)
		.toEqual([`error|${copyOf.mutationFailed}${copyOf.reason('NAME_TAKEN')}`]);

	// The same editor, a server that answers 500: no field error, the row stays open with what was typed.
	api.setWriteRefusals({ create: { status: 500, message: 'the labels write exploded' } });
	await nameFieldOf(page).fill('Exploding label', { timeout: 15_000 });
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('POST', TAGS_ROUTE).length, { timeout: 30_000 }).toBe(2);
	await expect(editor).toBeVisible();
	await expect(nameFieldOf(page)).toHaveValue('Exploding label');
	report('editor alerts after the 500', await editorAlertsOf(page).allInnerTexts());
	await expect(editorAlertsOf(page)).toHaveCount(0);
	await expect.poll(async () => rowLabelsOf(page)).toEqual([...printedNames(labels)]);
	await expect(announceOf(page)).toBeEmpty();
	report('toasts after the 500', await toastShapeOf(page));
	await expect
		.poll(
			async () =>
				await appToastsOf(page).evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${node.getAttribute('data-type')}|${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
					)
				)
		)
		.toEqual([`error|${copyOf.mutationFailed}${copyOf.reason('SERVER')}`]);
	await parkPointer(page);
	await expect(toastsOf(page)).toHaveCount(0, { timeout: 30_000 });
	report(
		'console',
		consoleFindings(shield, [
			armedRefusal('POST', TAGS_ROUTE, 409),
			armedRefusal('POST', TAGS_ROUTE, 500),
			armedMutation(nameTakenRefusal('Ghost label').message),
			armedMutation('the labels write exploded')
		])
	);
	expect(
		consoleFindings(shield, [
			armedRefusal('POST', TAGS_ROUTE, 409),
			armedRefusal('POST', TAGS_ROUTE, 500),
			armedMutation(nameTakenRefusal('Ghost label').message),
			armedMutation('the labels write exploded')
		])
	).toEqual([]);
});

test('edit from the row menu: prefilled fields, the PUT, the row after the re-read, and Cancel', async ({
	page,
	fixture,
	shield
}) => {
	const { api, labels } = await openLabelsPage(page, fixture);
	await openEditorOfRow(page, labels.bug.id);
	const editor = editorOf(page);
	await expect(editor).toBeVisible({ timeout: 15_000 });

	// The draft starts from the served row: its name, its colour in the hex field, and — because #D73A4A is not one of the 10 swatches — the custom-colour button marked pressed.
	await expect(nameFieldOf(page)).toHaveValue(labels.bug.name);
	await expect(hexFieldOf(page)).toHaveValue(String(labels.bug.color));
	await expect.poll(async () => pressedSwatchesOf(page)).toEqual([copyOf.customColor]);
	await expect(saveButtonOf(page)).toHaveText(copyOf.editorSave);
	await expect(editor.getByText(labels.bug.name, { exact: true })).toHaveCount(1);
	// While the row is being edited it is not a row any more: no `data-property-row` for it.
	await expect(rowOf(page, labels.bug.id)).toHaveCount(0);

	await nameFieldOf(page).fill('Renamed bug', { timeout: 15_000 });
	await swatchOf(page, '#14B8A6').click({ timeout: 15_000 });
	await expect.poll(async () => pressedSwatchesOf(page)).toEqual(['#14B8A6']);
	const readsBeforeEdit = api.reads().length;
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT').length, { timeout: 30_000 }).toBe(1);
	const put = api.writesOf('PUT')[0];
	report('PUT', { path: put.path, body: put.body });
	expect(put.path).toBe(`${TAGS_ROUTE}/${labels.bug.id}`);
	expect(bodyOf(put)).toEqual({
		name: 'Renamed bug',
		color: '#14B8A6',
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		organizationTeamId: fixture.ids.teamA
	});
	// The row that shows up comes from the re-read, not from the answer (`core/hooks/tasks/use-edit-task-label.ts:34`).
	report('reads after the edit', api.reads().length - readsBeforeEdit);
	await expect.poll(() => api.reads().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(readsBeforeEdit + 1);
	await expect(labelOf(page, labels.bug.id)).toHaveText('Renamed bug', { timeout: 30_000 });
	await expect(iconOf(page, labels.bug.id)).toHaveAttribute('style', glyphStyle('#14B8A6'));
	await expect(announceOf(page)).toHaveText(copyOf.announceSaved('Renamed bug'));
	await expect(editor).toHaveCount(0);

	// Cancel sends nothing.
	await openEditorOfRow(page, labels.followUp.id);
	await nameFieldOf(page).fill('A name never sent', { timeout: 15_000 });
	await editor.getByRole('button', { name: copyOf.editorCancel, exact: true }).click({ timeout: 15_000 });
	await expect(editorOf(page)).toHaveCount(0);
	await expect(labelOf(page, labels.followUp.id)).toHaveText(printedName(labels.followUp.name));
	expect(api.writesOf('PUT')).toHaveLength(1);
	await expect(announceOf(page)).toHaveText(copyOf.announceSaved('Renamed bug'));

	// Escape in the editor cancels the row the same way (`property-editor-row.tsx:138-144`).
	await openEditorOfRow(page, labels.followUp.id);
	await nameFieldOf(page).fill('Another name never sent', { timeout: 15_000 });
	await page.keyboard.press('Escape');
	await expect(editorOf(page)).toHaveCount(0, { timeout: 15_000 });
	await expect(labelOf(page, labels.followUp.id)).toHaveText(printedName(labels.followUp.name));
	expect(api.writesOf('PUT')).toHaveLength(1);

	// A save that changed nothing sends nothing — and still announces that it saved.
	await openEditorOfRow(page, labels.followUp.id);
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect(editorOf(page)).toHaveCount(0, { timeout: 15_000 });
	await expect(announceOf(page)).toHaveText(copyOf.announceSaved(printedName(labels.followUp.name)));
	report('announce after an unchanged save', await announceTextOf(page));
	// counted once the save was handled (the editor closed, the announcement made): still only the earlier PUT
	expect(api.writesOf('PUT')).toHaveLength(1);
	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

test('an edit refused 409 on the name, and an edit refused 500', async ({ page, fixture, shield }) => {
	const { api, labels } = await openLabelsPage(page, fixture);
	api.setWriteRefusals({ edit: nameTakenRefusal('Taken rename') });

	await openEditorOfRow(page, labels.followUp.id);
	const editor = editorOf(page);
	await nameFieldOf(page).fill('Taken rename', { timeout: 15_000 });
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT').length, { timeout: 30_000 }).toBe(1);
	await expect(editor).toBeVisible();
	await expect(editorAlertsOf(page)).toHaveCount(1);
	await expect(editorAlertsOf(page)).toHaveText(copyOf.nameTaken);
	await expect(nameFieldOf(page)).toHaveValue('Taken rename');
	await expect(announceOf(page)).toBeEmpty();
	// The row is still the editor here, and the served name is still in the store.
	await expect(rowOf(page, labels.followUp.id)).toHaveCount(0);
	report(
		'store after the refused edit',
		api.labels.map((label) => `${label.name}|${label.color}`)
	);
	expect(api.labels.map((label) => label.name)).toEqual(labels.all.map((label) => label.name));
	await editor.getByRole('button', { name: copyOf.editorCancel, exact: true }).click({ timeout: 15_000 });
	await expect(labelOf(page, labels.followUp.id)).toHaveText(printedName(labels.followUp.name), { timeout: 15_000 });
	await parkPointer(page);
	await expect(toastsOf(page)).toHaveCount(0, { timeout: 30_000 });

	// A 500 on the same row: the reason is the shell's toast, not the field, and the typed name survives.
	api.setWriteRefusals({ edit: { status: 500, message: 'the labels edit exploded' } });
	await openEditorOfRow(page, labels.followUp.id);
	await nameFieldOf(page).fill('Exploding rename', { timeout: 15_000 });
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT').length, { timeout: 30_000 }).toBe(2);
	const put = api.writesOf('PUT')[1];
	report('PUT body of the refused 500', put.body);
	// A label served without a colour gets one from its name (`mergeTaskLabelData`, `core/lib/helpers/task.ts:44-47` → `generateDefaultColor`, `core/lib/helpers/colors.ts:20-34`): `#84CC16` is not one of the 10 swatches.
	expect(bodyOf(put)).toEqual({
		name: 'Exploding rename',
		color: '#84CC16',
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		organizationTeamId: fixture.ids.teamA
	});
	await expect(editor).toBeVisible();
	await expect(nameFieldOf(page)).toHaveValue('Exploding rename');
	report('editor alerts after the refused 500', await editorAlertsOf(page).allInnerTexts());
	await expect(editorAlertsOf(page)).toHaveCount(0);
	await expect(nameFieldOf(page)).not.toHaveAttribute('aria-invalid', 'true');
	await expect(announceOf(page)).toBeEmpty();
	report('toasts after the refused 500', await toastShapeOf(page));
	await expect
		.poll(
			async () =>
				await appToastsOf(page).evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${node.getAttribute('data-type')}|${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
					)
				)
		)
		.toEqual([`error|${copyOf.mutationFailed}${copyOf.reason('SERVER')}`]);
	await editor.getByRole('button', { name: copyOf.editorCancel, exact: true }).click({ timeout: 15_000 });
	await expect(labelOf(page, labels.followUp.id)).toHaveText(printedName(labels.followUp.name), { timeout: 15_000 });
	await expect(iconOf(page, labels.followUp.id)).not.toHaveAttribute('style');
	report(
		'console',
		consoleFindings(shield, [
			armedRefusal('PUT', `${TAGS_ROUTE}/${labels.followUp.id}`, 409),
			armedRefusal('PUT', `${TAGS_ROUTE}/${labels.followUp.id}`, 500),
			armedMutation(nameTakenRefusal('Taken rename').message),
			armedMutation('the labels edit exploded')
		])
	);
	expect(
		consoleFindings(shield, [
			armedRefusal('PUT', `${TAGS_ROUTE}/${labels.followUp.id}`, 409),
			armedRefusal('PUT', `${TAGS_ROUTE}/${labels.followUp.id}`, 500),
			armedMutation(nameTakenRefusal('Taken rename').message),
			armedMutation('the labels edit exploded')
		])
	).toEqual([]);
});

test('delete from the row menu: the confirmation, Cancel, the DELETE, the row gone, the announcement', async ({
	page,
	fixture,
	shield
}) => {
	const { api, labels } = await openLabelsPage(page, fixture);
	await openDeleteDialogOfRow(page, labels.needsReview.id);
	const dialog = deleteDialogOf(page);

	// What the confirmation says for a label (`property-delete-dialog.tsx:26-37` over `danger.tsx:76-199`).
	report('dialog text', flat(await dialog.innerText()));
	await expect(dialog.getByText(copyOf.deleteTitle, { exact: true })).toHaveCount(1);
	await expect(dialog.getByText(copyOf.deleteDescription, { exact: true })).toHaveCount(1);
	await expect(dialog.getByText(labels.needsReview.name, { exact: true })).toHaveCount(1);
	await expect(dialog.getByText(copyOf.deleteChoicesGone, { exact: true })).toHaveCount(1);
	await expect(dialog.getByText(copyOf.deleteLabelRemoved, { exact: true })).toHaveCount(1);
	await expect(dialog.getByRole('button', { name: copyOf.deleteConfirm, exact: true })).toHaveCount(1);
	await expect(dialog.getByRole('button', { name: copyOf.editorCancel, exact: true })).toHaveCount(1);
	await expect(deleteDialogAlertOf(page)).toHaveCount(0);

	// Cancel closes it and sends nothing.
	await dialog.getByRole('button', { name: copyOf.editorCancel, exact: true }).click({ timeout: 15_000 });
	await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });
	expect(api.writes()).toHaveLength(0);
	await expect(rowOf(page, labels.needsReview.id)).toHaveCount(1);
	await expect(announceOf(page)).toBeEmpty();

	await openDeleteDialogOfRow(page, labels.needsReview.id);
	await deleteDialogOf(page)
		.getByRole('button', { name: copyOf.deleteConfirm, exact: true })
		.click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('DELETE').length, { timeout: 30_000 }).toBe(1);
	report('DELETE path', api.writesOf('DELETE')[0].path);
	expect(api.writesOf('DELETE')[0].path).toBe(`${TAGS_ROUTE}/${labels.needsReview.id}`);
	// The row leaves on the re-read the delete triggers (`core/hooks/tasks/use-delete-task-label.ts:23`).
	await expect(rowOf(page, labels.needsReview.id)).toHaveCount(0, { timeout: 30_000 });
	await expect
		.poll(async () => rowLabelsOf(page))
		.toEqual(printedNames(labels).filter((name) => name !== printedName(labels.needsReview.name)));
	await expect(announceOf(page)).toHaveText(copyOf.announceDeleted(labels.needsReview.name));
	// The dialog unmounts a moment after its answer (its closing animation) — polled, not slept on.
	await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

test('a delete refused: the reason inside the dialog, the row still listed', async ({ page, fixture, shield }) => {
	const { api, labels } = await openLabelsPage(page, fixture, {
		deleteRefusal: nameTakenRefusal(labelsScript(fixture).needsReview.name)
	});
	await openDeleteDialogOfRow(page, labels.needsReview.id);
	await deleteDialogOf(page)
		.getByRole('button', { name: copyOf.deleteConfirm, exact: true })
		.click({ timeout: 15_000 });

	// A refusal says itself *inside* the dialog (`property-delete-dialog.tsx:53-102` → `errorReasonKeyOf`), and the row stays.
	await expect(deleteDialogAlertOf(page)).toHaveCount(1, { timeout: 30_000 });
	await expect(deleteDialogAlertOf(page)).toHaveText(copyOf.reason('NAME_TAKEN'));
	await expect(rowOf(page, labels.needsReview.id)).toHaveCount(1);
	await expect(announceOf(page)).toBeEmpty();
	report('toasts after the refused 409', await toastShapeOf(page));
	await expect
		.poll(
			async () =>
				await appToastsOf(page).evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${node.getAttribute('data-type')}|${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
					)
				)
		)
		.toEqual([`error|${copyOf.mutationFailed}${copyOf.reason('NAME_TAKEN')}`]);
	await deleteDialogOf(page)
		.getByRole('button', { name: copyOf.editorCancel, exact: true })
		.click({ timeout: 15_000 });
	await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });
	await parkPointer(page);
	await expect(toastsOf(page)).toHaveCount(0, { timeout: 30_000 });

	api.setWriteRefusals({ delete: { status: 500, message: 'delete exploded' } });
	await openDeleteDialogOfRow(page, labels.needsReview.id);
	await deleteDialogOf(page)
		.getByRole('button', { name: copyOf.deleteConfirm, exact: true })
		.click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('DELETE').length, { timeout: 30_000 }).toBe(2);
	await expect(deleteDialogAlertOf(page)).toHaveCount(1, { timeout: 30_000 });
	await expect(deleteDialogAlertOf(page)).toHaveText(copyOf.reason('SERVER'));
	await expect(rowOf(page, labels.needsReview.id)).toHaveCount(1);
	await expect(announceOf(page)).toBeEmpty();
	report(
		'store after both refused deletes',
		api.labels.map((label) => label.name)
	);
	expect(api.labels.map((label) => label.name)).toEqual(labels.all.map((label) => label.name));
	await deleteDialogOf(page)
		.getByRole('button', { name: copyOf.editorCancel, exact: true })
		.click({ timeout: 15_000 });
	await expect.poll(async () => rowLabelsOf(page)).toEqual([...printedNames(labels)]);
	report(
		'console',
		consoleFindings(shield, [
			armedRefusal('DELETE', `${TAGS_ROUTE}/${labels.needsReview.id}`, 409),
			armedRefusal('DELETE', `${TAGS_ROUTE}/${labels.needsReview.id}`, 500),
			armedMutation(nameTakenRefusal(labels.needsReview.name).message),
			armedMutation('delete exploded')
		])
	);
	expect(
		consoleFindings(shield, [
			armedRefusal('DELETE', `${TAGS_ROUTE}/${labels.needsReview.id}`, 409),
			armedRefusal('DELETE', `${TAGS_ROUTE}/${labels.needsReview.id}`, 500),
			armedMutation(nameTakenRefusal(labels.needsReview.name).message),
			armedMutation('delete exploded')
		])
	).toEqual([]);
});

/** The colour the catalog file gives a label (`core/lib/utils/task-label-catalog.json`). */
const catalogColorOf = (name: string): string => {
	for (const category of Object.values(CATALOG_DATA)) {
		const color = category[name];
		if (color) {
			return color;
		}
	}
	throw new Error(`the catalog has no label named ${name}`);
};

test('the catalog adds its picks in one bulk request', async ({ page, fixture, shield }) => {
	const { api, labels } = await openLabelsPage(page, fixture);
	await browseButtonOf(page).click({ timeout: 15_000 });
	const catalog = catalogOf(page);
	await expect(catalog).toBeVisible({ timeout: 15_000 });
	await expect(catalog.getByText(copyOf.catalogTitle, { exact: true })).toHaveCount(1);
	await expect(catalog.locator(`input[placeholder="${copyOf.catalogSearch}"]`)).toHaveCount(1);

	await pickCatalogLabels(page, 'Enhancement', 'Frontend');
	await expect(catalogPickedLineOf(page, 2)).toHaveCount(1);
	await expect(catalogAddButtonOf(page, 2)).toHaveText(copyOf.catalogAdd(2));
	await catalogAddButtonOf(page, 2).click({ timeout: 15_000 });

	// The toast is waited for before the requests and the re-read below: it lives 5 s
	// (`core/components/common/app-toaster.tsx:66` `duration={5000}`), and the re-read a catalog add triggers can take
	// longer than that. `toastShapeOf` reports `{type, text}` per toast, which is what is compared.
	report('toasts after the bulk add', await toastShapeOf(page));
	await expect
		.poll(async () => await toastShapeOf(page), { timeout: 30_000 })
		.toEqual([{ type: 'success', text: copyOf.catalogAddedToast(2) }]);
	await expect.poll(() => api.writesOf('POST', TAGS_BULK_ROUTE).length, { timeout: 30_000 }).toBe(1);
	const bulk = api.writesOf('POST', TAGS_BULK_ROUTE)[0];
	report('bulk body', bulk.body);
	// Two picks run at once (`use-add-catalog-labels.ts:31` `FALLBACK_CONCURRENCY`, `:47-59`), so the items are compared sorted.
	expect(sorted((bodyOf(bulk).items as Array<Record<string, unknown>>).map((item) => JSON.stringify(item)))).toEqual(
		sorted(
			[
				catalogItemBody('Enhancement', catalogColorOf('Enhancement'), fixture),
				catalogItemBody('Frontend', catalogColorOf('Frontend'), fixture)
			].map((item) => JSON.stringify(item))
		)
	);
	expect(bodyOf(bulk).tenantId).toBe(fixture.ids.tenantA);
	expect(bodyOf(bulk).organizationId).toBe(fixture.ids.organizationA);
	// The bulk route exists here, so nothing goes one by one.
	expect(api.writesOf('POST', TAGS_ROUTE)).toHaveLength(0);
	await expect(page.locator('[data-property-row]')).toHaveCount(7, { timeout: 30_000 });
	await expect.poll(async () => rowLabelsOf(page)).toEqual([...printedNames(labels), 'Enhancement', 'Frontend']);
	await parkPointer(page);
	await expect(toastsOf(page)).toHaveCount(0, { timeout: 30_000 });
	// A finished catalog add closes its dialog (`label-catalog-dialog.tsx:199-201`).
	await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

test('the catalog when `POST /tags/bulk` is refused 404: one `POST /tags` per label', async ({
	page,
	fixture,
	shield
}) => {
	const { api, labels } = await openLabelsPage(page, fixture, {
		bulkRefusal: { status: 404, message: 'this API has no bulk route' }
	});
	await browseButtonOf(page).click({ timeout: 15_000 });
	await pickCatalogLabels(page, 'Enhancement', 'Frontend');
	await catalogAddButtonOf(page, 2).click({ timeout: 15_000 });

	// The toast before anything that outlives it (see the note in the bulk test above).
	report('toasts after the fallback', await toastShapeOf(page));
	await expect
		.poll(async () => await toastShapeOf(page), { timeout: 30_000 })
		.toEqual([{ type: 'success', text: copyOf.catalogAddedToast(2) }]);
	// 404 (or 405) means the API has no bulk route, and the labels then go one request each (`use-add-catalog-labels.ts:25-59`).
	await expect.poll(() => api.writesOf('POST', TAGS_BULK_ROUTE).length, { timeout: 30_000 }).toBe(1);
	await expect.poll(() => api.writesOf('POST', TAGS_ROUTE).length, { timeout: 30_000 }).toBe(2);
	const singles = api.writesOf('POST', TAGS_ROUTE).map((call) => bodyOf(call));
	report('single POST bodies', singles);
	expect(sorted(singles.map((body) => JSON.stringify(body)))).toEqual(
		sorted(
			[
				catalogItemBody('Enhancement', catalogColorOf('Enhancement'), fixture),
				catalogItemBody('Frontend', catalogColorOf('Frontend'), fixture)
			].map((item) => JSON.stringify(item))
		)
	);
	await expect(page.locator('[data-property-row]')).toHaveCount(7, { timeout: 30_000 });
	await expect.poll(async () => rowLabelsOf(page)).toEqual([...printedNames(labels), 'Enhancement', 'Frontend']);
	await parkPointer(page);
	await expect(toastsOf(page)).toHaveCount(0, { timeout: 30_000 });
	await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
	// Only the refused bulk request is excused here: the per-label requests all answered 201.
	report('console', consoleFindings(shield, [armedRefusal('POST', TAGS_BULK_ROUTE, 404)]));
	expect(consoleFindings(shield, [armedRefusal('POST', TAGS_BULK_ROUTE, 404)])).toEqual([]);
});

test('a catalog add that fails: the partial toast and the refused picks kept', async ({ page, fixture, shield }) => {
	const { api, labels } = await openLabelsPage(page, fixture, {
		bulkRefusal: { status: 405, message: 'this API has no bulk route' },
		refuseNames: ['Priority: Low']
	});
	await browseButtonOf(page).click({ timeout: 15_000 });
	await pickCatalogLabels(page, 'Priority: Critical', 'Priority: Low');
	await catalogAddButtonOf(page, 2).click({ timeout: 15_000 });

	report('toasts after the partial add', await toastShapeOf(page));
	await expect
		.poll(async () => await toastShapeOf(page), { timeout: 30_000 })
		.toEqual([{ type: 'warning', text: copyOf.catalogPartialToast(1, 1) }]);
	// The fallback runs per label; one name is refused, so the outcome is partial (`label-catalog-dialog.tsx:192-197`).
	await expect.poll(() => api.writesOf('POST', TAGS_ROUTE).length, { timeout: 30_000 }).toBe(2);
	await expect.poll(async () => rowLabelsOf(page)).toEqual([...printedNames(labels), 'Priority: Critical']);
	expect(api.labels.map((label) => label.name)).not.toContain('Priority: Low');
	// A partial add closes the dialog.
	await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
	await parkPointer(page);
	await expect(toastsOf(page)).toHaveCount(0, { timeout: 30_000 });

	// Nothing filed: the toast says it, the dialog stays open and the picks stay picked.
	api.setWriteRefusals({ create: nameTakenRefusal('Frontend') });
	await browseButtonOf(page).click({ timeout: 15_000 });
	const catalog = catalogOf(page);
	await expect(catalog).toBeVisible({ timeout: 15_000 });
	await pickCatalogLabels(page, 'Frontend', 'Backend');
	await catalogAddButtonOf(page, 2).click({ timeout: 15_000 });
	report('toasts after every label was refused', await toastShapeOf(page));
	await expect
		.poll(async () => await toastShapeOf(page), { timeout: 30_000 })
		.toEqual([{ type: 'error', text: copyOf.catalogFailedToast }]);
	await expect.poll(() => api.writesOf('POST', TAGS_ROUTE).length, { timeout: 30_000 }).toBe(4);
	await expect(catalog).toHaveCount(1);
	await expect(catalogPickedLineOf(page, 2)).toHaveCount(1);
	await expect(catalogAddButtonOf(page, 2)).toHaveCount(1);
	await expect.poll(async () => rowLabelsOf(page)).toEqual([...printedNames(labels), 'Priority: Critical']);
	report(
		'store after the refused catalog add',
		api.labels.map((label) => label.name)
	);
	await catalog.getByRole('button', { name: copyOf.editorCancel, exact: true }).click({ timeout: 15_000 });
	await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });
	report(
		'console',
		consoleFindings(shield, [armedRefusal('POST', TAGS_BULK_ROUTE, 405), armedRefusal('POST', TAGS_ROUTE, 409)])
	);
	expect(
		consoleFindings(shield, [armedRefusal('POST', TAGS_BULK_ROUTE, 405), armedRefusal('POST', TAGS_ROUTE, 409)])
	).toEqual([]);
});

test('two edits in a row on two rows, with the first answer held: each row gets its own result', async ({
	page,
	fixture,
	shield
}) => {
	const { api, labels } = await openLabelsPage(page, fixture, { holdFirstWriteOf: 'PUT' });

	await openEditorOfRow(page, labels.bug.id);
	await nameFieldOf(page).fill('First rename', { timeout: 15_000 });
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT').length, { timeout: 30_000 }).toBe(1);
	const held = api.writesOf('PUT')[0];
	report('held request', { path: held.path, answered: held.answered });
	expect(held.answered).toBe(false);
	// The row is the editor while its answer is out, and its Save is disabled while saving.
	await expect(saveButtonOf(page)).toBeDisabled();
	await expect
		.poll(async () => rowLabelsOf(page))
		.toEqual(printedNames(labels).filter((name) => name !== printedName(labels.bug.name)));

	// Opening the next row's editor replaces this one (`property-list.tsx:52` keeps one `editor`), while the first request is still unanswered.
	await openEditorOfRow(page, labels.needsReview.id);
	await nameFieldOf(page).fill('Second rename', { timeout: 15_000 });
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT').length, { timeout: 30_000 }).toBe(2);
	await expect(labelOf(page, labels.needsReview.id)).toHaveText('Second rename', { timeout: 30_000 });
	// The first row is a row again, still showing what the list holds for it — nothing optimistic happened.
	await expect(labelOf(page, labels.bug.id)).toHaveText(labels.bug.name, { timeout: 30_000 });
	expect(held.answered, 'the first answer is still held while its row prints the stored name').toBe(false);
	await expect(announceOf(page)).toHaveText(copyOf.announceSaved('Second rename'));
	report('rows while the first answer is held', await rowLabelsOf(page));

	api.releaseWrites();
	await expect(labelOf(page, labels.bug.id)).toHaveText('First rename', { timeout: 30_000 });
	await expect(iconOf(page, labels.bug.id)).toHaveAttribute('style', glyphStyle(String(labels.bug.color)));
	await expect(announceOf(page)).toHaveText(copyOf.announceSaved('First rename'));
	report('rows after the first answer landed', await rowLabelsOf(page));
	report(
		'store',
		api.labels.map((label) => label.name)
	);
	expect(api.labels.map((label) => label.name)).toEqual([
		'First rename',
		labels.followUp.name,
		'Second rename',
		labels.urgent.name,
		labels.systemish.name
	]);
	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});

test('what the page offers a plain team member, and the one write it sends', async ({ page, fixture, shield }) => {
	const { api, labels } = await openLabelsPage(page, fixture, {}, { scenario: { manager: false } });

	// `TeamSettingsGate` is used here without `requiresManager` (`labels-settings-page.tsx:14-60`), so a member who is
	// not a manager gets the page itself, and labels skip the task-settings rule (`property-list.tsx:44-47`).
	await expect(page.getByText(copyOf.managersOnly, { exact: true })).toHaveCount(0);
	await expect(headerAddOf(page)).toBeEnabled();
	await expect(addRowOf(page)).toBeEnabled();
	await expect(browseButtonOf(page)).toBeEnabled();
	await openRowMenu(page, labels.systemish.id);
	report('menu of the isSystem label, for a member', await menuItems(page));
	await expect
		.poll(async () => menuItems(page))
		.toEqual([
			{ text: copyOf.menuEdit, disabled: 'no-attr' },
			{ text: copyOf.menuDelete, disabled: 'no-attr' }
		]);
	await expect(page.getByRole('menuitem', { name: copyOf.menuMakeDefault, exact: true })).toHaveCount(0);
	await expect(page.getByRole('menuitem', { name: copyOf.menuMoveUp, exact: true })).toHaveCount(0);
	await expect(page.getByRole('menuitem', { name: copyOf.menuMoveDown, exact: true })).toHaveCount(0);
	await closeRowMenu(page);

	await headerAddOf(page).click({ timeout: 15_000 });
	await nameFieldOf(page).fill('Member wrote this', { timeout: 15_000 });
	await saveButtonOf(page).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('POST', TAGS_ROUTE).length, { timeout: 30_000 }).toBe(1);
	report('the member POST', api.writesOf('POST', TAGS_ROUTE)[0].body);
	expect(bodyOf(api.writesOf('POST', TAGS_ROUTE)[0])).toEqual({
		name: 'Member wrote this',
		color: '#F97316',
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		organizationTeamId: fixture.ids.teamA
	});
	await expect(page.locator('[data-property-row]')).toHaveCount(6, { timeout: 30_000 });
	await expect(announceOf(page)).toHaveText(copyOf.announceAdded('Member wrote this'));
	report('console', consoleFindings(shield));
	expect(consoleFindings(shield)).toEqual([]);
});
