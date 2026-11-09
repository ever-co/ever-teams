import { EInboxItemKind } from '@/core/types/interfaces/common/inbox-item';
import { decisionOf, replyOf } from './inbox-entry';

describe('inbox decisions', () => {
	const approval = decisionOf({
		kind: EInboxItemKind.Approval,
		options: [
			{ id: 'yes', label: 'Approve', recommended: true },
			{ id: 'no', label: 'Reject', description: 'Send it back' }
		],
		requireReason: true,
		response: null
	});

	it('reads the choices, the reason rule and the answer, and nothing for a notification', () => {
		expect(approval).toEqual({
			options: [
				{ id: 'yes', label: 'Approve', description: null, recommended: true },
				{ id: 'no', label: 'Reject', description: 'Send it back', recommended: false }
			],
			requireReason: true,
			response: null
		});
		expect(decisionOf({ kind: EInboxItemKind.Notification })).toBeNull();
		const answered = decisionOf({ kind: EInboxItemKind.Question, response: { optionId: null, text: 'Friday', answeredAt: '2026-11-07T10:00:00.000Z' } });
		expect(answered?.response).toEqual({ optionId: null, text: 'Friday', answeredAt: new Date('2026-11-07T10:00:00.000Z') });
	});

	it('sends an option and a reason, and says what is missing first', () => {
		if (!approval) throw new Error('no decision');
		expect(replyOf(approval, { optionId: null, text: 'x' })).toEqual({ missing: 'option' });
		expect(replyOf(approval, { optionId: 'no', text: '  ' })).toEqual({ missing: 'reason' });
		expect(replyOf(approval, { optionId: 'no', text: ' Too late ' })).toEqual({ input: { optionId: 'no', text: 'Too late' } });
		const question = decisionOf({ kind: EInboxItemKind.Question, options: [], requireReason: false });
		if (!question) throw new Error('no decision');
		expect(replyOf(question, { optionId: null, text: '' })).toEqual({ missing: 'answer' });
		expect(replyOf(question, { optionId: null, text: 'Friday' })).toEqual({ input: { text: 'Friday' } });
	});
});
