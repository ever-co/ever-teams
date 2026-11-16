import {
	BOARD_EVER_TEAMS_ORIGIN_PARAM,
	boardReturnUrl,
	configuredBoardTrust,
	withEverTeamsOrigin,
	type BoardTrust
} from '@/core/lib/board/board-app';
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
	if (!href) {
		return null;
	}
	const url = new URL(href);
	// The deployment the Board signs the reader in on is the reader's, never one the sender's link names
	url.searchParams.delete(BOARD_EVER_TEAMS_ORIGIN_PARAM);
	return withEverTeamsOrigin(url, everTeamsOrigin).toString();
}

/** A Board notification as the Inbox and the bell tell it: who shared the Board or mentioned the reader, and its name. */
export interface BoardNotice {
	senderName: string | null;
	/** The Board's name: the one its metadata keeps, else the one the title quotes. */
	subject: string | null;
}

/**
 * The sender and the Board's name a `BoardShare` or a `BoardMention` tells, or null for any other kind. Read as the
 * meeting titles are (#5330): from the fixed ending of the title Gauzy files (`boardNotificationTitle` in
 * `board-notification.ts` there), `Ana shared the Board "Sprint plan" with you`, `Ana mentioned you in the Board
 * "Sprint plan"`, or either without the name. The name is the one the metadata keeps (the title cuts it at 120
 * characters), and the sender is what comes before the ending that quotes that very name: a quote in the sender's name
 * or a title's words in the Board's name never move where one ends and the other starts.
 */
export function boardNoticeOf(notification: {
	type: EEmployeeNotificationType | null;
	title: string;
	metadata?: unknown;
}): BoardNotice | null {
	if (!isBoardNotificationType(notification.type)) {
		return null;
	}
	const title = notification.title.trim();
	const name = notificationBoardOf(notification.metadata)?.name ?? null;
	const isMention = notification.type === EEmployeeNotificationType.BoardMention;
	const endings = [
		...(name ? [isMention ? ` mentioned you in the Board "${name}"` : ` shared the Board "${name}" with you`] : []),
		isMention ? ' mentioned you in a Board' : ' shared a Board with you'
	];
	for (const ending of endings) {
		if (title.length > ending.length && title.endsWith(ending)) {
			return { senderName: textOf(title.slice(0, -ending.length)), subject: name };
		}
	}
	// A name the title cut, or no name in the metadata: the fixed ending still closes the quoted name
	const quoting = isMention
		? /^(.+?) mentioned you in the Board "(.*)"$/
		: /^(.+?) shared the Board "(.*)" with you$/;
	const match = quoting.exec(title);
	return { senderName: textOf(match?.[1]), subject: name ?? textOf(match?.[2]) };
}
