import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Page } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit, waitForShellReady } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * Settings › Team › General in a browser: **`/settings/team`** (`app/[locale]/(main)/settings/team/page.tsx` →
 * `core/components/settings/pages/team-general/team-general-settings-page.tsx:19-79`), on lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`, control 3994 — `playwright/test-servers.ts:38`).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's app and its mock. The mock answers `/api/user/me`, `/api/auth/workspaces`, `/api/role-permissions/me`
 * (its role carries `ORG_EMPLOYEES_EDIT`, `cypress/support/mock-gauzy-server.mjs:50`) and the notification reads, and
 * `/api/organization-team*` with its one fixture team (`mock-gauzy-server.mjs:655-656`; team shape `:239-256`, organization
 * `:86-99`, member rows `:199-217`). For anything else a GET answers `{items:[],total:0}` and a write echoes its body
 * (`:893-895`); it has **no** handler for `PUT`/`DELETE /api/organization-team/:id`, `PUT /api/employee/:id` or the avatar
 * upload, and it stores nothing.
 * **Served by this file** (`serveStore`: `page.route` on the mock origin, restating the mock's CORS answer and answering
 * `OPTIONS` with 204 — the pattern of `suites/lane-b/team-integrations-settings-ui.spec.ts`): the team
 * (`GET /api/organization-team`, `GET|PUT|DELETE /api/organization-team/<id>`), the organization
 * (`GET|PUT /api/organization/<id>`), the member rows (`PUT|DELETE /api/organization-team-employee/<id>`), the employee write
 * (`PUT /api/employee/<id>`), the avatar upload (`POST /api/image-assets/upload/organization_teams_avatars`) and the picture
 * bytes it hands back. **Store-backed**: a write changes what the next read answers, so a reload reads the saved value back and
 * a refused write changes nothing. `route.fetch()` is never called — every served path leaves the mock's log empty, which is
 * the witness that the page acted on this file's answer.
 * The served team and organization start from the mock's own shape, ids and names and only then add the keys the mock never
 * serves: `color`, `emoji`, `teamSize`, `image`/`imageId`, `defaultProjectId`, `notificationDefaults`, a second project; on the
 * organization `requireTeam`/`requireProject`/`requireTask` and `restrictTrackingSwitchToHigherRoles`. Member roles are this
 * file's, because the mock gives **every** member the same role object (`mock-gauzy-server.mjs:199-217`) and
 * `isTeamManagerMember` counts a member whose role is ADMIN/MANAGER as a manager of the team
 * (`core/stores/teams/organization-team.ts:70-85`): left to the mock all three fixture members read as managers, which is why
 * the mock's own Delete row says `BLOCKED_OTHER_MANAGERS` (measured in `-probe-teamgeneral-run1.log`).
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - Page: `team-general-settings-page.tsx:19-79` — `canEdit = settings.isTeamManager || isOrganizationAdmin` **`:27`**; the
 *   organization sections only when `isOrganizationAdmin` **`:74-75`**; `TeamDangerSection` always **`:76`**. Section ids and
 *   order (`core/components/settings/kit/settings-page.tsx:68-88`): `#team`, `#visibility`, `#projects`, `#tracking`,
 *   `#notification-defaults`, `#organization-tracking`, `#organization-tracking-switch`, `#danger-zone`. Gate:
 *   `core/components/settings/kit/team-settings-gate.tsx:39-55` (`!isTeamMember` → `NoTeam`).
 * - Role: `isOrganizationAdminState = isTenantAdminRole(user.role.name)` (`core/stores/teams/organization-team.ts:193-196`),
 *   `isTeamManagerState` `:172-179`; the mock's role name follows `scenario.roleName`, else `ADMIN`, or `EMPLOYEE` with
 *   `manager: false` (`mock-gauzy-server.mjs:73-84`).
 * - Team writes: `core/hooks/settings/use-team-general-settings.ts` — name `:71`, color `:73`, emoji `:75`, size `:83`,
 *   default project `:90-116`, visibility `:118-129`, avatar `:131-150`, `saveTeamRule` `:154-167`, share profiles `:169`,
 *   require plan `:174-183`, notification defaults `:186`, own tracking `:195-204`. They go through
 *   `core/hooks/organizations/teams/use-edit-organization-team.ts:33-58` → `PUT /api/organization-team/:id`
 *   (`core/services/client/api/organizations/teams/team.service.ts:267-296`), and because the lane hands the browser
 *   `NEXT_PUBLIC_GAUZY_API_SERVER_URL` the service follows **every** team PUT with `GET /api/organization-team/:id`
 *   (`team.service.ts:276-281`) — measured in `-s3-lane-a-teamgeneral-2.log`, MEASURE `4 calls after the name save` =
 *   `PUT /api/organization-team/<id>` then `GET /api/organization-team/<id>`.
 * - Identity: `team-identity-section.tsx` (`TEAM_NAME_MAX_LENGTH = 80` `:21`, `validateName` `:120-127`, the size row's
 *   `htmlFor={sizeId}` `:161-166`, `READ_ONLY_NOTE` `:172`), `core/components/settings/kit/inline-text-row.tsx` (an unchanged
 *   save sends nothing `:77-80`, the validator's message inline `role=alert` `:134-138`, a refused save keeps editing and also
 *   says `settings.common.SAVE_FAILED` `:89-94`, Cancel puts the stored value back `:69-73`, the Edit button's aria-label
 *   `:164-173`), `team-color-control.tsx` (swatches, hex apply with `normalizedHexColor`
 *   (`core/lib/utils/settings-team.ts:295-301`), remove), `team-emoji-control.tsx:72` (`save(picked.native)` — the emoji
 *   character is what the team stores), `team-avatar-row.tsx` (`teamImageUrlOf` = `image.thumbUrl ?? image.fullUrl` `:35-41`,
 *   the hidden file input `:135-145`, the upload/remove buttons `:146-162`).
 * - Visibility: `team-visibility-section.tsx` — `ChoiceCards` (a `fieldset` with an `sr-only` legend and radio inputs,
 *   `core/components/settings/kit/choice-cards.tsx:44-86`); the read-only branch prints only the picked card `:141-160`; the
 *   link `:42-49` over `teamShareLinkOf` (`core/lib/utils/settings-team.ts:278-291` →
 *   `${origin}/<locale>/team/<id>/<profile_link>`), printed only while public (`publicLinkOf` `:35-40`); Copy writes the
 *   clipboard only `:64-71`.
 * - Default project: `team-default-project-section.tsx:94-106` (the choices come from the team's own `projects`,
 *   `canChoose = canEdit && projects.length > 0` `:97`, and without projects the row prints `NOT_SET` `:24-30`); the stored id
 *   is `defaultProjectId`, else the team's first project (`core/lib/helpers/team-default-project.ts:10-19`); the kept-check and
 *   its two toasts `use-team-general-settings.ts:101-108`.
 * - Time tracking rows: `team-tracking-section.tsx:77,103-126`; one member's switch is the two writes of
 *   `core/hooks/settings/use-member-tracking-switch.ts` (`restrictsSwitch` `:54`, `canEditEmployees` needs
 *   `ORG_EMPLOYEES_EDIT` `:74`, `writesEmployeeTracking` `:95-103`, `saveMemberTracking` `:109-155`: the team-row PUT
 *   (`PUT /api/organization-team-employee/<rowId>`) first, then the employee PUT `PUT /api/employee/:id` with `data` as its
 *   body (`core/services/client/api/organizations/teams/employee.service.ts:91-101`), and a refused employee PUT re-PUTs the
 *   team row with its previous value (`previousTeamTracking` `:126`, the rollback `:140`); the ranks are `core/lib/helpers/tracking-switch.ts:36-41` (an admin may act
 *   on anyone, themselves included; a manager only on a lower rank).
 * - Organization rows: `organization-tracking-section.tsx` (`requirementsServedBy` `:74-76` prints a row only for a key the
 *   read carried; the load failure `role="alert"` + `notifications.RETRY` `:84-95`) over
 *   `core/hooks/settings/use-organization-tracking-requirements.ts` (`TRACKING_REQUIREMENTS` `:24-30`, the save `:51-74` →
 *   `organizationService.updateOrganization` (`organization.service.ts:33-45`), which reads the organization **before** its
 *   PUT and sends `{name, currency, ...changes}`); `organization-tracking-switch-section.tsx:42` hides the whole section
 *   without the key.
 * - Notification defaults: `team-notification-defaults-section.tsx` — no section when the read has no `notificationDefaults`
 *   key **`:202`**; five `DefaultRow`s `:211-269` (a `SettingsRow` with `htmlFor={triggerId}`, so each select is named by its
 *   row label); the queue `:139-198` (every save sends the whole defaults, and a refused change is taken back out `:186`). Hour
 *   choices `[2,4,6,8,10,12]` and `[1,4,24,48,72,168]` (`core/lib/notifications/timer-reminders.ts:22`,
 *   `core/lib/notifications/task-due-reminders.ts:17`).
 * - Danger: `core/hooks/settings/use-team-danger-zone.ts` (rules `:68` over `core/lib/utils/settings-team.ts:214-276`,
 *   transfer candidates `:71-87`, `transferTeam` `:89-108` with the roster of `:42-57` — the person who transfers stays a
 *   member and stops being a manager — `deleteTeam` `:110-117`, `quitTeam` `:119-131`) and `team-danger-section.tsx` (block
 *   copy keys `:16-22`, the transfer `Select` named by `TRANSFER_PICK_LABEL` `:112-130`, the confirm disabled until picked
 *   `:117`, the typed confirmation for Delete `:171`, rows `:263-283`) over `core/components/settings/kit/danger.tsx`
 *   (`TYPE_TO_CONFIRM` label + input `:147-161`, the inline error `role="alert"` `:165-169`, the disabled confirm `:180`). The
 *   delete's toast and its sign-out timer are `core/hooks/organizations/teams/use-delete-organization-team.ts:52-69`
 *   (`logOut()` 3 s after the success toast); `logOut` ends in `window.location.replace(DEFAULT_APP_PATH)`
 *   (`core/hooks/auth/use-authenticate-user.ts:184`, `DEFAULT_APP_PATH = '/auth/passcode'`
 *   `core/constants/config/constants.tsx:98-101`); the quit's toast and team reload
 *   `core/hooks/organizations/teams/use-organization-teams-employee.ts:46-60`, and its DELETE query is built at
 *   `team-employee.service.ts:33-37`.
 * - Copy read from `locales/en.json` by key, never typed: `settings.entries.teamGeneral.{TITLE,DESCRIPTION}`,
 *   `settings.teamGeneral.*`, `settings.common.{EDIT_FIELD,SAVE_FAILED,TYPE_TO_CONFIRM}`, `common.{SAVE,CANCEL,NO_TEAM}`,
 *   `toasts.teams.*`, `toasts.REASONS.{INVALID,SERVER}`, `notifications.RETRY`,
 *   `notifications.SETTINGS_PAGE.{CHANNELS,TIMER,TASK_DUE}.*`.
 *
 * ## Where every pinned value came from (measure first, then pin)
 *
 * `-probe-teamgeneral-run1.log` (the page as the mock answers it: the section list with no `#notification-defaults` and no
 * `#organization-tracking-switch`, `Other managers are in this team. Only its last manager can delete it.`, the share link
 * `http://localhost:3031/en/team/<teamA>/fixture-team`, the size options `Only me / 2 - 5 people / 6 - 20 people / 21 - 100
 * people / 100+ people`, the colour popover's swatch labels `Use #6366f1 … Use #64748b` plus `Pick a custom color`);
 * `-probe-teamgeneral-run2.log` (the served page with every key: all eight sections, the organization rows printed only for the
 * served keys, the switches `team-own-time-tracking=true, team-share-profile-views=false, team-require-daily-plan=false,
 * organization-requireTeam=true, organization-requireProject=false, organization-requireTask=false,
 * organization-restrictTrackingSwitchToHigherRoles=true`, `Only its 2 members see the team.`, and the page of a team manager who
 * is not an organization admin with the rank rule on and off); `-s3-lane-a-teamgeneral-<n>.log` — this file's own runs, whose
 * `[lane-a team-general] MEASURE …` lines are where every write body, every refusal's console line, the emoji the picker hands
 * over and where the sign-out lands were measured before being pinned. The hour choices above are read out of the two
 * `core/lib/notifications/*` files; `USD` and the organization name are what this file's own store serves.
 *
 * ## What the page does that the code does not say (measured notes, no finding tag)
 *
 * - **An over-long team name cannot be typed.** The field carries `maxLength={TEAM_NAME_MAX_LENGTH}` = 80
 *   (`team-identity-section.tsx:21` handed to `kit/inline-text-row.tsx:123`), so filling 81 characters leaves 80 in the
 *   field and 80 saves (`-s3-lane-a-teamgeneral-2.log`: MEASURE `4 value after filling 81 characters` = 80 `x`, then the
 *   clamped PUT went out). `validateName`'s own length branch (`team-identity-section.tsx:120-127`) is a guard the UI
 *   cannot reach; the empty name is the refusal the row really shows.
 * - **A size chosen in this session prints nowhere in the trigger.** Right after the pick the trigger's own text is empty
 *   (MEASURE `5 size trigger after the pick` = `""`, `5 comboboxes after the pick` = `team = ` while every other
 *   combobox on the same page prints its value), although the PUT carries `teamSize` and the picker marks the chosen
 *   option `data-state="checked"`. What the trigger prints comes from `SelectValue`'s children
 *   (`core/components/common/select.tsx:176-186` prints them only when the caller passed some) and
 *   `team-identity-section.tsx:62-65` passes one only for a **stored** value — so the chosen word appears once the team is
 *   read again: MEASURE `5 size trigger after reload` = `2 - 5 people`. Test 5 pins both halves.
 * - **The emoji picker mounts inside a shadow root** (`node_modules/emoji-mart/dist/module.js` calls `attachShadow`):
 *   Playwright's locator reaches its buttons, a browser-side `querySelectorAll` does not — in
 *   `-s3-lane-a-teamgeneral-1.log` the same popover had `locator('button').count()` above 1 while its
 *   `querySelectorAll('button')` returned none. An emoji button's own `aria-label` is the character (its source sets
 *   `aria-label": native`), and the saved `emoji` equals it.
 * - **A visibility card's radio cannot be clicked.** It is `className="peer sr-only"` under the card's glyph span, which
 *   intercepts the pointer (`-s3-lane-a-teamgeneral-1.log`: `<span class="flex size-8 … keycap-3d …"> intercepts pointer
 *   events`); what the pointer reaches is the card's `<label>` (`kit/choice-cards.tsx:53-66`). A label's `textContent`
 *   joins its title and detail spans without the space the accessible name carries, so a text filter on the card's name
 *   matches nothing — the label is matched by the radio it holds.
 * - **Quit does not move the page.** After the DELETE and its toast the page is still this team's General page with the
 *   same sections (MEASURE `16 url after the quit` = `http://localhost:3031/settings/team`), `common.NO_TEAM` is not
 *   printed, and all three Danger rows are blocked: Leave `BLOCKED_NOT_MEMBER`, Transfer and Delete
 *   `BLOCKED_NOT_MANAGER`.
 * - **The team detail read repeats `relations[]` once per relation** — 8 of them (MEASURE `1 team detail raw query
 *   keys`); the pinned list is the deduped one.
 * - **A refused employee tracking write leaves the switch where the last save had it** — `false`, the off the previous
 *   save wrote, not the value the refused click aimed at (`aria-checked="false"`,
 *   `-s3-lane-a-teamgeneral-2.log`).
 *
 * ## What this file does NOT cover (and why)
 *
 * - The other Settings › Team pages (`/settings/team/members`, `statuses`, `integrations`, …) have their own specs.
 * - `TeamGeneralSettingsSkeleton` (`team-general-settings-page.tsx:25`, the gate's loading branch) is not pinned: a stub that
 *   answers at once cannot show an open read honestly.
 * - The avatar **file guard** (`AVATAR_TYPE_ERROR` / `AVATAR_SIZE_ERROR`, `team-avatar-row.tsx:83-87`): the upload itself is
 *   covered (test 18), a wrong file type or an over-large file is not driven.
 * - `SHARE_LINK_NOT_COPIED` (a clipboard the browser refused) is not driven: this file grants the clipboard to test 7 only.
 * - Strict Mode's double mount (`playwright/helpers.ts:37-43`) is why a cold load may read one query twice; no test pins a
 *   request count, and no test pins the order of two concurrent reads.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const PAGE_PATH = '/settings/team';

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/** This file's own ids — nothing real, and UUID-shaped, because `baseDateSchema` validates every `id` as a UUID
 *  (`core/types/schemas/common/base.schema.ts:8,11`). */
const PROJECT_B_ID = '7f000000-0000-4000-8000-0000000000b2';
const PROJECT_A_NAME = 'Served Project A';
const PROJECT_B_NAME = 'Served Project B';
const IMAGE_ID = '7f000000-0000-4000-8000-0000000000a1';
const IMAGE_PATH = '/probe-assets/team-avatar.png';
const IMAGE_URL = `${MOCK_API_ORIGIN}${IMAGE_PATH}`;
/** A real 8×8 PNG built here; no file is read from disk. */
const IMAGE_BYTES = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAF0lEQVR4nGP8z8DwgIGBgZGJiYkJJhgJAAAPfwIB1eWvGQAAAABJRU5ErkJggg==',
	'base64'
);
/** `DAILY_PLAN_SUGGESTION_MODAL_DATE` (`core/constants/config/constants.tsx:681`), cleared when a plan becomes required. */
const PLAN_MODAL_KEY = 'daily-plan-suggestion-modal-date';
/** The hex this file types into the colour picker; `normalizedHexColor` lower-cases it before it is saved. */
const CUSTOM_HEX = '#ABCDEF';

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: { SAVE: string; CANCEL: string; NO_TEAM: string };
	notifications: {
		RETRY: string;
		SETTINGS_PAGE: {
			CHANNELS: Record<string, string>;
			TIMER: Record<string, string>;
			TASK_DUE: Record<string, string>;
		};
	};
	settings: {
		entries: { teamGeneral: { TITLE: string; DESCRIPTION: string } };
		common: { EDIT_FIELD: string; SAVE_FAILED: string; TYPE_TO_CONFIRM: string };
		teamGeneral: Record<string, string>;
	};
	toasts: { teams: Record<string, string>; REASONS: Record<string, string> };
};
const S = EN.settings.teamGeneral;
const PAGE_COPY = EN.settings.entries.teamGeneral;
const T = EN.toasts.teams;
const REASONS = EN.toasts.REASONS;
const C = EN.common;
const SC = EN.settings.common;
const CHANNELS = EN.notifications.SETTINGS_PAGE.CHANNELS;
const TIMER_COPY = EN.notifications.SETTINGS_PAGE.TIMER;
const TASK_DUE_COPY = EN.notifications.SETTINGS_PAGE.TASK_DUE;

