import { z } from 'zod';
import { boardReturnUrl, boardSessionUser, type BoardTrust, configuredBoardTrust } from './board-app';

/**
 * What the Board app may ask this deployment to tell colleagues (ever-co/ever-teams#5022): that a Board was shared
 * with them, or that they were mentioned in one. The Board cannot call Gauzy itself, since the access token stays on
 * this host, so `/api/board/notify` forwards the request to Gauzy's `/employee-notification/board-share` or
 * `/board-mention` with the session of the cookies, and `/api/board/members` lists the colleagues to offer.
 */

/** Gauzy takes at most 50 colleagues in one request. */
const BOARD_NOTIFY_MAX_RECEIVERS = 50;

/** The Gauzy route of each kind. */
export const BOARD_NOTIFY_PATHS = {
	share: '/employee-notification/board-share',
	mention: '/employee-notification/board-mention'
} as const;

export type BoardNotifyKind = keyof typeof BOARD_NOTIFY_PATHS;

// A live room's or a saved snapshot's id, as Gauzy accepts it
const boardIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, 'must be a Board id');

// Control characters, and the marks that reorder text on screen (bidi embeddings, overrides and isolates)
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const UNSAFE_NAME_CHARACTERS = /[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/**
 * The Board's name as the colleagues read it, on one line, in the title Gauzy writes after the sender's name: without
 * control characters or the marks that reorder text on screen, so that a name can never show its title (who shared,
 * what was shared) other than it reads. A Board is no record of the platform, so its name can only come from the
 * Board app; the sender is the one the session names.
 */
function boardNameOf(name: string): string | undefined {
	const cleaned = name.replace(UNSAFE_NAME_CHARACTERS, ' ').replace(/\s+/g, ' ').trim();
	return cleaned || undefined;
}

const boardNotifyBodySchema = z
	.object({
		kind: z.enum(['share', 'mention']),
		receiverEmployeeIds: z.array(z.uuid()).min(1).max(BOARD_NOTIFY_MAX_RECEIVERS),
		roomId: boardIdSchema.optional(),
		snapshotId: boardIdSchema.optional(),
		boardName: z.string().max(200).transform(boardNameOf).optional(),
		link: z.string().max(2048).optional()
	})
	.refine((body) => Boolean(body.roomId) !== Boolean(body.snapshotId), {
		message: 'Name the Board by one of roomId and snapshotId.'
	});

/** What is forwarded to Gauzy: never the kind, a tenant or anything the Board did not name. */
export interface BoardNotifyInput {
	receiverEmployeeIds: string[];
	roomId?: string;
	snapshotId?: string;
	boardName?: string;
	link?: string;
}

type BoardNotifyRequest =
	| { ok: true; kind: BoardNotifyKind; input: BoardNotifyInput }
	| { ok: false; messages: string[] };

/**
 * The Board's request read and checked, or why it is refused. The link, when there is one, must be an address on the
 * trusted Board origin (https, no user name), so the route never stores an address of anyone's choosing; it goes on
 * as parsed, its `#` part included, which the Board only sends when the person chose to. A refusal never repeats the
 * link.
 */
export function readBoardNotifyRequest(body: unknown, trust: BoardTrust = configuredBoardTrust()): BoardNotifyRequest {
	const parsed = boardNotifyBodySchema.safeParse(body);
	if (!parsed.success) {
		return {
			ok: false,
			messages: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
		};
	}

	const { kind, link, ...rest } = parsed.data;
	const input: BoardNotifyInput = { ...rest, receiverEmployeeIds: [...new Set(rest.receiverEmployeeIds)] };
	if (link !== undefined) {
		const boardLink = boardReturnUrl(link, trust);
		if (!boardLink) {
			return { ok: false, messages: ['link: must be an address of the Board app'] };
		}
		input.link = boardLink;
	}

	return { ok: true, kind, input };
}

/** A colleague the Board can name in a share or a mention. */
interface BoardMember {
	employeeId: string;
	name: string;
	imageUrl: string | null;
}

interface TeamMemberFields {
	employeeId?: unknown;
	isActive?: unknown;
	employee?: { id?: unknown; isActive?: unknown; user?: Record<string, unknown> | null } | null;
}

interface TeamFields {
	members?: TeamMemberFields[] | null;
}

function isActiveMember(member: TeamMemberFields): boolean {
	return member.isActive !== false && member.employee?.isActive !== false;
}

function memberEmployeeId(member: TeamMemberFields): string {
	const id = member.employeeId ?? member.employee?.id;
	return typeof id === 'string' ? id : '';
}

/**
 * The colleagues of the teams `selfEmployeeId` belongs to, each once, without themself: their employee id, name and
 * picture, nothing more (no e-mail address, role or tenant). Members who left a team, or whose employment ended, are
 * left out, as Gauzy would leave them out of the notification anyway. A team the person left, or every team once their
 * own employment ended, is no longer theirs: its colleagues are not listed.
 */
export function boardMembersOf(teams: TeamFields[], selfEmployeeId: string | null | undefined): BoardMember[] {
	const ownTeams = teams.filter((team) =>
		(team.members ?? []).some((member) => memberEmployeeId(member) === selfEmployeeId && isActiveMember(member))
	);
	const members = new Map<string, BoardMember>();
	for (const member of ownTeams.flatMap((team) => team.members ?? [])) {
		const employeeId = memberEmployeeId(member);
		if (!employeeId || employeeId === selfEmployeeId || members.has(employeeId) || !isActiveMember(member)) {
			continue;
		}
		const { name, imageUrl } = boardSessionUser(member.employee?.user ?? {});
		if (name) {
			members.set(employeeId, { employeeId, name, imageUrl });
		}
	}
	return [...members.values()].sort((a, b) => a.name.localeCompare(b.name));
}
