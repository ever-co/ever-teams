import { boardAppUrl } from '@/core/lib/board/board-app';
import { readRuntimeEnv } from '@/env-config';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';

/**
 * The invitations to a Board a member sends the teammates they open it with from Ever Teams (#5022), as Gauzy files
 * them (`board-invitation.ts` there): an `Invitation` about the team, titled `Ana Invited you to a Board with the Team
 * "Design"`. The title is the contract: it is what tells a Board invitation from an invitation to join the team.
 */
const BOARD_INVITATION_MARK = ' Invited you to a Board ';

/** Whether a notification is an invitation to a Board. */
export function isBoardInvitation(notification: {
	type: EEmployeeNotificationType | null;
	entity?: string | null;
	rawTitle?: string | null;
}): boolean {
	return (
		notification.type === EEmployeeNotificationType.Invitation &&
		notification.entity === EBaseEntityEnum.OrganizationTeam &&
		(notification.rawTitle ?? '').includes(BOARD_INVITATION_MARK)
	);
}

/**
 * Where a Board invitation opens: the Board app this deployment is set up with, told which deployment opened it, as
 * the Collaborate dialog opens it; the in-app board where none is set up.
 */
export function boardInvitationHref(
	boardAppDomain: string | null | undefined = readRuntimeEnv('NEXT_PUBLIC_BOARD_APP_DOMAIN') ||
		process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN,
	everTeamsOrigin: string | null | undefined = typeof window === 'undefined' ? null : window.location.origin
): string {
	return boardAppUrl(boardAppDomain, everTeamsOrigin)?.toString() ?? '/board';
}

/** The employees of the picked people (Collaborate lists users) who are members of the team. */
export function boardInviteeIdsOf(
	pickedUserIds: readonly string[],
	members: ReadonlyArray<{
		employeeId?: string | null;
		employee?: { id?: string | null; user?: { id?: string | null } | null } | null;
	}>
): string[] {
	const picked = new Set(pickedUserIds);
	const ids = members
		.filter((member) => !!member.employee?.user?.id && picked.has(member.employee.user.id))
		.map((member) => member.employeeId ?? member.employee?.id ?? null)
		.filter((id): id is string => !!id);
	return [...new Set(ids)];
}
