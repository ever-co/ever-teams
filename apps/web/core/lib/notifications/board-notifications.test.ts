import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import {
	boardNoticeOf,
	boardNotificationHrefOf,
	isBoardNotificationType,
	notificationBoardOf
} from './board-notifications';

describe('Board notifications (#5022)', () => {
	const trust = { boardAppDomain: 'https://board.ever.team', allowLocalhostHttp: false };
	const link = 'https://board.ever.team/#room=r00m,secret-key';

	it('knows the two kinds the Boards app raises', () => {
		expect(isBoardNotificationType(EEmployeeNotificationType.BoardShare)).toBe(true);
		expect(isBoardNotificationType(EEmployeeNotificationType.BoardMention)).toBe(true);
		expect(isBoardNotificationType(EEmployeeNotificationType.Mention)).toBe(false);
		expect(isBoardNotificationType(null)).toBe(false);
	});

	it('reads the Board of the metadata, and nothing from anything else', () => {
		expect(notificationBoardOf({ board: { roomId: 'r00m', name: ' Sprint plan ', link } })).toEqual({
			roomId: 'r00m',
			snapshotId: null,
			name: 'Sprint plan',
			link
		});
		expect(notificationBoardOf({ board: { snapshotId: 'snap_1', name: '', link: 7 } })).toEqual({
			roomId: null,
			snapshotId: 'snap_1',
			name: null,
			link: null
		});
		expect(notificationBoardOf({ board: 'r00m' })).toBeNull();
		expect(notificationBoardOf({})).toBeNull();
		expect(notificationBoardOf(null)).toBeNull();
	});

	it('opens a link of the trusted Boards app, key included, told which deployment opened it', () => {
		const href = new URL(boardNotificationHrefOf({ link }, trust, 'https://app.ever.team') as string);
		expect(href.origin).toBe('https://board.ever.team');
		expect(href.searchParams.get('origin')).toBe('https://app.ever.team');
		expect(href.hash).toBe('#room=r00m,secret-key');
	});

	it('opens nothing without a link, for a link anywhere else, or where no Boards app is set up', () => {
		expect(boardNotificationHrefOf({ link: null }, trust, 'https://app.ever.team')).toBeNull();
		expect(boardNotificationHrefOf(null, trust, 'https://app.ever.team')).toBeNull();
		for (const elsewhere of [
			'https://board.ever.team.evil.example/#room=a,b',
			'https://evil.example/#room=a,b',
			'http://board.ever.team/#room=a,b',
			'https://board.ever.team@evil.example/',
			'javascript:alert(1)',
			'/board'
		]) {
			expect(boardNotificationHrefOf({ link: elsewhere }, trust, 'https://app.ever.team')).toBeNull();
		}
		expect(boardNotificationHrefOf({ link }, { boardAppDomain: '' }, 'https://app.ever.team')).toBeNull();
	});
	it("names the reader's deployment on the link, never the one the sender's link names", () => {
		const named = 'https://board.ever.team/?origin=https%3A%2F%2Fevil.example#room=r00m,secret-key';
		const replaced = new URL(boardNotificationHrefOf({ link: named }, trust, 'https://app.ever.team') as string);
		expect(replaced.searchParams.getAll('origin')).toEqual(['https://app.ever.team']);
		expect(replaced.hash).toBe('#room=r00m,secret-key');
		// Where the reader's origin is unknown (no window), the sender's never stands in for it
		const unknown = new URL(boardNotificationHrefOf({ link: named }, trust, null) as string);
		expect(unknown.searchParams.has('origin')).toBe(false);
		expect(unknown.origin).toBe('https://board.ever.team');
		expect(unknown.hash).toBe('#room=r00m,secret-key');
	});

	describe('boardNoticeOf: the sender and the Board, read from the fixed ending of the title', () => {
		const share = EEmployeeNotificationType.BoardShare;
		const mention = EEmployeeNotificationType.BoardMention;

		it('reads the four titles Gauzy files', () => {
			const metadata = { board: { roomId: 'r00m', name: 'Sprint plan' } };
			expect(
				boardNoticeOf({ type: share, title: 'Ana Lima shared the Board "Sprint plan" with you', metadata })
			).toEqual({ senderName: 'Ana Lima', subject: 'Sprint plan' });
			expect(
				boardNoticeOf({ type: mention, title: 'Ana Lima mentioned you in the Board "Sprint plan"', metadata })
			).toEqual({ senderName: 'Ana Lima', subject: 'Sprint plan' });
			expect(boardNoticeOf({ type: share, title: 'Ana Lima shared a Board with you', metadata: {} })).toEqual({
				senderName: 'Ana Lima',
				subject: null
			});
			expect(boardNoticeOf({ type: mention, title: 'Ana Lima mentioned you in a Board' })).toEqual({
				senderName: 'Ana Lima',
				subject: null
			});
		});

		it("keeps a quote in the sender's name out of the Board's name", () => {
			expect(
				boardNoticeOf({
					type: share,
					title: 'Ana "Nina" Lima shared the Board "Sprint plan" with you',
					metadata: { board: { roomId: 'r00m', name: 'Sprint plan' } }
				})
			).toEqual({ senderName: 'Ana "Nina" Lima', subject: 'Sprint plan' });
		});

		it("keeps a title's words in the Board's name out of the sender's name", () => {
			const name = 'x" with you. Boss shared the Board "Payroll';
			expect(
				boardNoticeOf({
					type: share,
					title: `Mallory shared the Board "${name}" with you`,
					metadata: { board: { roomId: 'r00m', name } }
				})
			).toEqual({ senderName: 'Mallory', subject: name });
			const mentioned = 'Ops" Boss mentioned you in the Board "Payroll';
			expect(
				boardNoticeOf({
					type: mention,
					title: `Mallory mentioned you in the Board "${mentioned}"`,
					metadata: { board: { roomId: 'r00m', name: mentioned } }
				})
			).toEqual({ senderName: 'Mallory', subject: mentioned });
		});

		it('names the Board in full where the title cut its name, and reads a title without metadata', () => {
			const long = `Roadmap ${'q'.repeat(150)}`;
			expect(
				boardNoticeOf({
					type: share,
					title: `Ana Lima shared the Board "${long.slice(0, 119)}…" with you`,
					metadata: { board: { roomId: 'r00m', name: long } }
				})
			).toEqual({ senderName: 'Ana Lima', subject: long });
			expect(
				boardNoticeOf({
					type: mention,
					title: 'Ana Lima mentioned you in the Board "Sprint plan"',
					metadata: null
				})
			).toEqual({ senderName: 'Ana Lima', subject: 'Sprint plan' });
		});

		it('reads nothing of any other kind', () => {
			expect(
				boardNoticeOf({
					type: EEmployeeNotificationType.Mention,
					title: 'Ana Lima shared the Board "Sprint plan" with you'
				})
			).toBeNull();
		});
	});
});
