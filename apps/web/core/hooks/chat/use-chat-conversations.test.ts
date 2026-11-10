import { EChatNotifyLevel } from '@/core/types/interfaces/common/chat';
import { unreadTotalsOf } from './use-chat-conversations';

jest.mock('./use-chat-scope', () => ({ useChatScope: () => null }));

describe('unreadTotalsOf', () => {
	it('counts the unread messages of the conversations that are not muted', () => {
		expect(
			unreadTotalsOf([
				{ unreadCount: 3, mentionCount: 0, notifyLevel: EChatNotifyLevel.All },
				{ unreadCount: 2, mentionCount: 1, notifyLevel: EChatNotifyLevel.Mentions }
			])
		).toEqual({ unread: 5, mentions: 1 });
	});

	it('counts only the mentions of a muted conversation', () => {
		expect(unreadTotalsOf([{ unreadCount: 40, mentionCount: 2, notifyLevel: EChatNotifyLevel.Muted }])).toEqual({ unread: 2, mentions: 2 });
		expect(unreadTotalsOf([{ unreadCount: 40, mentionCount: 0, notifyLevel: EChatNotifyLevel.Muted }])).toEqual({ unread: 0, mentions: 0 });
	});

	it('answers zero for no conversation', () => {
		expect(unreadTotalsOf([])).toEqual({ unread: 0, mentions: 0 });
	});
});
