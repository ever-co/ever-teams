import { boardReturnUrl, configuredBoardTrust, withEverTeamsOrigin, type BoardTrust } from '@/core/lib/board/board-app';
import { EEmployeeNotificationType, INotificationBoard } from '@/core/types/interfaces/common/employee-notification';

/**
 * The notifications the Boards app raises through the platform (#5022): a colleague shared a Board with the reader
 * (`BoardShare`), or mentioned them in one (`BoardMention`). Gauzy files them with the Board in `metadata.board`: its
 * room or snapshot, its name and the link the sender's app sent (`board-notification.ts` there).
 */
export function isBoardNotificationType(type: EEmployeeNotificationType | null | undefined): boolean {
	return type === EEmployeeNotificationType.BoardShare || type === EEmployeeNotificationType.BoardMention;
}

function textOf(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/** The Board a notification's metadata names, or null when it names none. */
export function notificationBoardOf(metadata: unknown): INotificationBoard | null {
	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
		return null;
	}
	const board = (metadata as { board?: unknown }).board;
	if (!board || typeof board !== 'object' || Array.isArray(board)) {
		return null;
	}
	const fields = board as Record<string, unknown>;
	return {
		roomId: textOf(fields.roomId),
		snapshotId: textOf(fields.snapshotId),
		name: textOf(fields.name),
		link: textOf(fields.link)
	};
}

/**
 * Where a Board notification opens: its link, when the link is an address of the Boards app this deployment trusts
 * (NEXT_PUBLIC_BOARD_APP_DOMAIN's origin, https), told which deployment opened it so the Board signs the reader in
 * here. Null when the sender's app sent no link, or a link anywhere else: a colleague cannot send the reader to a site
 * of their choosing, and the entry then says who shared which Board, without a link.
 */
export function boardNotificationHrefOf(
	board: INotificationBoard | null,
	trust: BoardTrust = configuredBoardTrust(),
	everTeamsOrigin: string | null | undefined = typeof window === 'undefined' ? null : window.location.origin
): string | null {
	const href = boardReturnUrl(board?.link, trust);
	return href ? withEverTeamsOrigin(new URL(href), everTeamsOrigin).toString() : null;
}