const report = (label: string, value: unknown) =>
	console.log(`[lane-a team-general] MEASURE ${label} ${JSON.stringify(value)}`);
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** A next-intl `{name, plural, one {…} other {…}}` message, rendered the way next-intl renders it for `value`. */
const pluralTextOf = (template: string, value: number) =>
	template.replace(/\{[A-Za-z]\w*,\s*plural,\s*(?:[^{}]|\{[^{}]*\})+\}/, (block) => {
		const picked = new RegExp(`${value === 1 ? 'one' : 'other'}\\s*\\{([^{}]*)\\}`).exec(block);
		return picked ? picked[1].replace(/#/g, String(value)) : block;
	});

/* ------------------------------------------------------------------ the served store ------------------------------------------------------------------ */

type MemberSpec = {
	rowId: string;
	employeeId: string;
	userId: string;
	name: string;
	email: string;
	isManager: boolean;
	roleName: string;
	isTrackingEnabled: boolean;
};

type Store = {
	team: Record<string, unknown>;
	organization: Record<string, unknown>;
	/** Armed refusals; `null` answers normally. Every test names the one it arms. */
	failTeamPut: number | null;
	failEmployeePut: number | null;
	failOrganizationRead: number | null;
	/** A server that drops `defaultProjectId` from its answer (`use-team-general-settings.ts:101-108`). */
	dropsDefaultProject: boolean;
	/** Set by a test to hold the next team PUT answer until it releases this promise. */
	holdTeamPut: Promise<void> | null;
};

/** A member row in the mock's own shape (`mock-gauzy-server.mjs:199-217`), which `organizationTeamEmployeeSchema` accepts. */
const memberRowOf = (ids: Record<string, string>, spec: MemberSpec) => {
	const user = {
		id: spec.userId,
		name: spec.name,
		firstName: spec.name.split(' ')[0],
		lastName: spec.name.split(' ').slice(1).join(' '),
		email: spec.email,
		timeZone: 'UTC',
		isEmailVerified: true,
		tenantId: ids.tenantA,
		employeeId: spec.employeeId
	};
	const role = { id: ids.role, name: spec.roleName, isSystem: true, rolePermissions: [], tenantId: ids.tenantA };
	const employee = {
		id: spec.employeeId,
		userId: spec.userId,
		user,
		fullName: spec.name,
		isTrackingEnabled: spec.isTrackingEnabled,
		isTrackingTime: false,
		isActive: true,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA
	};
	return {
		id: spec.rowId,
		employeeId: spec.employeeId,
		employee,
		user,
		isManager: spec.isManager,
		isActive: true,
		isTrackingEnabled: spec.isTrackingEnabled,
		activeTaskId: null,
		activeTask: null,
		organizationTeamId: ids.teamA,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		roleId: ids.role,
		role,
		totalWorkedTasks: [],
		totalTodayTasks: []
	};
};

/** Self (`isTrackingEnabled: true`, with the given member-role name and manager flag) plus one plain member, tracking off. */
const rosterOf = (
	ids: Record<string, string>,
	names: Record<string, string>,
	selfRoleName: string,
	options: { selfIsManager?: boolean; teammateIsManager?: boolean } = {}
): MemberSpec[] => [
	{
		rowId: ids.member,
		employeeId: ids.employee,
		userId: ids.user,
		name: names.user,
		email: 'manager@example.test',
		isManager: options.selfIsManager !== false,
		roleName: selfRoleName,
		isTrackingEnabled: true
	},
	{
		rowId: ids.teammateMember,
		employeeId: ids.teammateEmployee,
		userId: ids.teammateUser,
		name: names.teammate,
		email: 'teammate@example.test',
		isManager: options.teammateIsManager === true,
		roleName: 'EMPLOYEE',
		isTrackingEnabled: false
	}
];

/** A project in the mock's own shape (`mock-gauzy-server.mjs:224-238`). */
const projectOf = (ids: Record<string, string>, id: string, name: string, code: string) => ({
	id,
	name,
	public: true,
	owner: null,
	code,
	currency: 'USD',
	organizationId: ids.organizationA,
	tenantId: ids.tenantA,
	members: [],
	teams: [],
	tags: []
});

/** The mock's team and organization (`mock-gauzy-server.mjs:86-99,239-256`) plus the keys these tests need. */
const newStore = (
	ids: Record<string, string>,
	names: Record<string, string>,
	options: {
		members?: MemberSpec[];
		projects?: Array<{ id: string; name: string; code: string }>;
		team?: Record<string, unknown>;
		organization?: Record<string, unknown>;
	} = {}
): Store => {
	const members = (options.members ?? rosterOf(ids, names, 'ADMIN')).map((spec) => memberRowOf(ids, spec));
	const projects = (
		options.projects ?? [
			{ id: ids.project, name: PROJECT_A_NAME, code: 'FIX' },
			{ id: PROJECT_B_ID, name: PROJECT_B_NAME, code: 'PRB' }
		]
	).map((project) => projectOf(ids, project.id, project.name, project.code));
	return {
		team: {
			id: ids.teamA,
			name: names.teamA,
			organizationId: ids.organizationA,
			tenantId: ids.tenantA,
			public: true,
			profile_link: 'fixture-team',
			prefix: 'FIA',
			shareProfileView: false,
			requirePlanToTrack: false,
			projects,
			tasks: [],
			statuses: [],
			notificationDefaults: { email: 'digest', push: true, timerReminderHours: 4 },
			...options.team,
			members,
			managers: members.filter((member) => member.isManager)
		},
		organization: {
			id: ids.organizationA,
			name: names.organizationA,
			isDefault: true,
			profile_link: 'fixture-organization-a',
			totalEmployees: 3,
			banner: null,
			currency: 'USD',
			timeZone: 'UTC',
			allowManualTime: true,
			allowModifyTime: true,
			allowDeleteTime: true,
			tenantId: ids.tenantA,
			requireTeam: true,
			requireProject: false,
			requireTask: null,
			restrictTrackingSwitchToHigherRoles: true,
			...options.organization
		},
		failTeamPut: null,
		failEmployeePut: null,
		failOrganizationRead: null,
		dropsDefaultProject: false,
		holdTeamPut: null
	};
};

const pathsOf = (ids: Record<string, string>) => ({
	teamList: '/api/organization-team',
	teamDetail: `/api/organization-team/${ids.teamA}`,
	organizationDetail: `/api/organization/${ids.organizationA}`,
	employeeDetail: `/api/employee/${ids.employee}`,
	employeeTeamsPrefix: '/api/organization-team-employee/',
	upload: '/api/image-assets/upload/organization_teams_avatars'
});

type Call = { method: string; path: string; query: string; body: string | null };

/** Polls a captured call list until a matching call was asked for, then returns it. */
async function waitForCall(calls: Call[], predicate: (call: Call) => boolean): Promise<Call> {
	await expect.poll(() => calls.find(predicate) ?? null, { timeout: 30_000, intervals: [250] }).not.toBeNull();
	return calls.find(predicate) as Call;
}

type StoreHarness = {
	calls: Call[];
	teamDetail: string;
	organizationDetail: string;
	employeeDetail: string;
	employeeTeamsPrefix: string;
	/** Every call this stand-in was asked for, as `METHOD path`. */
	all: () => string[];
	/** Non-GET calls since `mark`, as `METHOD path body`. */
	writesSince: (mark: number) => string[];
	waitFor: (predicate: (call: Call) => boolean) => Promise<Call>;
	/** The next non-GET call at or after `mark`. */
	nextWrite: (mark: number) => Promise<Call>;
	/** The next `PUT` of the team at or after `mark`. */
	nextTeamPut: (mark: number) => Promise<Call>;
};

/**
 * The served store, on the mock origin. Never `route.fetch()`: a served path leaves the mock's log empty, which is the proof
 * the page acted on this answer. A path left out here is left to the mock (`/api/user/me`, the workspace and permission reads,
 * the notification reads). Calling it again on the same page installs a newer store, which answers from then on.
 */
async function serveStore(page: Page, ids: Record<string, string>, store: Store): Promise<StoreHarness> {
	const calls: Call[] = [];
	const paths = pathsOf(ids);
	let deletedTeam = false;
	const membersOf = () => (store.team.members as Record<string, unknown>[]) ?? [];
	const ownRow = () => membersOf().find((member) => member.employeeId === ids.employee) ?? null;

	const answerFor = (path: string): unknown => {
		if (path === paths.teamList) return deletedTeam ? { items: [], total: 0 } : { items: [store.team], total: 1 };
		if (path === paths.teamDetail) return deletedTeam ? null : store.team;
		if (path === paths.organizationDetail) return store.organization;
		if (path.startsWith(paths.employeeTeamsPrefix))
			return membersOf().find((member) => member.id === path.slice(paths.employeeTeamsPrefix.length)) ?? null;
		if (path === paths.employeeDetail) return ownRow();
		return { items: [], total: 0 };
	};

	/** Gauzy rewrites the member set only when the body names `memberIds` or `managerIds` (`use-team-general-settings.ts:152`). */
	const applyTeamPut = (sent: Record<string, unknown>) => {
		const next: Record<string, unknown> = { ...store.team, ...sent };
		if (store.dropsDefaultProject && 'defaultProjectId' in sent) {
			delete next.defaultProjectId;
		}
		const managerIds = Array.isArray(sent.managerIds) ? (sent.managerIds as string[]) : null;
		const memberIds = Array.isArray(sent.memberIds) ? (sent.memberIds as string[]) : null;
		if (managerIds || memberIds) {
			const managers = new Set(managerIds ?? []);
			const keep = new Set(memberIds ?? []);
			const kept = membersOf()
				.filter((member) => keep.size === 0 || keep.has(String(member.employeeId)))
				.map((member) => ({ ...member, isManager: managers.has(String(member.employeeId)) }));
			next.members = kept;
			next.managers = kept.filter((member) => member.isManager === true);
		}
		store.team = next;
	};

	const setTracking = (rowId: string, enabled: boolean) => {
		const members = membersOf().map((member) =>
			member.id === rowId
				? {
						...member,
						isTrackingEnabled: enabled,
						employee: { ...(member.employee as Record<string, unknown>), isTrackingEnabled: enabled }
					}
				: member
		);
		store.team = { ...store.team, members };
	};

	await page.route(
		(url: URL) =>
			url.origin === MOCK_API_ORIGIN &&
			(url.pathname === paths.teamList ||
				url.pathname === paths.teamDetail ||
				url.pathname === paths.organizationDetail ||
				url.pathname === paths.employeeDetail ||
				url.pathname.startsWith(paths.employeeTeamsPrefix) ||
				url.pathname.startsWith('/api/image-assets/') ||
				url.pathname === IMAGE_PATH),
		async (route) => {
			const request = route.request();
			const path = new URL(request.url()).pathname;
			const method = request.method();
			if (method === 'OPTIONS') {
				void route.fulfill({ status: 204, headers: CORS_HEADERS });
				return;
			}
			calls.push({
				method,
				path,
				query: new URL(request.url()).searchParams.toString(),
				body: request.postData()
			});
			const json = (status: number, payload: unknown) =>
				void route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				});
			const refuse = (status: number, name: string) =>
				json(status, { statusCode: status, message: `Synthetic team-general refusal (${name})` });

			if (path === IMAGE_PATH) {
				void route.fulfill({ status: 200, headers: { 'content-type': 'image/png' }, body: IMAGE_BYTES });
				return;
			}
			if (path === paths.upload && method === 'POST') {
				// `imageAssetSchema` is `.strict()` (`core/types/schemas/common/image-asset.schema.ts:16-35`): only its keys
				json(200, {
					id: IMAGE_ID,
					name: 'served-team-avatar.png',
					url: IMAGE_PATH,
					fullUrl: IMAGE_URL,
					thumbUrl: IMAGE_URL,
					thumb: null,
					width: 8,
					height: 8,
					size: IMAGE_BYTES.length,
					tenantId: ids.tenantA,
					organizationId: ids.organizationA
				});
				return;
			}
			if (path === paths.teamDetail && method === 'GET' && deletedTeam) {
				return refuse(404, 'deleted team');
			}
			if (path === paths.organizationDetail && method === 'GET' && store.failOrganizationRead !== null) {
				return refuse(store.failOrganizationRead, 'organization GET');
			}
			if (path === paths.teamDetail && method === 'PUT') {
				if (store.holdTeamPut) await store.holdTeamPut;
				if (store.failTeamPut !== null) return refuse(store.failTeamPut, 'team PUT');
				applyTeamPut(JSON.parse(request.postData() ?? '{}') as Record<string, unknown>);
				return json(200, store.team);
			}
			if (path === paths.teamDetail && method === 'DELETE') {
				// the team answers 404 for every read after this one, as a server would
				deletedTeam = true;
				return json(200, store.team);
			}
			if (path === paths.organizationDetail && method === 'PUT') {
				store.organization = {
					...store.organization,
					...(JSON.parse(request.postData() ?? '{}') as Record<string, unknown>)
				};
				return json(200, store.organization);
			}
			if (path === paths.employeeDetail && method === 'PUT') {
				if (store.failEmployeePut !== null) return refuse(store.failEmployeePut, 'employee PUT');
				const sent = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
				setTracking(ids.member, Boolean(sent.isTrackingEnabled));
				return json(200, ownRow());
			}
			if (path.startsWith(paths.employeeTeamsPrefix) && method === 'PUT') {
				const sent = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
				setTracking(path.slice(paths.employeeTeamsPrefix.length), Boolean(sent.isTrackingEnabled));
				return json(200, answerFor(path));
			}
			if (path.startsWith(paths.employeeTeamsPrefix) && method === 'DELETE') {
				const rowId = path.slice(paths.employeeTeamsPrefix.length);
				const members = membersOf().filter((member) => member.id !== rowId);
				store.team = {
					...store.team,
					members,
					managers: members.filter((member) => member.isManager === true)
				};
				return json(200, { affected: 1, raw: [] });
			}
			return json(200, answerFor(path));
		}
	);

	return {
		calls,
		teamDetail: paths.teamDetail,
		organizationDetail: paths.organizationDetail,
		employeeDetail: paths.employeeDetail,
		employeeTeamsPrefix: paths.employeeTeamsPrefix,
		all: () => calls.map((call) => `${call.method} ${call.path}`),
		writesSince: (mark) =>
			calls
				.slice(mark)
				.filter((call) => call.method !== 'GET')
				.map((call) => `${call.method} ${call.path} ${call.body ?? '<no body>'}`),
		waitFor: (predicate) => waitForCall(calls, predicate),
		// the mark is a position in this stand-in's own list: a call from before it never answers
		nextWrite: (mark) => waitForCall(calls, (call) => call.method !== 'GET' && calls.indexOf(call) >= mark),
		nextTeamPut: (mark) =>
			waitForCall(
				calls,
				(call) => call.method === 'PUT' && call.path === paths.teamDetail && calls.indexOf(call) >= mark
			)
	};
}

