import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { boardNotificationHrefOf, isBoardNotificationType, notificationBoardOf } from './board-notifications';

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
});