/* ------------------------------------------------------------------ the page helpers ------------------------------------------------------------------ */

/** Raises the navigation allowance for a cold Turbopack compile of this route (the reason is spelled out at
 *  `suites/lane-b/task-property-settings-ui.spec.ts:766-768`); no assertion below waits on a duration. */
test.use({ navigationTimeout: 120_000 });

const section = (page: Page, id: string) => page.locator(`section#${id}`);
const sectionText = async (page: Page, id: string) => flat(await section(page, id).innerText());
const sectionIds = (page: Page) => page.locator('section[id]').evaluateAll((nodes) => nodes.map((node) => node.id));

/** Every `role="switch"` as `<its id> = <aria-checked>`, read in the page (a browser callback cannot see Node variables). */
const switchStates = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('[role=switch]')).map(
			(node) => `${node.id} = ${node.getAttribute('aria-checked')}`
		)
	);
/** Every select trigger as `<section id> = <its printed value>`, in DOM order. */
const comboboxValues = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('[role=combobox]')).map(
			(node) =>
				`${node.closest('section[id]')?.id ?? '?'} = ${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
		)
	);

/** A visibility card's accessible name is its title and its detail read together (measured in
 *  `-s3-lane-a-teamgeneral-part1.log`: `radio "Private Only its 2 members see the team."`). */
const visibilityCard = (title: string, detail: string) => `${title} ${detail}`;

const openSelect = async (trigger: Locator) => {
	await trigger.click({ timeout: 15_000 });
	// the popup is open before anything is read from it: a read taken right after the click could see no option yet
	await expect(trigger.page().getByRole('option').first()).toBeVisible({ timeout: 15_000 });
};
const selectOptions = async (page: Page) => (await page.getByRole('option').allInnerTexts()).map(flat);
/** A Base UI menu or popover is a document-level portal that eats pointer events while open: close it before clicking on. */
const pickOption = async (page: Page, label: string) => {
	await page.getByRole('option', { name: label, exact: true }).click({ timeout: 15_000 });
	await expect(page.getByRole('option')).toHaveCount(0, { timeout: 15_000 });
};
const popoverOf = (page: Page) => page.locator('[data-slot=popover-content]');
/** The buttons of an open popover, read through Playwright's own selector engine: emoji-mart mounts its picker
 *  inside a shadow root (`node_modules/emoji-mart/dist/module.js` calls `attachShadow`), and a browser-side
 *  `querySelectorAll` does not reach into it — measured in `-s3-lane-a-teamgeneral-1.log`, where the popover's
 *  `locator('button').count()` was above 1 while its `querySelectorAll('button')` found none. */
const popoverButtons = (page: Page) =>
	popoverOf(page)
		.locator('button')
		.evaluateAll((nodes) =>
			nodes.map((node) => ({
				text: (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
				aria: node.getAttribute('aria-label') ?? ''
			}))
		);
const closePopover = async (page: Page) => {
	if ((await popoverOf(page).count()) > 0) await page.keyboard.press('Escape');
	await expect(popoverOf(page)).toHaveCount(0, { timeout: 10_000 });
};

/** The row's Edit button is named by `settings.common.EDIT_FIELD` (`inline-text-row.tsx:164-173`), not by its text. */
const editFieldButton = (page: Page, field: string) =>
	page.getByRole('button', { name: SC.EDIT_FIELD.replace('{field}', field), exact: true });
const nameInput = (page: Page) => page.getByRole('textbox', { name: S.NAME_LABEL });
const teamRowButton = (page: Page, name: string) => section(page, 'team').getByRole('button', { name, exact: true });
const dangerButton = (page: Page, name: string) =>
	section(page, 'danger-zone').getByRole('button', { name, exact: true });
const toastOf = (page: Page, text: string) => page.locator('[data-sonner-toast]').filter({ hasText: text });
/** Sonner pauses every countdown while the pointer is over the toaster: park it away before waiting for a toast to go. */
const parkPointer = (page: Page) => page.mouse.move(2, 2);

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1075`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `core/components/common/mutation-error-toaster.tsx:43-45`: dev mode logs every failed mutation, whoever handles it. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** That dev-mode line for one refusal this file armed, by the message `refuse(…, name)` in `serveStore` answers with. */
const armedMutationLine = (name: string) => `${DEV_MUTATION_NOISE} ApiError: Synthetic team-general refusal (${name})`;
/**
 * The client's own line for a refusal this file armed (`core/services/logs/logger-adapter.service.ts:199`):
 * `[ERROR] [HttpClient] HTTP Error: <verb> <service path> <status>`, printed with the **service's** path (no `/api` prefix)
 * and sometimes with its query, so the path is matched between `\S*`.
 */
const armedHttpError = (verb: string, servicePath: string, status: number) =>
	new RegExp(`\\[ERROR\\] \\[HttpClient\\] HTTP Error: ${verb} \\S*${servicePath}\\S* ${status}`);
const servicePathOf = (mockPath: string) => mockPath.slice('/api'.length);

/** What a silence assertion may be empty about: only these exact, named lines. */
const consoleFindings = (shield: Shield, expected: Array<string | RegExp> = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter(
			(line) =>
				!expected.some((pattern) => (typeof pattern === 'string' ? line.includes(pattern) : pattern.test(line)))
		);

const jsonOf = (call: Call) => JSON.parse(call.body ?? '{}') as Record<string, unknown>;

test.describe('lane-a · Settings › Team › General', () => {
	test('1 a team manager who is an organization admin, every key served: the whole page as printed, and the reads at load', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const { ids, names } = fixture;
		const memberCount = rosterOf(ids, names, 'ADMIN').length;
		const store = newStore(ids, names);
		const served = await serveStore(page, ids, store);
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAGE_COPY.TITLE, { timeout: 45_000 });
		await expect(page.getByText(PAGE_COPY.DESCRIPTION)).toBeVisible();
		await expect
			.poll(() => sectionIds(page))
			.toEqual([
				'team',
				'visibility',
				'projects',
				'tracking',
				'notification-defaults',
				'organization-tracking',
				'organization-tracking-switch',
				'danger-zone'
			]);

		// Team: the avatar row, the stored name, and the three controls (`team-identity-section.tsx:133-167`)
		await expect(teamRowButton(page, S.AVATAR_UPLOAD)).toBeVisible();
		await expect(teamRowButton(page, S.AVATAR_REMOVE)).toHaveCount(0);
		await expect(section(page, 'team')).toContainText(names.teamA);
		await expect(editFieldButton(page, S.NAME_LABEL)).toBeVisible();
		await expect(
			page.getByRole('button', { name: S.COLOR_CHANGE.replace('{color}', S.COLOR_NONE), exact: true })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: S.EMOJI_CHANGE.replace('{emoji}', S.EMOJI_NONE), exact: true })
		).toBeVisible();
		await expect(section(page, 'team').getByRole('combobox')).toHaveText(S.SIZE_PLACEHOLDER);

		// Visibility: the served `public: true` is the picked card, and the link is printed under it
		await expect(
			page.getByRole('radio', {
				name: visibilityCard(S.PRIVATE_TITLE, pluralTextOf(S.PRIVATE_DETAIL, memberCount)),
				exact: true
			})
		).not.toBeChecked();
		await expect(
			page.getByRole('radio', { name: visibilityCard(S.PUBLIC_TITLE, S.PUBLIC_DETAIL), exact: true })
		).toBeChecked();
		await expect(section(page, 'visibility')).toContainText(pluralTextOf(S.PRIVATE_DETAIL, memberCount));
		await expect(page.getByRole('textbox', { name: S.SHARE_LINK_LABEL })).toHaveValue(
			`${APP_ORIGIN}/en/team/${ids.teamA}/${String(store.team.profile_link)}`
		);

		// Projects: with no `defaultProjectId` the team's own first project is the default (`team-default-project.ts:10-19`)
		await expect(section(page, 'projects').getByRole('combobox')).toHaveText(PROJECT_A_NAME);

		// Time tracking and the organization rows: every switch and its stored state
		await expect
			.poll(() => switchStates(page))
			.toEqual([
				'team-own-time-tracking = true',
				'team-share-profile-views = false',
				'team-require-daily-plan = false',
				'organization-requireTeam = true',
				'organization-requireProject = false',
				'organization-requireTask = false',
				'organization-restrictTrackingSwitchToHigherRoles = true'
			]);
		// a row only for a requirement key the organization read carried (`organization-tracking-section.tsx:74-76`)
		await expect(section(page, 'organization-tracking')).toContainText(
			S.ORGANIZATION_TRACKING_DESCRIPTION.replace('{organization}', names.organizationA)
		);
		await expect(section(page, 'organization-tracking').getByRole('switch')).toHaveCount(3);
		await expect(
			section(page, 'organization-tracking').getByRole('switch', { name: S.REQUIRE_CLIENT_LABEL })
		).toHaveCount(0);
		await expect(
			section(page, 'organization-tracking').getByRole('switch', { name: S.REQUIRE_DESCRIPTION_LABEL })
		).toHaveCount(0);

		// Notification defaults: five rows, each printing the stored choice's label
		await expect
			.poll(() => comboboxValues(page))
			.toEqual([
				`team = ${S.SIZE_PLACEHOLDER}`,
				`projects = ${PROJECT_A_NAME}`,
				`notification-defaults = ${CHANNELS.MODE_DIGEST}`,
				`notification-defaults = ${S.ON}`,
				`notification-defaults = ${S.MEMBERS_CHOOSE}`,
				`notification-defaults = ${pluralTextOf(TIMER_COPY.AFTER_HOURS, 4)}`,
				`notification-defaults = ${S.MEMBERS_CHOOSE}`
			]);

		// Danger: this team has one manager (self) → Transfer and Leave blocked with their reasons, Delete open
		await expect(dangerButton(page, S.TRANSFER_ACTION)).toBeDisabled();
		await expect(section(page, 'danger-zone')).toContainText(S.BLOCKED_NEEDS_SECOND_MANAGER);
		await expect(dangerButton(page, S.QUIT_ACTION)).toBeDisabled();
		await expect(section(page, 'danger-zone')).toContainText(S.BLOCKED_ONLY_MANAGER);
		await expect(dangerButton(page, S.DELETE_ACTION)).toBeEnabled();

		// The reads at load: the team list and the team detail, both answered here and never by the mock
		await served.waitFor((call) => call.path === '/api/organization-team' && call.method === 'GET');
		const detail = await served.waitFor(
			(call) => call.path === served.teamDetail && call.method === 'GET' && call.query.length > 0
		);
		report('1 served calls at load', served.all());
		report('1 team text', await sectionText(page, 'team'));
		report('1 visibility text', await sectionText(page, 'visibility'));
		report('1 danger text', await sectionText(page, 'danger-zone'));
		// the team detail's query keys, deduped and sorted: `relations[]` is repeated once per relation the client asks
		// for (the raw list is reported; measured as 8 of them in `-s3-lane-a-teamgeneral-1.log`), and
		// `startDate`/`endDate` are left out because they follow the machine's zone
		const rawDetailKeys = decodeURIComponent(detail.query)
			.split('&')
			.map((pair) => pair.split('=')[0])
			.filter((key) => key !== 'startDate' && key !== 'endDate');
		report('1 team detail raw query keys', rawDetailKeys);
		const detailKeys = Array.from(new Set(rawDetailKeys)).sort();
		report('1 team detail query keys', detailKeys);
		expect(detailKeys).toEqual([
			'includeOrganizationTeamId',
			'organizationId',
			'relations[]',
			'tenantId',
			'withLastWorkedTask'
		]);
		const touchedByMock = (await mock.requests())
			.filter((request) =>
				[served.teamDetail, served.organizationDetail, served.employeeDetail, served.employeeTeamsPrefix].some(
					(path) => request.path.startsWith(path)
				)
			)
			.map((request) => `${request.method} ${request.path}`);
		report('S0 mock log served paths', touchedByMock);
		expect(touchedByMock).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test("2 the mock's own team and organization: the sections and rows its keys do not offer", async ({
		page,
		fixture,
		shield
	}) => {
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAGE_COPY.TITLE, { timeout: 45_000 });

		// both reads answered before any absence is claimed: the team's name is printed, and the requirements section is
		// there — its skeleton has no section id (`kit/settings-page.tsx:193-203`), so `section#organization-tracking` is
		// only drawn once the organization read answered (`organization-tracking-section.tsx:84-97`)
		await expect(section(page, 'team')).toContainText(fixture.names.teamA, { timeout: 30_000 });
		await expect(section(page, 'organization-tracking')).toBeVisible({ timeout: 30_000 });
		// it prints no row: the mock's organization carries none
		await expect(section(page, 'organization-tracking').getByRole('switch')).toHaveCount(0);
		await expect(section(page, 'organization-tracking')).not.toContainText(S.REQUIREMENTS_LOAD_FAILED);
		// the mock's team has no `notificationDefaults` key (`mock-gauzy-server.mjs:239-256`) → no section at all
		await expect(section(page, 'notification-defaults')).toHaveCount(0);
		// its organization has no `restrictTrackingSwitchToHigherRoles` (`:86-99`) → no section
		await expect(section(page, 'organization-tracking-switch')).toHaveCount(0);
		// one project and no `defaultProjectId`: the mock's own project is the default (`mock-gauzy-server.mjs:224-234`)
		await expect(section(page, 'projects').getByRole('combobox')).toContainText('Fixture Project');
		// no teamSize / color / emoji served → the controls print their empty labels
		await expect(section(page, 'team')).toContainText(S.SIZE_PLACEHOLDER);
		// the mock gives every member the same role object (ADMIN), so all three read as managers of the team
		await expect(dangerButton(page, S.TRANSFER_ACTION)).toBeEnabled();
		await expect(dangerButton(page, S.QUIT_ACTION)).toBeEnabled();
		await expect(dangerButton(page, S.DELETE_ACTION)).toBeDisabled();
		await expect(section(page, 'danger-zone')).toContainText(S.BLOCKED_OTHER_MANAGERS);
		report('2 sections', await sectionIds(page));
		report('2 switches', await switchStates(page));
		report('2 comboboxes', await comboboxValues(page));
		report('2 danger text', await sectionText(page, 'danger-zone'));
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('3 a plain member: every value read-only, no control, no organization rows, and the Danger rules the role gives', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		await serveStore(
			page,
			ids,
			newStore(ids, names, { members: rosterOf(ids, names, 'EMPLOYEE', { selfIsManager: false }) })
		);
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: { manager: false, roleName: 'EMPLOYEE' } });
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAGE_COPY.TITLE, { timeout: 45_000 });

		await expect(page.getByText(S.READ_ONLY_NOTE, { exact: true })).toBeVisible();
		// the organization sections are an admin's (`team-general-settings-page.tsx:74-75`); this settled list (the team's
		// own notification defaults included) is also the sign the page has drawn before any absence below is claimed
		await expect
			.poll(() => sectionIds(page))
			.toEqual(['team', 'visibility', 'projects', 'tracking', 'notification-defaults', 'danger-zone']);
		await expect(page.locator('[role=switch]')).toHaveCount(0);
		await expect(page.locator('[role=combobox]')).toHaveCount(0);
		await expect(page.locator('input[type=radio]')).toHaveCount(0);
		await expect(teamRowButton(page, S.AVATAR_UPLOAD)).toHaveCount(0);
		await expect(editFieldButton(page, S.NAME_LABEL)).toHaveCount(0);
		// the tracking rows as text with the stored state (`team-tracking-section.tsx:79-98`), the defaults as labels
		await expect(section(page, 'tracking')).toContainText(S.SHARE_PROFILES_LABEL);
		await expect(section(page, 'tracking')).toContainText(S.OFF);
		await expect(section(page, 'notification-defaults')).toContainText(CHANNELS.MODE_DIGEST);
		await expect(section(page, 'notification-defaults')).toContainText(S.MEMBERS_CHOOSE);
		// the visibility section prints only the picked card — and the link with its Copy button, which a member keeps
		await expect(section(page, 'visibility')).toContainText(S.PUBLIC_TITLE);
		await expect(section(page, 'visibility')).not.toContainText(S.PRIVATE_TITLE);
		await expect(section(page, 'visibility').getByRole('textbox', { name: S.SHARE_LINK_LABEL })).toBeVisible();
		await expect(
			section(page, 'visibility').getByRole('button', { name: S.SHARE_LINK_COPY, exact: true })
		).toBeVisible();
		// read-only means no picker: the row prints the stored default, which is the team's first project
		await expect(section(page, 'projects').getByRole('combobox')).toHaveCount(0);
		await expect(section(page, 'projects')).toContainText(PROJECT_A_NAME);
		// Danger: no manager's rights → Transfer and Delete blocked with their reasons, Leave open
		await expect(dangerButton(page, S.TRANSFER_ACTION)).toBeDisabled();
		await expect(dangerButton(page, S.DELETE_ACTION)).toBeDisabled();
		await expect(dangerButton(page, S.QUIT_ACTION)).toBeEnabled();
		report('3 danger text', await sectionText(page, 'danger-zone'));
		report('3 tracking text', await sectionText(page, 'tracking'));
		report('3 visibility text', await sectionText(page, 'visibility'));
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('4 the name row: an empty name refused before any request, an over-long one refused by the field itself, a real name saved and read back', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		const served = await serveStore(page, ids, newStore(ids, names));
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(section(page, 'team')).toBeVisible({ timeout: 45_000 });

		const inlineAlert = section(page, 'team').getByRole('alert');
		await editFieldButton(page, S.NAME_LABEL).click({ timeout: 15_000 });
		await expect(nameInput(page)).toBeVisible();

		// empty: the row's own validator refuses it (`team-identity-section.tsx:120-127`)
		await nameInput(page).fill('');
		let mark = served.calls.length;
		await teamRowButton(page, C.SAVE).click({ timeout: 15_000 });
		await expect(inlineAlert).toContainText(T.NAME_INVALID);
		// a quiet window, 2 s: it proves no request went out for the refused name
		await page.waitForTimeout(2_000);
		expect(served.writesSince(mark)).toEqual([]);

		// an over-long name never reaches the row's validator: the field itself refuses it. `maxLength` is
		// `TEAM_NAME_MAX_LENGTH` = 80 (`team-identity-section.tsx:21` handed to `kit/inline-text-row.tsx:123`), so filling
		// 81 characters leaves 80 in the field (measured in `-s3-lane-a-teamgeneral-1.log`: MEASURE
		// `4 value after filling 81 characters` = 80 `x`, no `role=alert`, the row saved it) — and 80 is a valid name, so
		// the save goes out. The length rule the row's `validateName` also carries (`team-identity-section.tsx:120-127`)
		// is therefore a guard the UI cannot reach, see the header.
		await expect(nameInput(page)).toHaveAttribute('maxlength', '80');
		await nameInput(page).fill('x'.repeat(81));
		await expect(nameInput(page)).toHaveValue('x'.repeat(80));
		report('4 value after filling 81 characters', await nameInput(page).inputValue());
		mark = served.calls.length;
		await teamRowButton(page, C.SAVE).click({ timeout: 15_000 });
		const clamped = await served.nextTeamPut(mark);
		report('4 clamped name PUT body', clamped.body);
		expect(jsonOf(clamped).name).toBe('x'.repeat(80));
		await expect(section(page, 'team')).toContainText('x'.repeat(80), { timeout: 15_000 });

		// a real name: the PUT body, the page, then a reload reads the stored value back from this file's store
		const renamed = `${names.teamA} renamed`;
		await editFieldButton(page, S.NAME_LABEL).click({ timeout: 15_000 });
		await nameInput(page).fill(renamed);
		mark = served.calls.length;
		await teamRowButton(page, C.SAVE).click({ timeout: 15_000 });
		const put = await served.nextTeamPut(mark);
		expect(jsonOf(put).name).toBe(renamed);
		report('4 name PUT body', put.body);
		report(
			'4 calls after the name save',
			served.calls.slice(mark).map((call) => `${call.method} ${call.path}`)
		);
		await expect(section(page, 'team')).toContainText(renamed);
		// a saved row leaves editing mode (`inline-text-row.tsx:90`)
		await expect(editFieldButton(page, S.NAME_LABEL)).toBeVisible({ timeout: 15_000 });

		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect(section(page, 'team')).toContainText(renamed, { timeout: 45_000 });
		report('4 team text after reload', await sectionText(page, 'team'));
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('5 the colour and the size: each PUT body, and a reload reads the stored values back', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		const served = await serveStore(page, ids, newStore(ids, names));
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(section(page, 'team')).toBeVisible({ timeout: 45_000 });

		const colorTriggerOf = (value: string) =>
			page.getByRole('button', { name: S.COLOR_CHANGE.replace('{color}', value), exact: true });
		await expect(colorTriggerOf(S.COLOR_NONE)).toBeVisible();

		// a swatch: the label the page itself offers, read here rather than typed
		await colorTriggerOf(S.COLOR_NONE).click({ timeout: 15_000 });
		await expect(popoverOf(page)).toBeVisible({ timeout: 15_000 });
		const swatchLabels = (await popoverButtons(page)).map((button) => button.aria);
		report('5 swatch labels', swatchLabels);
		const swatchPrefix = S.COLOR_SWATCH.split('{color}')[0];
		const swatchLabel = swatchLabels.find((label) => label.startsWith(swatchPrefix)) ?? '';
		expect(swatchLabel).not.toBe('');
		const swatchHex = swatchLabel.slice(swatchPrefix.length);
		let mark = served.calls.length;
		await popoverOf(page).getByRole('button', { name: swatchLabel, exact: true }).click({ timeout: 15_000 });
		let put = await served.nextTeamPut(mark);
		report('5 swatch PUT body', put.body);
		expect(jsonOf(put).color).toBe(swatchHex);
		await closePopover(page);
		await expect(colorTriggerOf(swatchHex)).toBeVisible({ timeout: 15_000 });

		// a custom hex: `normalizedHexColor` lower-cases it before it is saved (`settings-team.ts:295-301`)
		await colorTriggerOf(swatchHex).click({ timeout: 15_000 });
		await expect(popoverOf(page)).toBeVisible({ timeout: 15_000 });
		await popoverOf(page).getByRole('textbox', { name: S.COLOR_HEX_LABEL }).fill(CUSTOM_HEX);
		mark = served.calls.length;
		await popoverOf(page).getByRole('button', { name: S.COLOR_APPLY, exact: true }).click({ timeout: 15_000 });
		put = await served.nextTeamPut(mark);
		report('5 custom hex PUT body', put.body);
		expect(jsonOf(put).color).toBe(CUSTOM_HEX.toLowerCase());
		await closePopover(page);
		await expect(colorTriggerOf(CUSTOM_HEX.toLowerCase())).toBeVisible({ timeout: 15_000 });

		// the size select: its options and the stored word the team keeps (`team-identity-section.tsx:35-42,60-84`)
		const sizeTrigger = section(page, 'team').getByRole('combobox');
		await openSelect(sizeTrigger);
		const sizeLabels = await selectOptions(page);
		report('5 size options', sizeLabels);
		const chosenSize = sizeLabels[1] ?? '';
		expect(chosenSize).not.toBe('');
		mark = served.calls.length;
		await pickOption(page, chosenSize);
		put = await served.nextTeamPut(mark);
		report('5 size PUT body', put.body);
		expect(jsonOf(put).teamSize ?? null).not.toBeNull();
		// measured (`-s3-lane-a-teamgeneral-2.log`, MEASURE `5 size trigger after the pick` = `""` and
		// `5 comboboxes after the pick` = `team = ` while every other combobox on the page prints its value): a size
		// chosen in this session leaves the trigger printing **nothing** — the row's own state holds the choice, but what
		// the trigger prints comes from `SelectValue` (`core/components/common/select.tsx:176-186` prints `children` only
		// when the caller passed one, and `team-identity-section.tsx:62-65` passes `valueLabel` only for a non-empty
		// stored value) — while the picker itself marks the chosen size (`select.tsx:349-357` writes
		// `data-state="checked"`, measured). The stored value prints after a read of the team; that is the reload below.
		await expect.poll(() => sizeTrigger.textContent()).toBe('');
		report('5 comboboxes after the pick', await comboboxValues(page));
		await openSelect(sizeTrigger);
		const chosenOption = page.getByRole('option', { name: chosenSize, exact: true });
		await expect(chosenOption).toHaveAttribute('data-state', 'checked', { timeout: 15_000 });
		await page.keyboard.press('Escape');
		await expect(page.getByRole('option')).toHaveCount(0, { timeout: 15_000 });

		// a reload reads both stored values back, from this file's store
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect(colorTriggerOf(CUSTOM_HEX.toLowerCase())).toBeVisible({ timeout: 45_000 });
		// the stored size reads back into the trigger (`team-identity-section.tsx:47-50,62-65`)
		await expect(sizeTrigger).toHaveText(chosenSize, { timeout: 45_000 });
		report('5 comboboxes after reload', await comboboxValues(page));
		report('5 team text after reload', await sectionText(page, 'team'));
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('6 the emoji: adding one through the picker and removing it, each body', async ({ page, fixture, shield }) => {
		const { ids, names } = fixture;
		const served = await serveStore(page, ids, newStore(ids, names));
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(section(page, 'team')).toBeVisible({ timeout: 45_000 });

		const emojiTriggerOf = (value: string) =>
			page.getByRole('button', { name: S.EMOJI_CHANGE.replace('{emoji}', value), exact: true });
		await emojiTriggerOf(S.EMOJI_NONE).click({ timeout: 15_000 });
		await expect(popoverOf(page)).toBeVisible({ timeout: 15_000 });
		// the picker is a dynamic import (`core/components/common/lazy-emoji-picker.tsx`): poll for its buttons, never sleep
		await expect
			.poll(() => popoverOf(page).locator('button').count(), { timeout: 30_000, intervals: [500] })
			.toBeGreaterThan(1);
		const buttons = await popoverButtons(page);
		report('6 picker buttons', buttons.slice(0, 12));
		// an emoji button carries the character itself as its own `aria-label` (emoji-mart sets `aria-label": native`,
		// `node_modules/emoji-mart/dist/module.js`); a worded control — a category button, the search's Clear — is not one
		const isEmojiCharacter = (value: string) => {
			const points = Array.from(value);
			return points.length > 0 && points.length <= 2 && !/[A-Za-z0-9\s]/.test(value);
		};
		const pickedIndex = buttons.findIndex((button) => isEmojiCharacter(button.aria));
		expect(pickedIndex).toBeGreaterThanOrEqual(0);
		report('6 picked button', buttons[pickedIndex]);
		let mark = served.calls.length;
		await popoverOf(page).locator('button').nth(pickedIndex).click({ timeout: 15_000 });
		const added = await served.nextTeamPut(mark);
		report('6 emoji PUT body', added.body);
		const stored = jsonOf(added).emoji;
		expect(typeof stored).toBe('string');
		const storedEmoji = stored as string;
		// `team-emoji-control.tsx:72` saves `picked.native`, and `picked.native` is the button's own label
		expect(storedEmoji).toBe(buttons[pickedIndex].aria);
		await closePopover(page);
		// the stored character is what the trigger prints
		await expect(emojiTriggerOf(storedEmoji)).toBeVisible({ timeout: 15_000 });

		// the popover now offers Remove, and removing sends null
		await emojiTriggerOf(storedEmoji).click({ timeout: 15_000 });
		await expect(popoverOf(page)).toBeVisible({ timeout: 15_000 });
		mark = served.calls.length;
		await popoverOf(page).getByRole('button', { name: S.EMOJI_REMOVE, exact: true }).click({ timeout: 15_000 });
		const removed = await served.nextTeamPut(mark);
		report('6 emoji remove PUT body', removed.body);
		expect(jsonOf(removed).emoji).toBeNull();
		await closePopover(page);
		await expect(emojiTriggerOf(S.EMOJI_NONE)).toBeVisible({ timeout: 15_000 });
		report('6 team text after removing', await sectionText(page, 'team'));
		expect(consoleFindings(shield)).toEqual([]);
	});

	test.describe('visibility', () => {
		// the clipboard grant belongs to this test only (`team-visibility-section.tsx:64-71` writes it on Copy)
		test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

		test('7 private and back: each body, the link only while public, and Copy puts the printed link on the clipboard', async ({
			page,
			fixture,
			shield
		}) => {
			const { ids, names } = fixture;
			const store = newStore(ids, names);
			const served = await serveStore(page, ids, store);
			await signInAndVisit(page, fixture, PAGE_PATH);
			await expect(section(page, 'visibility')).toBeVisible({ timeout: 45_000 });

			const linkField = page.getByRole('textbox', { name: S.SHARE_LINK_LABEL });
			const printedLink = `${APP_ORIGIN}/en/team/${ids.teamA}/${String(store.team.profile_link)}`;
			await expect(linkField).toHaveValue(printedLink, { timeout: 15_000 });
			report('7 printed link', await linkField.inputValue());
			const privateCard = visibilityCard(
				S.PRIVATE_TITLE,
				pluralTextOf(S.PRIVATE_DETAIL, rosterOf(ids, names, 'ADMIN').length)
			);
			const publicCard = visibilityCard(S.PUBLIC_TITLE, S.PUBLIC_DETAIL);
			/** The card's radio is `className="peer sr-only"` (`kit/choice-cards.tsx:59-66`) and sits under the card's glyph
			 *  span, which eats the click aimed at it — measured in `-s3-lane-a-teamgeneral-1.log`: the click on the radio
			 *  reported `<span class="flex size-8 … keycap-3d …"> intercepts pointer events`. The pointer does reach the
			 *  `<label>` the card is built from (`:53-66`), and clicking a label is what flips the radio inside it. The
			 *  label is matched by the radio it holds: its `textContent` joins the card's title and detail spans without
			 *  the space the accessible name carries, so a text filter on the composed name matches nothing. */
			const cardOf = (name: string) =>
				section(page, 'visibility')
					.locator('label')
					.filter({ has: page.getByRole('radio', { name, exact: true }) });

			// private: the body, and the link goes once the save was answered (`publicLinkOf` prints it only while public)
			let mark = served.calls.length;
			await cardOf(privateCard).click({ timeout: 15_000 });
			let put = await served.nextTeamPut(mark);
			report('7 private PUT body', put.body);
			expect(jsonOf(put).public).toBe(false);
			await expect(page.getByRole('radio', { name: privateCard, exact: true })).toBeChecked({ timeout: 15_000 });
			await expect(linkField).toHaveCount(0);

			// public again: the body and the link back
			mark = served.calls.length;
			await cardOf(publicCard).click({ timeout: 15_000 });
			put = await served.nextTeamPut(mark);
			report('7 public PUT body', put.body);
			expect(jsonOf(put).public).toBe(true);
			await expect(linkField).toHaveValue(printedLink, { timeout: 15_000 });

			// Copy writes exactly what the field prints, and its own label answers for 10 s (`COPIED_MS` `:19`)
			mark = served.calls.length;
			await section(page, 'visibility')
				.getByRole('button', { name: S.SHARE_LINK_COPY, exact: true })
				.click({ timeout: 15_000 });
			await expect(
				section(page, 'visibility').getByRole('button', { name: S.SHARE_LINK_COPIED, exact: true })
			).toBeVisible({ timeout: 15_000 });
			// read back through the window's own `navigator`, so this callback names only what it reads
			const clipboard = await page.evaluate(() => window.navigator.clipboard.readText());
			report('7 clipboard value', clipboard);
			expect(clipboard).toBe(printedLink);
			// a quiet window, 2 s: Copy is a clipboard write, not a settings change, so nothing goes out
			await page.waitForTimeout(2_000);
			expect(served.writesSince(mark)).toEqual([]);
			expect(consoleFindings(shield)).toEqual([]);
		});
	});

	test('8 the default project: the pick, a server that drops the field, and a team with no projects', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		let served = await serveStore(page, ids, newStore(ids, names));
		await signInAndVisit(page, fixture, PAGE_PATH);
		const projectSelect = section(page, 'projects').getByRole('combobox');
		await expect(projectSelect).toBeVisible({ timeout: 45_000 });

		await openSelect(projectSelect);
		const options = await selectOptions(page);
		report('8 project options', options);
		let mark = served.calls.length;
		await pickOption(page, PROJECT_B_NAME);
		const put = await served.nextTeamPut(mark);
		report('8 default project PUT body', put.body);
		expect(jsonOf(put).defaultProjectId).toBe(PROJECT_B_ID);
		await expect(projectSelect).toHaveText(PROJECT_B_NAME, { timeout: 15_000 });
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect(projectSelect).toHaveText(PROJECT_B_NAME, { timeout: 45_000 });

		// a server that answers without the field: both toasts, and the select back to the stored value
		const dropping = newStore(ids, names, { team: { defaultProjectId: ids.project } });
		dropping.dropsDefaultProject = true;
		served = await serveStore(page, ids, dropping);
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		const selectAgain = section(page, 'projects').getByRole('combobox');
		await expect(selectAgain).toHaveText(PROJECT_A_NAME, { timeout: 45_000 });
		mark = served.calls.length;
		await openSelect(selectAgain);
		await pickOption(page, PROJECT_B_NAME);
		await expect(toastOf(page, T.DEFAULT_PROJECT_NOT_SAVED)).toBeVisible({ timeout: 30_000 });
		await expect(toastOf(page, T.DEFAULT_PROJECT_NOT_SUPPORTED)).toBeVisible({ timeout: 15_000 });
		await expect(selectAgain).toHaveText(PROJECT_A_NAME, { timeout: 15_000 });
		report('8 not-supported writes', served.writesSince(mark));
		report('8 not-supported stored defaultProjectId', dropping.team.defaultProjectId ?? null);
		expect(dropping.team.defaultProjectId ?? null).toBeNull();

		// a team with no projects: no picker, and the row says `NOT_SET` (`team-default-project-section.tsx:24-30,97`)
		await serveStore(page, ids, newStore(ids, names, { projects: [] }));
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect(section(page, 'projects')).toContainText(S.NOT_SET, { timeout: 45_000 });
		await expect(section(page, 'projects').getByRole('combobox')).toHaveCount(0);
		report('8 no-projects section text', await sectionText(page, 'projects'));
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('9 share profiles and the daily plan: each body, and the plan key cleared in this browser when a plan becomes required', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		const served = await serveStore(page, ids, newStore(ids, names));
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(section(page, 'tracking')).toBeVisible({ timeout: 45_000 });

		const shareSwitch = page.locator('#team-share-profile-views');
		await expect(shareSwitch).toHaveAttribute('aria-checked', 'false');
		let mark = served.calls.length;
		await shareSwitch.click({ timeout: 15_000 });
		let put = await served.nextTeamPut(mark);
		report('9 share profiles PUT body', put.body);
		expect(jsonOf(put).shareProfileView).toBe(true);
		await expect(shareSwitch).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });

		// the plan key is seeded after the load, so "cleared" is a change this test can see and nothing else cleared
		await page.evaluate((key) => window.localStorage.setItem(key, '2026-01-01'), PLAN_MODAL_KEY);
		await expect
			.poll(async () => page.evaluate((key) => window.localStorage.getItem(key), PLAN_MODAL_KEY), {
				timeout: 10_000
			})
			.not.toBeNull();
		const planSwitch = page.locator('#team-require-daily-plan');
		mark = served.calls.length;
		await planSwitch.click({ timeout: 15_000 });
		put = await served.nextTeamPut(mark);
		report('9 require plan PUT body', put.body);
		expect(jsonOf(put).requirePlanToTrack).toBe(true);
		await expect(planSwitch).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });
		// the key is gone once the save answered (`use-team-general-settings.ts:174-183`)
		await expect
			.poll(async () => page.evaluate((key) => window.localStorage.getItem(key), PLAN_MODAL_KEY), {
				timeout: 30_000
			})
			.toBeNull();
		report('9 the two writes', served.writesSince(mark));
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('10 own tracking as an organization admin: the two writes in order, a refused employee write rolled back, and hidden for a manager who is not an admin', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		const store = newStore(ids, names);
		const served = await serveStore(page, ids, store);
		await signInAndVisit(page, fixture, PAGE_PATH);
		const ownSwitch = page.locator('#team-own-time-tracking');
		await expect(ownSwitch).toBeVisible({ timeout: 45_000 });
		await expect(ownSwitch).toHaveAttribute('aria-checked', 'true');

		// off: the team row first, then the employee switch (`use-member-tracking-switch.ts:120-138`)
		const mark = served.calls.length;
		await ownSwitch.click({ timeout: 15_000 });
		const rowWrite = await served.waitFor(
			(call) => call.method === 'PUT' && call.path.startsWith(served.employeeTeamsPrefix)
		);
		const employeeWrite = await served.waitFor(
			(call) => call.method === 'PUT' && call.path === served.employeeDetail
		);
		report('10 off writes', served.writesSince(mark));
		expect(jsonOf(rowWrite)).toEqual({
			organizationId: ids.organizationA,
			organizationTeamId: ids.teamA,
			isTrackingEnabled: false,
			tenantId: ids.tenantA
		});
		expect(jsonOf(employeeWrite)).toEqual({
			isTrackingEnabled: false,
			id: ids.employee,
			organizationId: ids.organizationA,
			isActive: true,
			tenantId: ids.tenantA
		});
		await expect(ownSwitch).toHaveAttribute('aria-checked', 'false', { timeout: 15_000 });

		// a refused employee write (`failEmployeePut = 500`) puts the team row back to what it was: the switch ends where
		// the last saved value had it — `false`, the off the first save wrote (`use-member-tracking-switch.ts:126` keeps
		// `previousTeamTracking`, `:140` re-PUTs it; measured in `-s3-lane-a-teamgeneral-2.log` as `aria-checked="false"`)
		const refusedMark = served.calls.length;
		store.failEmployeePut = 500;
		await ownSwitch.click({ timeout: 15_000 });
		await expect(toastOf(page, T.MEMBER_NOT_SAVED)).toBeVisible({ timeout: 30_000 });
		await expect(ownSwitch).toHaveAttribute('aria-checked', 'false', { timeout: 30_000 });
		store.failEmployeePut = null;
		const rowWrites = served.calls
			.slice(refusedMark)
			.filter((call) => call.method === 'PUT' && call.path.startsWith(served.employeeTeamsPrefix));
		report('10 refused writes', served.writesSince(refusedMark));
		// the attempt went out as `true`, the rollback re-PUT as the `false` it replaces
		expect(rowWrites.map((call) => jsonOf(call).isTrackingEnabled)).toEqual([true, false]);
		const ownRowAfter = (store.team.members as Record<string, unknown>[]).find(
			(member) => member.id === ids.member
		);
		expect(ownRowAfter?.isTrackingEnabled).toBe(false);
		report('10 console after the refusal', shield.consoleErrors());
		// only the armed employee refusal and the dev-mode line for the mutation that failed are excused here
		expect(
			consoleFindings(shield, [
				armedHttpError('PUT', servicePathOf(served.employeeDetail), 500),
				armedMutationLine('employee PUT')
			])
		).toEqual([]);

		// a team manager who is not an organization admin, with the rank rule on: no own-tracking row, no organization rows
		await serveStore(
			page,
			ids,
			newStore(ids, names, { members: rosterOf(ids, names, 'EMPLOYEE', { selfIsManager: true }) })
		);
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: { roleName: 'MANAGER' } });
		await expect(section(page, 'tracking')).toBeVisible({ timeout: 45_000 });
		await expect
			.poll(() => switchStates(page))
			.toEqual(['team-share-profile-views = false', 'team-require-daily-plan = false']);
		await expect(page.locator('#team-own-time-tracking')).toHaveCount(0);
		await expect(section(page, 'organization-tracking')).toHaveCount(0);
		await expect(section(page, 'organization-tracking-switch')).toHaveCount(0);
		report('10 manager switches', await switchStates(page));
		report('10 manager sections', await sectionIds(page));
	});

	test('11 notification defaults: each of the five rows sends the whole set', async ({ page, fixture, shield }) => {
		const { ids, names } = fixture;
		const store = newStore(ids, names);
		const served = await serveStore(page, ids, store);
		await signInAndVisit(page, fixture, PAGE_PATH);
		const defaults = section(page, 'notification-defaults');
		await expect(defaults).toBeVisible({ timeout: 45_000 });
		await expect(defaults.getByRole('combobox')).toHaveCount(5);

		const rows: Array<{ label: string; pick: (options: string[]) => string; key: string; want: unknown }> = [
			{ label: CHANNELS.EMAIL_TITLE, pick: () => CHANNELS.MODE_IMMEDIATE, key: 'email', want: 'immediate' },
			{ label: CHANNELS.PUSH_TITLE, pick: () => S.OFF, key: 'push', want: false },
			{ label: S.TASK_UPDATE_DEFAULT_LABEL, pick: () => S.ON, key: 'taskUpdate', want: true },
			{
				label: TIMER_COPY.LABEL,
				pick: (options) => options.find((option) => /\b8\b/.test(option)) ?? '',
				key: 'timerReminderHours',
				want: 8
			},
			{
				label: TASK_DUE_COPY.LABEL,
				pick: (options) => options.find((option) => /\b24\b/.test(option)) ?? '',
				key: 'taskDueReminderHours',
				want: 24
			}
		];

		for (const row of rows) {
			const trigger = defaults.getByRole('combobox', { name: row.label });
			await expect(trigger).toBeVisible();
			await openSelect(trigger);
			const options = await selectOptions(page);
			report(`11 options for ${row.key}`, options);
			const wanted = row.pick(options);
			expect(wanted).not.toBe('');
			const mark = served.calls.length;
			await pickOption(page, wanted);
			const call = await served.nextTeamPut(mark);
			const sent = jsonOf(call).notificationDefaults as Record<string, unknown>;
			report(`11 body sent for ${row.key}`, sent);
			expect(sent[row.key]).toEqual(row.want);
			await expect(trigger).toHaveText(wanted, { timeout: 15_000 });
		}
		const lastPut = served.calls.filter((call) => call.method === 'PUT').slice(-1)[0];
		report('11 defaults after the five rows', jsonOf(lastPut).notificationDefaults);
		const kept = {
			email: 'immediate',
			push: false,
			taskUpdate: true,
			timerReminderHours: 8,
			taskDueReminderHours: 24
		};
		expect(jsonOf(lastPut).notificationDefaults).toEqual(kept);
		// what this file's store kept after the last save is what the next read answers with
		expect(store.team.notificationDefaults).toEqual(kept);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('12 notification defaults under load: a second change builds on the one whose answer is held, and a refused change is not sent again', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		const store = newStore(ids, names);
		const served = await serveStore(page, ids, store);
		await signInAndVisit(page, fixture, PAGE_PATH);
		const defaults = section(page, 'notification-defaults');
		await expect(defaults).toBeVisible({ timeout: 45_000 });

		// hold the first answer, change a second row while it is held, then release (`team-notification-defaults-section.tsx:139-198`)
		let releaseFirst = () => {};
		store.holdTeamPut = new Promise<void>((done) => {
			releaseFirst = done;
		});
		const emailTrigger = defaults.getByRole('combobox', { name: CHANNELS.EMAIL_TITLE });
		const firstMark = served.calls.length;
		await openSelect(emailTrigger);
		await pickOption(page, CHANNELS.MODE_IMMEDIATE);
		const first = await served.nextTeamPut(firstMark);
		const pushTrigger = defaults.getByRole('combobox', { name: CHANNELS.PUSH_TITLE });
		await openSelect(pushTrigger);
		await pickOption(page, S.OFF);
		// a quiet window, 2 s: it proves the second save really waited for the held first answer
		await page.waitForTimeout(2_000);
		expect(served.calls.filter((call) => call.method === 'PUT' && call.path === served.teamDetail).length).toBe(1);
		releaseFirst();
		store.holdTeamPut = null;
		const second = await served.nextTeamPut(served.calls.indexOf(first) + 1);
		report('12 held first body', jsonOf(first).notificationDefaults);
		report('12 queued second body', jsonOf(second).notificationDefaults);
		expect(jsonOf(first).notificationDefaults).toEqual({ email: 'immediate', push: true, timerReminderHours: 4 });
		expect(jsonOf(second).notificationDefaults).toEqual({ email: 'immediate', push: false, timerReminderHours: 4 });
		await expect(pushTrigger).toHaveText(S.OFF, { timeout: 15_000 });

		// a refused change (`failTeamPut = 500`) is taken back out (`:186`), so the next save does not send it again
		const refusedMark = served.calls.length;
		store.failTeamPut = 500;
		await openSelect(pushTrigger);
		await pickOption(page, S.ON);
		await expect(toastOf(page, T.UPDATE_FAILED)).toBeVisible({ timeout: 30_000 });
		await expect(pushTrigger).toHaveText(S.OFF, { timeout: 30_000 });
		store.failTeamPut = null;
		// a quiet window, 2 s: the refused change must not be re-sent on its own
		await page.waitForTimeout(2_000);
		const afterRefusalMark = served.calls.length;
		const taskTrigger = defaults.getByRole('combobox', { name: S.TASK_UPDATE_DEFAULT_LABEL });
		await openSelect(taskTrigger);
		await pickOption(page, S.ON);
		const afterRefusal = await served.nextTeamPut(afterRefusalMark);
		report('12 body after the refused change', jsonOf(afterRefusal).notificationDefaults);
		// `push` goes back as the value the row last had saved — `false`, the Off that the queued save wrote — never as
		// the refused `true` (`team-notification-defaults-section.tsx:186` takes the refused change out again)
		expect(jsonOf(afterRefusal).notificationDefaults).toEqual({
			email: 'immediate',
			push: false,
			timerReminderHours: 4,
			taskUpdate: true
		});
		report('12 refused and following writes', served.writesSince(refusedMark));
		report('12 console after the refusal', shield.consoleErrors());
		// only the armed team PUT refusal and the dev-mode mutation line are excused here
		expect(
			consoleFindings(shield, [
				armedHttpError('PUT', servicePathOf(served.teamDetail), 500),
				armedMutationLine('team PUT')
			])
		).toEqual([]);
	});

	test('13 the organization rows as an organization admin: each body, and the load failure with its Retry', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		const store = newStore(ids, names);
		const served = await serveStore(page, ids, store);
		await signInAndVisit(page, fixture, PAGE_PATH);
		const requirements = section(page, 'organization-tracking');
		await expect(requirements).toBeVisible({ timeout: 45_000 });
		await expect(section(page, 'organization-tracking-switch')).toBeVisible();

		// the save reads the organization before it PUTs it (`organization.service.ts:37-41`)
		const requireTeam = page.locator('#organization-requireTeam');
		let mark = served.calls.length;
		await requireTeam.click({ timeout: 15_000 });
		await served.waitFor(
			(call) =>
				call.method === 'GET' && call.path === served.organizationDetail && served.calls.indexOf(call) >= mark
		);
		let put = await served.waitFor(
			(call) =>
				call.method === 'PUT' && call.path === served.organizationDetail && served.calls.indexOf(call) >= mark
		);
		report('13 requirement PUT body', jsonOf(put));
		// `{ name, currency, ...changes }` (`organization.service.ts:40-45`) plus the tenant/organization the client adds
		expect(jsonOf(put)).toEqual({
			name: names.organizationA,
			currency: 'USD',
			requireTeam: false,
			tenantId: ids.tenantA,
			organizationId: ids.organizationA
		});
		await expect(requireTeam).toHaveAttribute('aria-checked', 'false', { timeout: 15_000 });

		const restrict = page.locator('#organization-restrictTrackingSwitchToHigherRoles');
		mark = served.calls.length;
		await restrict.click({ timeout: 15_000 });
		put = await served.waitFor(
			(call) =>
				call.method === 'PUT' && call.path === served.organizationDetail && served.calls.indexOf(call) >= mark
		);
		report('13 switch rule PUT body', jsonOf(put));
		expect(jsonOf(put)).toEqual({
			name: names.organizationA,
			currency: 'USD',
			restrictTrackingSwitchToHigherRoles: false,
			tenantId: ids.tenantA,
			organizationId: ids.organizationA
		});
		await expect(restrict).toHaveAttribute('aria-checked', 'false', { timeout: 15_000 });

		// the load failure (`failOrganizationRead = 500`): the alert with its Retry, and nothing printed until a read answers
		store.failOrganizationRead = 500;
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect(section(page, 'organization-tracking').getByRole('alert')).toContainText(
			S.REQUIREMENTS_LOAD_FAILED,
			{
				timeout: 45_000
			}
		);
		await expect(section(page, 'organization-tracking').getByRole('switch')).toHaveCount(0);
		await expect(section(page, 'organization-tracking-switch')).toHaveCount(0);
		store.failOrganizationRead = null;
		await section(page, 'organization-tracking')
			.getByRole('button', { name: EN.notifications.RETRY })
			.click({ timeout: 15_000 });
		await expect(section(page, 'organization-tracking').getByRole('switch')).toHaveCount(3, { timeout: 30_000 });
		await expect(section(page, 'organization-tracking-switch').getByRole('switch')).toHaveCount(1, {
			timeout: 30_000
		});
		report('13 switches after Retry', await switchStates(page));
		report('13 console during the armed organization read failure', shield.consoleErrors());
		// only the armed organization GET refusals are excused here
		expect(consoleFindings(shield, [armedHttpError('GET', servicePathOf(served.organizationDetail), 500)])).toEqual(
			[]
		);
	});

	test('14 a refused team save: the optimistic value goes back and the toast says what failed and why (400, then 500)', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		const store = newStore(ids, names);
		const served = await serveStore(page, ids, store);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(section(page, 'team')).toBeVisible({ timeout: 45_000 });

		const inlineAlert = section(page, 'team').getByRole('alert');
		// 4xx with a message: the row keeps editing and also says `settings.common.SAVE_FAILED` (`inline-text-row.tsx:89-94`)
		store.failTeamPut = 400;
		await editFieldButton(page, S.NAME_LABEL).click({ timeout: 15_000 });
		await nameInput(page).fill('Refused Team Name');
		const mark400 = served.calls.length;
		await teamRowButton(page, C.SAVE).click({ timeout: 15_000 });
		await expect(toastOf(page, T.NAME_NOT_SAVED)).toBeVisible({ timeout: 30_000 });
		await expect(toastOf(page, REASONS.INVALID)).toBeVisible({ timeout: 15_000 });
		await expect(inlineAlert).toContainText(SC.SAVE_FAILED);
		expect(store.team.name).toBe(names.teamA);
		// Cancel puts the stored value back in the row (`inline-text-row.tsx:69-73`)
		await teamRowButton(page, C.CANCEL).click({ timeout: 15_000 });
		await expect(section(page, 'team')).toContainText(names.teamA);
		await expect(section(page, 'team')).not.toContainText('Refused Team Name');
		report('14 refused 400 writes', served.writesSince(mark400));

		// 500: the same shape with the server reason
		store.failTeamPut = 500;
		await parkPointer(page);
		await expect(toastOf(page, T.NAME_NOT_SAVED)).toHaveCount(0, { timeout: 30_000 });
		await editFieldButton(page, S.NAME_LABEL).click({ timeout: 15_000 });
		await nameInput(page).fill('Another Refused Name');
		const mark500 = served.calls.length;
		await teamRowButton(page, C.SAVE).click({ timeout: 15_000 });
		await expect(toastOf(page, T.NAME_NOT_SAVED)).toBeVisible({ timeout: 30_000 });
		await expect(toastOf(page, REASONS.SERVER)).toBeVisible({ timeout: 15_000 });
		await teamRowButton(page, C.CANCEL).click({ timeout: 15_000 });
		await expect(section(page, 'team')).toContainText(names.teamA);
		store.failTeamPut = null;
		report('14 refused 500 writes', served.writesSince(mark500));
		report('14 console after the two refusals', shield.consoleErrors());
		// only these two armed refusals and the dev-mode mutation lines are excused here
		expect(
			consoleFindings(shield, [
				armedHttpError('PUT', servicePathOf(served.teamDetail), 400),
				armedHttpError('PUT', servicePathOf(served.teamDetail), 500),
				armedMutationLine('team PUT')
			])
		).toEqual([]);
	});

	test('15 transfer to a second manager: the dialog, the pick required, the body, and the page after it', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		const store = newStore(ids, names, {
			// both are flagged managers with a plain member role, so the roster rewrite is what decides (`organization-team.ts:70-80`)
			members: rosterOf(ids, names, 'EMPLOYEE', { selfIsManager: true, teammateIsManager: true })
		});
		const served = await serveStore(page, ids, store);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(section(page, 'danger-zone')).toBeVisible({ timeout: 45_000 });
		// two managers: Transfer open, Delete blocked with its reason (`settings-team.ts:214-253`)
		await expect(dangerButton(page, S.TRANSFER_ACTION)).toBeEnabled();
		await expect(dangerButton(page, S.DELETE_ACTION)).toBeDisabled();
		await expect(section(page, 'danger-zone')).toContainText(S.BLOCKED_OTHER_MANAGERS);

		const mark = served.calls.length;
		await dangerButton(page, S.TRANSFER_ACTION).click({ timeout: 15_000 });
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		await expect(dialog).toContainText(S.TRANSFER_TITLE.replace('{team}', names.teamA));
		await expect(dialog).toContainText(S.TRANSFER_CONSEQUENCE_NEW);
		const confirm = dialog.getByRole('button', { name: S.TRANSFER_ACTION, exact: true });
		// nothing is sent while nobody is picked (`team-danger-section.tsx:117`)
		await expect(confirm).toBeDisabled();
		expect(served.writesSince(mark)).toEqual([]);

		const picker = dialog.getByRole('combobox');
		await openSelect(picker);
		const candidates = await selectOptions(page);
		report('15 transfer candidates', candidates);
		expect(candidates).toEqual([names.teammate]);
		await pickOption(page, names.teammate);
		await expect(confirm).toBeEnabled();
		await confirm.click({ timeout: 15_000 });
		const put = await served.nextTeamPut(mark);
		report('15 transfer PUT body', jsonOf(put));
		expect(jsonOf(put).managerIds).toEqual([ids.teammateEmployee]);
		expect(((jsonOf(put).memberIds as string[]) ?? []).slice().sort()).toEqual(
			[ids.employee, ids.teammateEmployee].sort()
		);
		expect(jsonOf(put).name).toBe(names.teamA);
		expect(jsonOf(put).id).toBe(ids.teamA);
		await expect(dialog).toHaveCount(0, { timeout: 15_000 });
		// the person who transferred stays a member and stops being a manager (`use-team-danger-zone.ts:42-57`)
		await expect(dangerButton(page, S.TRANSFER_ACTION)).toBeDisabled({ timeout: 15_000 });
		await expect(section(page, 'danger-zone')).toContainText(S.BLOCKED_NOT_MANAGER);
		await expect(dangerButton(page, S.QUIT_ACTION)).toBeEnabled();
		report('15 writes of the transfer', served.writesSince(mark));
		report('15 danger text after the transfer', await sectionText(page, 'danger-zone'));
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('16 quit as a member: the DELETE and its query, the toast, and what the page becomes', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		const store = newStore(ids, names, { members: rosterOf(ids, names, 'EMPLOYEE', { selfIsManager: false }) });
		const served = await serveStore(page, ids, store);
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: { manager: false, roleName: 'EMPLOYEE' } });
		await expect(section(page, 'danger-zone')).toBeVisible({ timeout: 45_000 });
		await expect(dangerButton(page, S.QUIT_ACTION)).toBeEnabled();

		await dangerButton(page, S.QUIT_ACTION).click({ timeout: 15_000 });
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		await expect(dialog).toContainText(S.QUIT_TITLE.replace('{team}', names.teamA));
		const mark = served.calls.length;
		await dialog.getByRole('button', { name: S.QUIT_ACTION, exact: true }).click({ timeout: 15_000 });
		const removed = await served.nextWrite(mark);
		expect(removed.path).toBe(`${served.employeeTeamsPrefix}${ids.member}`);
		report('16 quit DELETE query', removed.query);
		const query = new URLSearchParams(removed.query);
		expect(query.get('employeeId')).toBe(ids.employee);
		expect(query.get('organizationTeamId')).toBe(ids.teamA);
		await expect(toastOf(page, T.LEFT_TEAM)).toBeVisible({ timeout: 30_000 });
		// measured (`-s3-lane-a-teamgeneral-1.log`, the page snapshot taken here): the page does not move and does not
		// print `common.NO_TEAM` — it stays this team's General page, and the Danger rows answer with the role the user
		// now has: Leave says `BLOCKED_NOT_MEMBER`, Transfer and Delete say `BLOCKED_NOT_MANAGER`
		await expect(dangerButton(page, S.QUIT_ACTION)).toBeDisabled({ timeout: 30_000 });
		await expect(dangerButton(page, S.TRANSFER_ACTION)).toBeDisabled();
		await expect(dangerButton(page, S.DELETE_ACTION)).toBeDisabled();
		await expect(section(page, 'danger-zone')).toContainText(S.BLOCKED_NOT_MEMBER);
		await expect(section(page, 'danger-zone')).toContainText(S.BLOCKED_NOT_MANAGER);
		await expect(page.getByText(C.NO_TEAM)).toHaveCount(0);
		expect((store.team.members as Record<string, unknown>[]).map((member) => member.employeeId)).toEqual([
			ids.teammateEmployee
		]);
		report('16 writes of the quit', served.writesSince(mark));
		report('16 url after the quit', page.url());
		report('16 sections after the quit', await sectionIds(page));
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('17 delete as the only manager: the typed confirmation, the DELETE, the two toasts, and where the sign-out lands', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		const served = await serveStore(
			page,
			ids,
			newStore(ids, names, { members: rosterOf(ids, names, 'EMPLOYEE', { selfIsManager: true }) })
		);
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(section(page, 'danger-zone')).toBeVisible({ timeout: 45_000 });
		// the only manager: Delete open, Transfer and Leave blocked with their reasons
		await expect(dangerButton(page, S.DELETE_ACTION)).toBeEnabled();
		await expect(section(page, 'danger-zone')).toContainText(S.BLOCKED_NEEDS_SECOND_MANAGER);
		await expect(section(page, 'danger-zone')).toContainText(S.BLOCKED_ONLY_MANAGER);

		await dangerButton(page, S.DELETE_ACTION).click({ timeout: 15_000 });
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		await expect(dialog).toContainText(S.DELETE_TITLE.replace('{team}', names.teamA));
		const confirm = dialog.getByRole('button', { name: S.DELETE_ACTION, exact: true });
		// the confirm waits for the team name typed (`danger.tsx:147-161,180`)
		await expect(confirm).toBeDisabled();
		await dialog
			.getByRole('textbox', { name: SC.TYPE_TO_CONFIRM.replace('{text}', names.teamA) })
			.fill(names.teamA);
		await expect(confirm).toBeEnabled();
		const mark = served.calls.length;
		await confirm.click({ timeout: 15_000 });
		const deleted = await served.nextWrite(mark);
		expect(deleted.path).toBe(served.teamDetail);
		report('17 delete DELETE query', deleted.query);
		await expect(toastOf(page, T.DELETED.replace('{name}', names.teamA))).toBeVisible({ timeout: 30_000 });
		await expect(toastOf(page, T.DELETED_SIGNING_OUT)).toBeVisible({ timeout: 15_000 });
		// `logOut()` runs 3 s after the success toast (`use-delete-organization-team.ts:60-68`) and lands on DEFAULT_APP_PATH
		await expect.poll(() => page.url(), { timeout: 45_000, intervals: [500] }).toContain('/auth/passcode');
		report('17 url after the sign-out', page.url());
		report('17 writes of the delete', served.writesSince(mark));
		report('17 console at the end', shield.consoleErrors());
		// the team is gone for the reads that follow the deletion this file served, so its 404s are the armed ones
		expect(consoleFindings(shield, [armedHttpError('GET', servicePathOf(served.teamDetail), 404)])).toEqual([]);
	});

	test('18 the avatar: a PNG this file builds, the upload and the team write it follows, and the removal body', async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		const served = await serveStore(page, ids, newStore(ids, names));
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(section(page, 'team')).toBeVisible({ timeout: 45_000 });

		const fileInput = section(page, 'team').locator('input[type=file]');
		await expect(fileInput).toHaveCount(1);
		const mark = served.calls.length;
		await fileInput.setInputFiles({ name: 'served-team-avatar.png', mimeType: 'image/png', buffer: IMAGE_BYTES });
		const upload = await served.waitFor(
			(call) => call.method === 'POST' && call.path.startsWith('/api/image-assets/upload/')
		);
		// the multipart body's field names, without its bytes
		report('18 upload body head', flat(upload.body ?? '').slice(0, 160));
		expect(upload.body ?? '').toContain('served-team-avatar.png');
		const put = await served.nextTeamPut(mark);
		report('18 avatar PUT body keys', Object.keys(jsonOf(put)));
		expect(jsonOf(put).imageId).toBe(IMAGE_ID);
		expect((jsonOf(put).image as Record<string, unknown>).id).toBe(IMAGE_ID);
		// the tile prints the asset the upload handed back (`team-avatar-row.tsx:35-41`), and the row offers Replace/Remove
		await expect(section(page, 'team').locator('img')).toHaveAttribute('src', IMAGE_URL, { timeout: 15_000 });
		await expect(teamRowButton(page, S.AVATAR_REPLACE)).toBeVisible();
		await expect(teamRowButton(page, S.AVATAR_REMOVE)).toBeVisible();

		// removal sends both keys as null (`use-team-general-settings.ts:144-150`)
		const removeMark = served.calls.length;
		await teamRowButton(page, S.AVATAR_REMOVE).click({ timeout: 15_000 });
		const removed = await served.nextTeamPut(removeMark);
		report('18 avatar remove PUT body', removed.body);
		expect(jsonOf(removed).imageId).toBeNull();
		expect(jsonOf(removed).image).toBeNull();
		await expect(section(page, 'team').locator('img')).toHaveCount(0, { timeout: 15_000 });
		await expect(teamRowButton(page, S.AVATAR_REMOVE)).toHaveCount(0);
		await expect(teamRowButton(page, S.AVATAR_UPLOAD)).toBeVisible();
		report('18 avatar writes', served.writesSince(mark));
		expect(consoleFindings(shield)).toEqual([]);
	});
});
